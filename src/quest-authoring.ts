import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { castOf, folderOf, type CastMember, type CastUma } from './enemy-cast.js'
import { keyOf, pngSize } from './lib.js'
import { contentDestination, digest, jsonFile, normalSourceFile, row } from './private-art.js'
import { ownerPrivatePath } from './owner-private-boundary.js'

type Role = 'uma' | 'human' | 'elf'
export interface QuestRelation {
  uma: { id: string; key: string; name: string }
  human: { id: string; name: string }
  elves: { id: string; name: string }[]
}
export interface QuestRelationships {
  schemaVersion: 1
  kind: 'quest-authoring-relationships'
  sourceUniverse: string
  groups: QuestRelation[]
}
export interface QuestLink { type: 'characters' | 'bosses' | 'lieutenants'; id: string; name: string; label: string }
const array = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.map(row) : []
const text = (value: unknown): string => typeof value === 'string' ? value : ''
const slug = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
const encode = (value: unknown) => JSON.stringify(value, null, 2) + '\n'
const optional = (file: string) => existsSync(file) ? row(jsonFile(file)) : {}
const slashed = (file: string) => file.split(sep).join('/')

/** Only the technical relationship file is read; no story, generation prompt or private variant is involved. */
export function questLinks(root: string, type: string, id: string, document?: unknown): QuestLink[] {
  const doc = document === undefined ? optional(join(root, 'cast', 'relationships.json')) : row(document)
  if (doc.kind !== 'quest-authoring-relationships' || doc.schemaVersion !== 1) return []
  for (const group of array(doc.groups)) {
    const uma = row(group.uma), human = row(group.human), elves = array(group.elves)
    const own = type === 'characters' ? uma.key === id : type === 'bosses' ? human.id === id : elves.some(elf => elf.id === id)
    if (!own) continue
    const candidates = [
      { type: 'characters' as const, id: text(uma.key), name: text(uma.name), label: 'Uma' },
      { type: 'bosses' as const, id: text(human.id), name: text(human.name), label: 'Human' },
      ...elves.map(elf => ({ type: 'lieutenants' as const, id: text(elf.id), name: text(elf.name), label: 'Elf' })),
    ]
    return candidates.filter(link => slug(link.id) && link.name && !(link.type === type && link.id === id))
  }
  return []
}

interface Base { id: string; file: string; sha256: string; width: number; height: number; actorId: string }
interface Actor { role: Role; id: string; name: string; folder: string; record: Record<string, unknown>; base: Base }

/** Latest approved pilot for an Uma; other roles select the curated shared combat-station base. */
function sourceBase(work: string, source: string, role: Role, actorId: string, name: string, folder: string): Base {
  const candidates: { dir: string; asset: Record<string, unknown> }[] = []
  if (role === 'uma') {
    const pointer = optional(join(folder, 'active-study.json'))
    const versions = readdirSync(folder, { withFileTypes: true }).filter(entry => entry.isDirectory() && /^v\d+$/.test(entry.name))
      .map(entry => entry.name).sort((a, b) => Number(b.slice(1)) - Number(a.slice(1)))
    if (/^v\d+$/.test(text(pointer.activeVersion))) {
      const selected = text(pointer.activeVersion)
      versions.splice(0, versions.length, selected, ...versions.filter(version => version !== selected && Number(version.slice(1)) < Number(selected.slice(1))))
    }
    for (const version of versions) {
      const dir = join(folder, version)
      for (const asset of array(optional(join(dir, 'manifest.json')).fullBodyAssets)) if (asset.outfit === 'pilot') candidates.push({ dir, asset })
    }
  }
  const dir = join(work, source, ...(role === 'uma' ? [] : role === 'human' ? ['enemies'] : ['enemies', 'lieutenants']), 'approved')
  for (const asset of array(optional(join(dir, 'manifest.json')).assets)) {
    if (role === 'uma' ? keyOf(text(asset.character)) === keyOf(name) && asset.outfit === 'pilot'
      : asset.unitId === actorId && asset.look === 'combat-station') candidates.push({ dir, asset })
  }
  for (const candidate of candidates) {
    const { asset, dir } = candidate, approval = row(asset.approval ?? {})
    if (approval.status !== 'approved' || approval.by !== 'owner') continue
    if (!slug(text(asset.id)) || !/^[a-f0-9]{64}$/.test(text(asset.sha256)) || !text(asset.image).endsWith('.png')) throw new Error('Invalid approved source-base metadata; no files were changed.')
    const file = normalSourceFile(join(work, source), resolve(dir, text(asset.image)))
    const bytes = readFileSync(file), size = pngSize(bytes)
    if (digest(bytes) !== asset.sha256 || size?.width !== asset.width || size?.height !== asset.height) throw new Error('An approved source base changed; no files were changed.')
    return { id: text(asset.id), file, sha256: text(asset.sha256), width: Number(asset.width), height: Number(asset.height), actorId }
  }
  throw new Error(`An approved ${role} pilot/base is missing; no original-game fallback was used.`)
}

function sourceCastFolders(root: string): Map<string, string> {
  const index = optional(join(root, 'cast', 'roster.json')), found = new Map<string, string>()
  for (const record of array(index.characters)) {
    const folder = text(record.folder)
    if (!/^tier-\d+\/[a-z0-9-]+\/[a-z0-9-]+$/.test(folder) || !slug(text(record.id))) throw new Error('Invalid normal cast index.')
    normalSourceFile(join(root, 'cast'), join(folder, 'character.json'))
    if (found.has(text(record.id))) throw new Error('Duplicate normal cast identity.')
    found.set(text(record.id), join(root, 'cast', folder))
  }
  return found
}

/** Creates metadata/starter studies, references existing normal PNGs in place, and never copies or approves art. */
export function prepareQuestAuthoring(options: { work: string; plan: unknown; source?: string; dryRun?: boolean; check?: boolean }) {
  const source = options.source ?? 'cyberpunk'
  if (!slug(source) || source === 'high-fantasy' || ownerPrivatePath(source)) throw new Error('Choose a normal source universe.')
  const work = realpathSync(options.work), root = join(work, 'high-fantasy'), sourceRoot = join(work, source)
  const targetRoster = row(jsonFile(join(root, 'cast', 'roster.json'))), sourceRoster = row(jsonFile(join(sourceRoot, 'cast', 'roster.json')))
  const targets = array(targetRoster.characters), sources = new Map(array(sourceRoster.characters).map(record => [text(record.id), record]))
  const cast = castOf(options.plan, source), pairs = new Map(cast.umas.map(uma => [uma.id, uma]))
  if (!targets.length || new Set(targets.map(record => record.id)).size !== targets.length) throw new Error('Invalid Quest roster.')
  const bossFolders = sourceCastFolders(join(sourceRoot, 'enemies')), elfFolders = sourceCastFolders(join(sourceRoot, 'enemies', 'lieutenants'))
  const actors: Actor[] = [], groups: QuestRelation[] = [], enemyIds = new Set<string>()
  const characterFolder = (universeRoot: string, record: Record<string, unknown>) => {
    if (!/^\.\.\/characters\/[a-z0-9-]+\/character\.json$/.test(text(record.record))) throw new Error('Invalid normal character reference.')
    return dirname(normalSourceFile(universeRoot, resolve(universeRoot, 'cast', text(record.record))))
  }
  const enemy = (role: 'human' | 'elf', uma: CastUma, member: CastMember, human?: { id: string; name: string }) => {
    if (enemyIds.has(member.id)) throw new Error('An enemy identity was cast more than once; no files were changed.')
    enemyIds.add(member.id)
    const sourceFolder = (role === 'human' ? bossFolders : elfFolders).get(member.id) ?? join(sourceRoot, role === 'human' ? 'enemies' : 'enemies/lieutenants', folderOf(uma, member))
    const sourceRecord = row(jsonFile(normalSourceFile(sourceRoot, join(sourceFolder, 'character.json'))))
    if (sourceRecord.id !== member.id) throw new Error('Source enemy identity mismatch.')
    const name = text(sourceRecord.name) || member.name, roleRoot = role === 'human' ? 'enemies' : 'enemies/lieutenants'
    const folder = join(root, roleRoot, folderOf(uma, { ...member, name }))
    actors.push({ role, id: member.id, name, folder, base: sourceBase(work, source, role, member.id, name, sourceFolder), record: {
      schemaVersion: 1, kind: 'enemy-cast-character', game: 'high-fantasy', app: role === 'human' ? 'bosses' : 'lieutenants',
      role: role === 'human' ? 'boss' : 'lieutenant', species: role, id: member.id, name,
      rankerTier: member.rankerTier, uma: { id: uma.id, name: uma.name, tier: uma.tier, order: uma.order },
      faction: uma.faction, castRevision: cast.revision, ...(human ? { leader: human } : {}),
    } })
    return { id: member.id, name }
  }
  for (const target of targets) {
    const id = text(target.id), sourceRecord = sources.get(id), mapped = pairs.get(id)
    if (!sourceRecord || !mapped?.boss || mapped.lieutenants.length !== 3) throw new Error('Each Quest Uma needs the existing Human and three Elves; no relationships were invented.')
    const folder = characterFolder(root, target), normal = row(jsonFile(join(folder, 'character.json')))
    const sourceFolder = characterFolder(sourceRoot, sourceRecord)
    if (normal.id !== id || row(jsonFile(join(sourceFolder, 'character.json'))).id !== id) throw new Error('Uma identity mismatch.')
    const name = text(target.name), uma = { ...mapped, name }, key = text(normal.key) || keyOf(name)
    if (!/^T(?:[1-9]|10)$/.test(uma.tier) || !Number.isSafeInteger(uma.order) || uma.order < 1 || !slug(key)) throw new Error('Invalid ranked identity or position.')
    actors.push({ role: 'uma', id, name, folder, record: { ...normal, species: 'uma' }, base: sourceBase(work, source, 'uma', id, text(sourceRecord.name), sourceFolder) })
    const human = enemy('human', uma, mapped.boss)
    const elves = mapped.lieutenants.map(member => enemy('elf', uma, member, human))
    groups.push({ uma: { id, key, name }, human, elves })
  }
  const relationships: QuestRelationships = { schemaVersion: 1, kind: 'quest-authoring-relationships', sourceUniverse: source, groups }
  const proposed = new Map<string, string>()
  const put = (file: string, value: unknown, freshOnly = false) => {
    file = contentDestination(root, file)
    if (freshOnly && existsSync(file)) return
    const next = typeof value === 'string' ? value : encode(value)
    if (!existsSync(file) || readFileSync(file, 'utf8').replace(/\r\n/g, '\n') !== next) proposed.set(file, next)
  }
  for (const actor of actors) {
    const file = join(actor.folder, 'character.json'), current = optional(file)
    if (current.id && current.id !== actor.id) throw new Error('An existing Quest folder has a different identity.')
    const oldBase = row(current.authoringBase ?? {})
    if (oldBase.sha256 && oldBase.sha256 !== actor.base.sha256) throw new Error('The source base revision changed; existing Quest work was preserved.')
    const ref = { kind: 'art', file: slashed(relative(actor.folder, actor.base.file)), sha256: actor.base.sha256, width: actor.base.width, height: actor.base.height, sourceUniverse: source, sourceAssetId: actor.base.id }
    const previous = array(current.references).filter(reference => reference.kind !== 'art' || reference.sourceUniverse !== source)
      .map(reference => reference.kind === 'art' ? { ...reference, kind: 'legacy-art' } : reference)
    const record = { ...current, ...actor.record, references: [ref, ...previous], authoringBase: { universe: source, actorId: actor.base.actorId, imageId: actor.base.id, sha256: actor.base.sha256 } }
    put(file, record)
    put(join(actor.folder, 'quest-authoring.md'), `# ${actor.name}\n\nStart from the approved pilot/base linked by character.json. It is an authoring reference, not an approved Quest outfit.\nPreserve this character's identity and the linked Uma/Human/Elf group. Save new Quest art in fresh study versions.\nThe owner reviews each exact new image. Existing studies and legacy reference files remain preserved.\n`, true)
    const names = { [actor.role === 'uma' ? text(actor.record.key) || keyOf(actor.name) : actor.id]: actor.name }
    for (const section of ['', 'dialogue-portraits', 'splash-art']) {
      const folder = join(actor.folder, section)
      const versions = existsSync(folder) ? readdirSync(folder, { withFileTypes: true }).filter(entry => entry.isDirectory() && /^v\d+$/.test(entry.name)).map(entry => entry.name).sort((a, b) => Number(b.slice(1)) - Number(a.slice(1))) : []
      const version = text(optional(join(folder, 'active-study.json')).activeVersion) || versions[0] || 'v001'
      if (!/^v\d+$/.test(version)) throw new Error('Invalid existing Quest study pointer.')
      put(join(folder, 'active-study.json'), { schemaVersion: 1, activeVersion: version, ownerApproved: false }, true)
      put(join(folder, version, 'manifest.json'), { schemaVersion: 1, characterNames: names, ...(section === '' ? { fullBodyAssets: [] } : { assets: [] }) }, true)
    }
  }
  for (const role of ['human', 'elf'] as const) {
    const roleRoot = join(root, role === 'human' ? 'enemies' : 'enemies/lieutenants')
    const characters = actors.filter(actor => actor.role === role).map(actor => ({ id: actor.id, name: actor.name, folder: slashed(relative(join(roleRoot, 'cast'), actor.folder)), opponent: text(row(actor.record.uma).name) }))
    put(join(roleRoot, 'cast', 'roster.json'), { schemaVersion: 1, kind: 'enemy-cast-roster', characters })
    put(join(roleRoot, 'approved', 'manifest.json'), { schemaVersion: 1, universe: 'high-fantasy', assets: [] }, true)
  }
  put(join(root, 'cast', 'relationships.json'), relationships)
  if (options.check && proposed.size) throw new Error(`Quest authoring preparation differs in ${proposed.size} files; nothing was written.`)
  if (!options.dryRun && !options.check) for (const [file, value] of proposed) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, value) }
  return { umas: targets.length, humans: actors.filter(actor => actor.role === 'human').length, elves: actors.filter(actor => actor.role === 'elf').length, referencedBases: actors.length, copiedImages: 0, changedFiles: proposed.size }
}
