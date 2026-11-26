import { createHash } from 'node:crypto'
import { closeSync, copyFileSync, mkdirSync, mkdtempSync, openSync, readSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import { type Remote } from './lib.js'
import { containedFile, exactKeys, fail, jsonFile, parsePrivatePackage, row, type PrivateArtPackage, type PublishedPrivateAsset } from './private-art.js'

export interface PrivateArtIndex {
  schemaVersion: 1
  kind: 'private-art-index'
  universe: string
  collection: string
  publishedAt: string
  assets: PublishedPrivateAsset[]
}
/** Binary checksums only. Never decode images, inspect embedded metadata, log bytes or generate previews. */
function fingerprint(file: string): { sha256: string; md5: string; bytes: number } {
  const sha = createHash('sha256'), md5 = createHash('md5'), fd = openSync(file, 'r'), chunk = Buffer.alloc(64 * 1024)
  let bytes = 0
  try {
    let count: number
    while ((count = readSync(fd, chunk, 0, chunk.length, null)) > 0) { sha.update(chunk.subarray(0, count)); md5.update(chunk.subarray(0, count)); bytes += count }
    return { sha256: sha.digest('hex'), md5: md5.digest('base64'), bytes }
  } finally { chunk.fill(0); closeSync(fd) }
}
/** Strict technical metadata only; the CLI returns counters and never returns this document or image contents. */
export function readPrivatePackageMetadata(folder: string): PrivateArtPackage {
  return parsePrivatePackage(jsonFile(containedFile(folder, 'package.json')))
}
export function checkPrivatePackage(folder: string): PrivateArtPackage {
  const pkg = readPrivatePackageMetadata(folder)
  for (const asset of pkg.assets) {
    const file = containedFile(folder, asset.path)
    if (statSync(file).size !== asset.bytes) fail('PRIVATE_FILE_CHANGED')
    const actual = fingerprint(file)
    if (actual.sha256 !== asset.sha256 || actual.bytes !== asset.bytes) fail('PRIVATE_FILE_CHANGED')
  }
  return pkg
}
export function parsePrivateIndex(text: string | null, universe: string, collection: string): PrivateArtIndex | null {
  if (text === null) return null
  let value: unknown
  try { value = JSON.parse(text) as unknown } catch { return fail('INVALID_REMOTE_INDEX') }
  const index = row(value)
  exactKeys(index, ['schemaVersion', 'kind', 'universe', 'collection', 'publishedAt', 'assets'])
  if (index.kind !== 'private-art-index' || index.universe !== universe || index.collection !== collection || typeof index.publishedAt !== 'string') fail('INVALID_REMOTE_INDEX')
  const pkg = parsePrivatePackage({ schemaVersion: index.schemaVersion, kind: 'owner-private-art-package', universe, collection, assets: index.assets })
  return { schemaVersion: 1, kind: 'private-art-index', universe, collection, publishedAt: index.publishedAt, assets: pkg.assets }
}
/** Opaque file transfer only. Never render/OCR/thumbnail, extract prompts, or invoke normal art/game publishers. */
export function publishPrivatePackage(folder: string, remote: Remote, receiptFolder: string, now: string, dryRun = false) {
  const pkg = checkPrivatePackage(folder), before = remote.read('index.json')
  const old = parsePrivateIndex(before?.text ?? null, pkg.universe, pkg.collection)
  const assets = new Map((old?.assets ?? []).map(asset => [asset.slot, asset]))
  const changed = pkg.assets.filter(asset => JSON.stringify(assets.get(asset.slot)) !== JSON.stringify(asset))
  for (const asset of pkg.assets) assets.set(asset.slot, asset)
  const index: PrivateArtIndex = { schemaVersion: 1, kind: 'private-art-index', universe: pkg.universe, collection: pkg.collection, publishedAt: changed.length ? now : old?.publishedAt ?? now, assets: [...assets.values()].sort((a, b) => a.slot.localeCompare(b.slot)) }
  if (dryRun || (!changed.length && old)) return { uploaded: 0, planned: changed.length, indexed: false }
  const there = new Map(remote.list().map(file => [file.path, file])), expected = new Map<string, string>()
  let uploaded = 0
  // Stage private files under their reserved suffix, never under gallery mounts.
  const stage = mkdtempSync(join(tmpdir(), 'owner-private-')), actualStage = realpathSync(stage)
  if (!actualStage.startsWith(realpathSync(tmpdir()) + sep)) fail('INVALID_STAGING_ROOT')
  try {
    for (const asset of changed) {
      const staged = join(stage, asset.slot + '.private.png')
      copyFileSync(containedFile(folder, asset.path), staged)
      const actual = fingerprint(staged)
      if (actual.sha256 !== asset.sha256 || actual.bytes !== asset.bytes) fail('PRIVATE_FILE_CHANGED')
      expected.set(asset.path, actual.md5)
      const prior = there.get(asset.path)
      if (prior && (prior.md5 !== actual.md5 || prior.bytes !== actual.bytes)) fail('REMOTE_OBJECT_MISMATCH')
      if (!prior) {
        if (!remote.uploadFile(staged, asset.path, '0')) fail('REMOTE_OBJECT_RACE')
        uploaded++
      }
    }
    const after = new Map(remote.list().map(file => [file.path, file]))
    for (const asset of changed) if (after.get(asset.path)?.md5 !== expected.get(asset.path) || after.get(asset.path)?.bytes !== asset.bytes) fail('REMOTE_OBJECT_NOT_VERIFIED')
    const candidate = join(stage, 'index.json')
    writeFileSync(candidate, JSON.stringify(index, null, 2) + '\n')
    if (!remote.uploadFile(candidate, 'index.json', before?.generation ?? '0')) fail('REMOTE_INDEX_RACE')
    const confirmed = remote.read('index.json')
    if (!confirmed || JSON.stringify(parsePrivateIndex(confirmed.text, pkg.universe, pkg.collection)) !== JSON.stringify(index)) fail('REMOTE_INDEX_NOT_VERIFIED')
    mkdirSync(receiptFolder, { recursive: true })
    writeFileSync(join(receiptFolder, 'receipt.json'), JSON.stringify({ schemaVersion: 1, kind: 'private-art-receipt', universe: pkg.universe, collection: pkg.collection, publishedAt: now, slots: changed.map(a => a.slot), uploaded, generation: confirmed.generation }, null, 2) + '\n')
    return { uploaded, planned: changed.length, indexed: true }
  } finally {
    if (realpathSync(stage) !== actualStage || !actualStage.startsWith(realpathSync(tmpdir()) + sep)) fail('INVALID_STAGING_ROOT')
    rmSync(stage, { recursive: true, force: true })
  }
}
