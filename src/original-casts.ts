import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { mediaFile, type Entry, type Mounts, type Portrait, type Work } from './gallery-data.js'

export interface OriginalRank { id: string; label: string; singular: string; expectedCount?: number; parentRank?: string; membersPerParent?: number; description?: string }
export interface OriginalCourt { id: string; title: string; description?: string; brief?: string; ancestral?: boolean }
export interface OriginalCharacter { id: string; name: string; title?: string; rank: string; court: string; serves?: string; brief?: string; adult?: boolean }
export interface OriginalCollection {
  schemaVersion: 1; kind: 'original-character-collection'; id: string; title: string; subtitle?: string; description?: string
  ranks: OriginalRank[]; courts: OriginalCourt[]; characters: OriginalCharacter[]
}
type Row = Record<string, unknown>
const object = (v: unknown): Row => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Row : {}
const text = (v: unknown) => typeof v === 'string' ? v : ''
const rows = (v: unknown): Row[] => Array.isArray(v) ? v.map(object) : []
const safe = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)
const doc = (file: string): Row => { try { return object(JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))) } catch { return {} } }

export const originalTabs = { art: 'Character Art', expressions: 'Facial Expressions', splash: 'Splash Art', weapons: 'Weapons', 'combat-sprites': 'Combat Sprites' } as const
export type OriginalTab = keyof typeof originalTabs
export const originalFolder = (work: string, universe: string, id: string) => {
  if (!safe(universe) || !safe(id)) throw new Error('Invalid original collection path.')
  return join(work, universe, 'originals', id)
}
export const originalActorId = (collection: OriginalCollection, character: OriginalCharacter) => `original-${collection.id}-${character.id}`
export const originalCharacterFolder = (folder: string, character: OriginalCharacter) => join(folder, character.rank, character.court, character.id)

/** Original cast identities are private inputs, independent of the ranked or franchise casts. */
export function validateOriginalCollection(raw: unknown): OriginalCollection {
  const value = object(raw)
  if (value.schemaVersion !== 1 || value.kind !== 'original-character-collection' || !safe(value.id) || !text(value.title) || !Array.isArray(value.ranks) || !Array.isArray(value.courts) || !Array.isArray(value.characters)) throw new Error('Invalid original character collection.')
  const ranks = rows(value.ranks), courts = rows(value.courts), characters = rows(value.characters)
  for (const group of [ranks, courts, characters]) if (new Set(group.map(item => item.id)).size !== group.length || group.some(item => !safe(item.id))) throw new Error('Original collection IDs must be unique safe folder keys.')
  if (!ranks.length || !courts.length || !characters.length || ranks.some(rank => !text(rank.label) || !text(rank.singular)) || courts.some(court => !text(court.title))) throw new Error('Original ranks and courts need labels and characters.')
  const rankById = new Map(ranks.map(rank => [rank.id, rank])), knownCourts = new Set(courts.map(court => court.id)), known = new Map(characters.map(character => [character.id, character]))
  for (const rank of ranks) {
    const count = characters.filter(character => character.rank === rank.id).length
    if (rank.expectedCount !== undefined && (!Number.isSafeInteger(rank.expectedCount) || rank.expectedCount !== count)) throw new Error('Original rank count differs from its declared roster.')
    if (rank.parentRank !== undefined && (!rankById.has(rank.parentRank) || rank.parentRank === rank.id)) throw new Error('Invalid original parent rank.')
    if (rank.membersPerParent !== undefined) {
      if (!rank.parentRank || !Number.isSafeInteger(rank.membersPerParent) || Number(rank.membersPerParent) < 1) throw new Error('Invalid original hierarchy count.')
      for (const parent of characters.filter(character => character.rank === rank.parentRank)) if (characters.filter(character => character.rank === rank.id && character.serves === parent.id).length !== rank.membersPerParent) throw new Error('Original serving hierarchy has an incomplete or overfilled parent.')
    }
  }
  for (const character of characters) {
    const rank = rankById.get(character.rank)
    if (!text(character.name) || !rank || !knownCourts.has(character.court)) throw new Error('Original character has an unknown rank or court.')
    const parent = known.get(character.serves)
    if (rank.parentRank ? !parent || parent.rank !== rank.parentRank || parent.court !== character.court : character.serves !== undefined) throw new Error('Original serving relationship must match the parent rank and court.')
    const seen = new Set<unknown>([character.id])
    let next = parent
    while (next) {
      if (seen.has(next.id)) throw new Error('Original serving hierarchy contains a cycle.')
      seen.add(next.id); next = known.get(next.serves)
    }
  }
  return value as unknown as OriginalCollection
}

export function readOriginalCollection(folder: string): OriginalCollection {
  const collection = validateOriginalCollection(doc(join(folder, 'collection.json')))
  if (collection.id !== folder.split(/[\\/]/).at(-1)) throw new Error('Original collection ID differs from its folder.')
  return collection
}
export function originalCollections(work: string, universe: string): { folder: string; collection: OriginalCollection }[] {
  if (!safe(universe)) return []
  const root = join(work, universe, 'originals')
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true }).filter(item => item.isDirectory() && safe(item.name) && existsSync(join(root, item.name, 'collection.json')))
    .map(item => { const folder = join(root, item.name); return { folder, collection: readOriginalCollection(folder) } })
}

export function originalStudy(folder: string, tab: OriginalTab) {
  const root = tab === 'art' ? folder : tab === 'expressions' ? join(folder, 'dialogue-portraits') : tab === 'splash' ? join(folder, 'splash-art') : join(folder, 'categories', tab)
  const active = doc(join(root, 'active-study.json'))
  const versions = existsSync(root) ? readdirSync(root).filter(name => /^v\d{3}$/.test(name)).sort().reverse() : []
  const version = /^v\d{3}$/.test(text(active.activeVersion)) ? text(active.activeVersion) : versions[0]
  const versionDir = version ? join(root, version) : root
  return { root, versionDir, manifest: doc(join(versionDir, 'manifest.json')), active }
}

/** New metadata only: never import a baseline, overwrite an authored study, or infer approval. */
export function prepareOriginalCollection(folder: string, collection: OriginalCollection, options: { check?: boolean; dryRun?: boolean } = {}) {
  validateOriginalCollection(collection)
  const missing: string[] = []
  const create = (file: string, value: unknown) => {
    if (existsSync(file)) return
    missing.push(relative(folder, file).split(sep).join('/'))
    if (options.check || options.dryRun) return
    mkdirSync(resolve(file, '..'), { recursive: true })
    writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' })
  }
  create(join(folder, 'README.md'), `# ${collection.title}${collection.subtitle ? ' · ' + collection.subtitle : ''}\n\n${collection.description ?? ''}\n\nRead the [handoff](handoff.md), [race bible](bibles/race.md), [casting bible](bibles/casting.md) and the matching court bible before authoring. This collection has ${collection.characters.length} original identities, with no seeded franchise or ranked images. Read docs/original-character-authoring.md in the Art checkout for the folder, review and approval workflow.\n`)
  create(join(folder, 'handoff.md'), `# ${collection.title} handoff\n\n${collection.description ?? ''}\n\nThe collection.json registry defines the active hierarchy. All generated starter studies are empty and pending owner approval. Inspect current files and preserve later work. Wait for the owner’s first character assignment; do not generate art merely to initialize this collection.\n`)
  create(join(folder, 'bibles', 'race.md'), `# ${collection.title}\n\n${collection.description ?? ''}\n\nOriginal character design references only. Record the owner’s body plan, style, state changes and rank distinctions here before art production.\n`)
  const names = new Map(collection.characters.map(character => [character.id, character.name]))
  create(join(folder, 'bibles', 'casting.md'), '# Original casting\n\n| Character | Rank | Court | Serves |\n| --- | --- | --- | --- |\n' + collection.characters.map(character => `| ${character.name} | ${character.rank} | ${character.court} | ${names.get(character.serves ?? '') ?? '—'} |`).join('\n') + '\n')
  for (const court of collection.courts) create(join(folder, 'bibles', 'courts', court.id + '.md'), `# ${court.title}\n\n${court.description ?? ''}\n\n${court.brief ?? ''}\n`)
  for (const character of collection.characters) {
    const own = originalCharacterFolder(folder, character), actorId = originalActorId(collection, character)
    const identity = { kind: 'original-cast-character', id: actorId, key: character.id, name: character.name, ...(character.title ? { title: character.title } : {}), ...(character.adult === true ? { adult: true } : {}), rank: character.rank, court: character.court, ...(character.serves ? { serves: character.serves } : {}), references: [] }
    const existing = doc(join(own, 'character.json'))
    if (existsSync(join(own, 'character.json')) && ['id', 'key', 'name', 'rank', 'court', 'serves'].some(key => existing[key] !== identity[key as keyof typeof identity])) throw new Error('Original character identity differs from the collection; review it before preparing.')
    create(join(own, 'character.json'), identity)
    const rank = collection.ranks.find(item => item.id === character.rank)!, court = collection.courts.find(item => item.id === character.court)!
    const parent = collection.characters.find(item => item.id === character.serves)
    create(join(own, 'brief.md'), `# ${character.name}${character.title ? ' · ' + character.title : ''}\n\n${collection.title} · ${rank.singular} · ${court.title}${parent ? ' · Serves ' + parent.name : ''}\n\n${collection.description ?? ''}\n\n${character.brief ?? ''}\n\nCourt: ${court.brief ?? court.description ?? court.title}\n\nRank: ${rank.description ?? rank.label}\n\nRead the [collection handoff](../../../handoff.md), [race bible](../../../bibles/race.md) and [court bible](../../../bibles/courts/${court.id}.md) before authoring. This is an original identity: references/ starts empty. Do not seed from a franchise or ranked baseline. Save new native art in fresh versions; preserve exact prompts, reference roles and hashes, native output hashes, and the owner verdict. Initial manifests are empty and unapproved.\n`)
    create(join(own, 'references', 'README.md'), '# Original design references\n\nNo baseline image is seeded. Add only the owner’s original design references and approved authored looks; record their roles, origins and SHA-256 hashes. Preserve existing files.\n')
    for (const tab of Object.keys(originalTabs) as OriginalTab[]) {
      const study = originalStudy(own, tab)
      create(join(study.root, 'active-study.json'), { character: character.name, activeVersion: 'v001', ownerApproved: false })
      create(join(study.root, 'v001', 'manifest.json'), { schemaVersion: 1, character: character.name, unitId: actorId, section: tab, ...(tab === 'expressions' ? { assets: [], faces: [] } : tab === 'splash' ? { assets: [] } : { fullBodyAssets: [] }) })
    }
  }
  if (options.check && missing.length) throw new Error(`${missing.length} original character preparation files are missing.`)
  return { characters: collection.characters.length, files: missing.length }
}

function contained(base: string, file: string) { const rel = relative(base, file); return rel && !isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep) }
function image(mounts: Mounts, characterFolder: string, versionDir: string, file: unknown) {
  if (typeof file !== 'string' || isAbsolute(file)) return ''
  const path = resolve(versionDir, file)
  if (!contained(characterFolder, path)) return ''
  const parts = relative(mounts.work, path).split(sep), actual = mediaFile(mounts.work, parts)
  if (!actual || !contained(realpathSync(characterFolder), actual)) return ''
  return '/_gallery/media/work/' + parts.map(encodeURIComponent).join('/')
}
export function originalWorks(mounts: Mounts, folder: string, tab: OriginalTab): Work[] {
  const study = originalStudy(folder, tab)
  return rows(tab === 'splash' || tab === 'expressions' ? study.manifest.assets : study.manifest.fullBodyAssets).flatMap(asset => {
    const url = image(mounts, folder, study.versionDir, asset.image)
    if (!url) return []
    const approval = object(asset.approval)
    return [{ label: text(asset.title) || text(asset.id) || originalTabs[tab], url, status: approval.status === 'approved' && approval.by === 'owner' ? 'Approved' as const : 'In progress' as const }]
  })
}
export function originalEntry(folder: string, collection: OriginalCollection, character: OriginalCharacter): Entry {
  return { id: originalActorId(collection, character), key: character.id, name: character.name, folder: originalCharacterFolder(folder, character), tier: collection.ranks.find(rank => rank.id === character.rank)!.singular }
}
export function originalPortraits(mounts: Mounts, folder: string): Portrait[] {
  const study = originalStudy(folder, 'expressions')
  const at = (v: unknown) => { const p = object(v); return Number.isInteger(p.x) && Number.isInteger(p.y) ? { x: Number(p.x), y: Number(p.y) } : undefined }
  return rows(study.manifest.assets).flatMap(asset => {
    const base = image(mounts, folder, study.versionDir, asset.base)
    if (!base) return []
    const states = rows(asset.outputs).flatMap(output => {
      const expression = text(output.expression), composed = image(mounts, folder, study.versionDir, output.image)
      const face = image(mounts, folder, study.versionDir, output.face || rows(study.manifest.faces).find(item => item.expression === expression)?.file)
      const position = at(output.position) ?? at(asset.position)
      return expression && (composed || (face && position)) ? [{ label: expression, image: composed, face, at: position }] : []
    })
    return [{ label: text(asset.outfit) || text(asset.title) || 'Expressions', base, states: [{ label: 'Neutral', image: base }, ...states] }]
  })
}
