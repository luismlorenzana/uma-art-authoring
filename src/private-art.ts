import { createHash } from 'node:crypto'
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { approvedDir, keyOf, readCollection } from './lib.js'
import { ownerPrivatePath } from './owner-private-boundary.js'

export type PrivateArtKind = 'base' | 'splash'
export interface PrivateArtAsset {
  id: string
  actorId: string
  kind: PrivateArtKind
  slot: string
  sourceFile: string
  sourceSha256: string
  width: number
  height: number
  privateFile: string
}
export interface PrivateArtPlan {
  schemaVersion: 1
  kind: 'private-art-plan'
  universe: string
  collection: string
  actors: string[]
  assets: PrivateArtAsset[]
  pending: number
}
export interface PublishedPrivateAsset {
  id: string
  actorId: string
  kind: PrivateArtKind
  slot: string
  sourceSha256: string
  path: string
  sha256: string
  bytes: number
}
export interface PrivateArtPackage {
  schemaVersion: 1
  kind: 'owner-private-art-package'
  universe: string
  collection: string
  assets: PublishedPrivateAsset[]
}
export class PrivateArtError extends Error {
  constructor(readonly code: string) { super(code) }
}
export function fail(code: string): never { throw new PrivateArtError(code) }
export const row = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : fail('INVALID_METADATA')
export const list = (v: unknown): unknown[] => Array.isArray(v) ? v : fail('INVALID_METADATA')
export const slug = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length <= 160
export const identity = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,159}$/.test(v)
export const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v)
const whole = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) > 0
export const digest = (v: Uint8Array | string) => createHash('sha256').update(v).digest('hex')
export function jsonFile(path: string): unknown {
  try { return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')) as unknown } catch { return fail('INVALID_METADATA_FILE') }
}
export function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  if (Object.keys(value).some(key => !keys.includes(key))) fail('UNEXPECTED_METADATA_FIELD')
}
export const slotOf = (universe: string, collection: string, asset: Pick<PrivateArtAsset, 'id' | 'actorId' | 'kind'>) =>
  digest(JSON.stringify([universe, collection, asset.actorId, asset.kind, asset.id]))
export const privateFileOf = (asset: Pick<PrivateArtAsset, 'actorId' | 'kind' | 'id'>) => `${encodeURIComponent(asset.actorId)}/${asset.kind}/${encodeURIComponent(asset.id)}.private.png`
export const privateObjectOf = (asset: Pick<PublishedPrivateAsset, 'slot' | 'sha256'>) => `images/${asset.slot}.${asset.sha256}.private.png`
export const privatePrefix = (universe: string, collection: string) => {
  if (!slug(universe) || !slug(collection)) fail('INVALID_SCOPE')
  return `art-private/${universe}/${collection}`
}
export function containedFile(root: string, path: string): string {
  const base = realpathSync(root), actual = realpathSync(resolve(root, path)), rel = relative(base, actual)
  if (!rel || isAbsolute(rel) || rel === '..' || rel.startsWith('..' + sep) || !statSync(actual).isFile()) fail('PATH_OUTSIDE_ROOT')
  return actual
}
export function normalSourceFile(root: string, path: string): string {
  if (ownerPrivatePath(path)) fail('OWNER_ONLY_DIRECTORY')
  const file = containedFile(root, path)
  if (ownerPrivatePath(file)) fail('OWNER_ONLY_DIRECTORY')
  return file
}
export const inside = (root: string, path: string): boolean => {
  const rel = relative(root, path)
  return !rel || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep))
}
/** Resolve existing ancestors as well as a not-yet-created destination; reject symlink escapes before writing. */
export function physicalDestination(path: string): string {
  let parent = resolve(path)
  const parts: string[] = []
  while (!existsSync(parent)) {
    const next = dirname(parent)
    if (next === parent) fail('INVALID_OUTPUT_ROOT')
    parts.unshift(relative(next, parent)); parent = next
  }
  return resolve(realpathSync(parent), ...parts)
}
export function contentDestination(root: string, path: string): string {
  const base = realpathSync(root), out = physicalDestination(path)
  if (out === base || !inside(base, out) || ownerPrivatePath(out)) fail('OUTPUT_MUST_BE_IGNORED_CONTENT')
  return out
}
function assetValid(value: unknown, universe: string, collection: string): PrivateArtAsset {
  const a = row(value)
  exactKeys(a, ['id', 'actorId', 'kind', 'slot', 'sourceFile', 'sourceSha256', 'width', 'height', 'privateFile'])
  if (!identity(a.id) || !identity(a.actorId) || !['base', 'splash'].includes(String(a.kind)) || !hash(a.sourceSha256) || !whole(a.width) || !whole(a.height)) fail('INVALID_ASSET')
  const asset = a as unknown as PrivateArtAsset
  if (a.slot !== slotOf(universe, collection, asset) || a.privateFile !== privateFileOf(asset) || typeof a.sourceFile !== 'string' || isAbsolute(a.sourceFile) || a.sourceFile.includes('\\') || a.sourceFile.split('/').some(p => !p || p.startsWith('.')) || ownerPrivatePath(a.sourceFile) || !a.sourceFile.endsWith('.png')) fail('INVALID_ASSET_PATH')
  return asset
}
export function parsePrivatePlan(value: unknown): PrivateArtPlan {
  const p = row(value)
  exactKeys(p, ['schemaVersion', 'kind', 'universe', 'collection', 'actors', 'assets', 'pending'])
  if (p.schemaVersion !== 1 || p.kind !== 'private-art-plan' || !slug(p.universe) || !slug(p.collection) || !Number.isSafeInteger(p.pending) || Number(p.pending) < 0) fail('INVALID_PLAN')
  const actors = list(p.actors)
  if (actors.some(a => !identity(a)) || new Set(actors).size !== actors.length) fail('INVALID_ACTORS')
  const assets = list(p.assets).map(a => assetValid(a, p.universe as string, p.collection as string))
  if (new Set(assets.map(a => a.slot)).size !== assets.length || assets.some(a => !actors.includes(a.actorId))) fail('DUPLICATE_OR_UNKNOWN_ASSET')
  return { schemaVersion: 1, kind: 'private-art-plan', universe: p.universe, collection: p.collection, actors: actors as string[], assets, pending: Number(p.pending) }
}
export function parsePrivatePackage(value: unknown): PrivateArtPackage {
  const p = row(value)
  exactKeys(p, ['schemaVersion', 'kind', 'universe', 'collection', 'assets'])
  if (p.schemaVersion !== 1 || p.kind !== 'owner-private-art-package' || !slug(p.universe) || !slug(p.collection)) fail('INVALID_PACKAGE')
  const assets = list(p.assets).map(value => {
    const a = row(value)
    exactKeys(a, ['id', 'actorId', 'kind', 'slot', 'sourceSha256', 'path', 'sha256', 'bytes'])
    if (!identity(a.id) || !identity(a.actorId) || !['base', 'splash'].includes(String(a.kind)) || !hash(a.sourceSha256) || !hash(a.sha256) || !whole(a.bytes)) fail('INVALID_PRIVATE_ASSET')
    const asset = a as unknown as PublishedPrivateAsset
    if (a.slot !== slotOf(p.universe as string, p.collection as string, asset) || a.path !== privateObjectOf(asset)) fail('INVALID_PRIVATE_PATH')
    return asset
  })
  if (new Set(assets.map(a => a.slot)).size !== assets.length) fail('DUPLICATE_ASSET')
  return { schemaVersion: 1, kind: 'owner-private-art-package', universe: p.universe, collection: p.collection, assets }
}
/** Only normal source metadata and PNG paths enter a plan. No owner-only directory is listed or opened. */
export function preparePrivatePlan(contentRoot: string, universe: string, collection = 'characters'): PrivateArtPlan {
  privatePrefix(universe, collection)
  const work = join(contentRoot, 'authoring', 'character-universes'), universeRoot = join(work, universe)
  const assets: PrivateArtAsset[] = [], actors = new Set<string>()
  let pending = 0
  const append = (actorId: string, kind: PrivateArtKind, raw: unknown, folder: string, allowedRoot = contentRoot) => {
    const a = row(raw), approval = a.approval ? row(a.approval) : {}
    if (approval.status !== 'approved' || approval.by !== 'owner') { pending++; return }
    if (!identity(a.id) || !identity(actorId) || !hash(a.sha256) || !whole(a.width) || !whole(a.height) || typeof a.image !== 'string' || ownerPrivatePath(a.image)) fail('INVALID_NORMAL_ASSET')
    const file = normalSourceFile(allowedRoot, resolve(folder, a.image))
    if (ownerPrivatePath(file) || !file.endsWith('.png')) fail('INVALID_NORMAL_ASSET')
    const asset = { id: a.id, actorId, kind, sourceFile: relative(realpathSync(contentRoot), file).split(sep).join('/'), sourceSha256: a.sha256, width: a.width, height: a.height, privateFile: privateFileOf({ actorId, kind, id: a.id }), slot: slotOf(universe, collection, { actorId, kind, id: a.id }) }
    actors.add(actorId); assets.push(asset)
  }
  if (collection === 'characters') {
    const register = (key: string) => {
      const record = join(universeRoot, 'characters', key, 'character.json')
      const metadata = existsSync(record) ? row(jsonFile(record)) : {}
      const actor = typeof metadata.id === 'number' ? String(metadata.id) : typeof metadata.id === 'string' ? metadata.id : key
      if (!identity(actor)) fail('INVALID_NORMAL_IDENTITY')
      actors.add(actor)
      return actor
    }
    const roster = join(universeRoot, 'cast', 'roster.json')
    if (existsSync(roster)) for (const entry of list(row(jsonFile(roster)).characters)) {
      const record = row(entry).record
      const key = typeof record === 'string' ? /^\.\.\/characters\/([a-z0-9-]+)\/character\.json$/.exec(record)?.[1] : undefined
      if (!key) fail('INVALID_NORMAL_IDENTITY')
      register(key)
    }
    const normal = readCollection(universe, approvedDir(universe, work))
    for (const look of normal.looks) {
      if (['weapons', 'combat-sprites', 'character-sprites'].includes(look.category ?? '')) continue
      const actor = register(keyOf(look.character))
      append(actor, look.kind === 'splash' ? 'splash' : 'base', { ...look, image: look.image, approval: { status: 'approved', by: 'owner' } }, approvedDir(universe, work))
    }
    pending += normal.refused.length
  } else {
    const root = join(universeRoot, 'originals', collection), registry = row(jsonFile(join(root, 'collection.json')))
    if (registry.id !== collection || registry.kind !== 'original-character-collection') fail('INVALID_NORMAL_REGISTRY')
    for (const value of list(registry.characters)) {
      const character = row(value)
      if (!slug(character.id) || !slug(character.rank) || !slug(character.court)) fail('INVALID_NORMAL_IDENTITY')
      const actor = `original-${collection}-${character.id}`
      if (actors.has(actor)) fail('DUPLICATE_ACTOR')
      actors.add(actor)
      const own = join(root, character.rank, character.court, character.id)
      for (const kind of ['base', 'splash'] as const) {
        const section = kind === 'base' ? own : join(own, 'splash-art'), pointer = join(section, 'active-study.json')
        if (!existsSync(pointer)) { pending++; continue }
        const active = row(jsonFile(pointer))
        if (typeof active.activeVersion !== 'string' || !/^v\d{3}$/.test(active.activeVersion)) { pending++; continue }
        const version = join(section, active.activeVersion), manifest = row(jsonFile(join(version, 'manifest.json')))
        for (const asset of list(manifest[kind === 'base' ? 'fullBodyAssets' : 'assets'])) append(actor, kind, asset, version, own)
      }
    }
  }
  return parsePrivatePlan({ schemaVersion: 1, kind: 'private-art-plan', universe, collection, actors: [...actors].sort(), assets, pending })
}
/** A changed normal image never silently selects an old private alternative. */
export const matchingPrivateAsset = (index: PrivateArtPackage, asset: Pick<PrivateArtAsset, 'slot' | 'sourceSha256'>) =>
  index.assets.find(a => a.slot === asset.slot && a.sourceSha256 === asset.sourceSha256) ?? null
