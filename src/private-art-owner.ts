// OWNER PROCESS ONLY. Agents never invoke this module on actual owner images or approval records.
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pngSize } from './lib.js'
import { containedFile, digest, exactKeys, fail, hash, inside, jsonFile, list, normalSourceFile, parsePrivatePlan, physicalDestination, privateObjectOf, row, type PrivateArtPackage } from './private-art.js'

/** The owner manually assembles approved PNGs; agents receive only the designated outbox for opaque publishing. */
export function prepareOwnerPackage(options: { planFile: string; sourceRoot: string; ownerRoot: string; approvalsFile: string; outbox: string; repoRoot: string }): { packaged: number; waiting: number } {
  const plan = parsePrivatePlan(jsonFile(options.planFile))
  const owner = realpathSync(options.ownerRoot), source = realpathSync(options.sourceRoot), repo = realpathSync(options.repoRoot), out = physicalDestination(options.outbox)
  if ([source, repo, out].some(root => inside(root, owner) || inside(owner, root)) || existsSync(out)) fail('OWNER_ROOT_NOT_ISOLATED')
  if (inside(repo, out) && !inside(join(repo, 'content'), out)) fail('OUTPUT_MUST_BE_IGNORED_CONTENT')
  const approvals = row(jsonFile(containedFile(owner, options.approvalsFile)))
  exactKeys(approvals, ['schemaVersion', 'assets'])
  if (approvals.schemaVersion !== 1) fail('INVALID_OWNER_APPROVALS')
  const records = new Map<string, Record<string, unknown>>()
  for (const value of list(approvals.assets)) {
    const record = row(value)
    exactKeys(record, ['slot', 'ownerApproved', 'approvedOn', 'sourceSha256', 'sha256'])
    if (typeof record.slot !== 'string' || records.has(record.slot)) fail('INVALID_OWNER_APPROVALS')
    records.set(record.slot, record)
  }
  const result: PrivateArtPackage = { schemaVersion: 1, kind: 'owner-private-art-package', universe: plan.universe, collection: plan.collection, assets: [] }
  let waiting = 0
  for (const asset of plan.assets) {
    const approval = records.get(asset.slot)
    if (approval?.ownerApproved !== true) { waiting++; continue }
    if (typeof approval.approvedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(approval.approvedOn) || approval.sourceSha256 !== asset.sourceSha256 || !hash(approval.sha256)) fail('INVALID_OWNER_APPROVAL')
    if (digest(readFileSync(normalSourceFile(source, asset.sourceFile))) !== asset.sourceSha256) fail('NORMAL_SOURCE_CHANGED')
    const bytes = readFileSync(containedFile(owner, asset.privateFile)), size = pngSize(bytes)
    if (!size || size.width !== asset.width || size.height !== asset.height || digest(bytes) !== approval.sha256) fail('OWNER_ASSET_CHANGED')
    const sha256 = digest(bytes), path = privateObjectOf({ slot: asset.slot, sha256 })
    mkdirSync(join(out, 'images'), { recursive: true })
    // Write the validated snapshot; no prompt/history/approval file is included in the export.
    writeFileSync(join(out, path), bytes, { flag: 'wx' })
    result.assets.push({ id: asset.id, actorId: asset.actorId, kind: asset.kind, slot: asset.slot, sourceSha256: asset.sourceSha256, path, sha256, bytes: bytes.length })
  }
  mkdirSync(out, { recursive: true })
  writeFileSync(join(out, 'package.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
  return { packaged: result.assets.length, waiting }
}
