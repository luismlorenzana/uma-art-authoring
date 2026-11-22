import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'

export const DUO_CATEGORY = 'duo-splash'
export interface DuoMember { id: string; key: string; name: string; role: 'character' | 'boss-ally'; tier: string; order: number; characterId?: number; outfitId?: number }
export interface DuoPair { id: string; key: string; members: [string, string]; owner: string }
export interface DuoAttribution { id: string; members: DuoMember[] }
export interface DuoRoster { schemaVersion: 1; kind: 'duo-splash-roster'; universe: string; source: string; sourceSha256: string; members: DuoMember[]; pairs: DuoPair[] }
type Row = Record<string, unknown>
export const duoObject = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
const rows = (value: unknown) => Array.isArray(value) ? value.map(duoObject) : []
const text = (value: unknown) => typeof value === 'string' ? value : ''
const safe = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
export const duoFolder = (universeDir: string) => join(universeDir, 'categories', DUO_CATEGORY)
export function duoDocument(file: string): Row {
  try { return duoObject(JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))) } catch { return {} }
}
const hash = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex')
const compareId = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true })
export const canonicalPair = (a: string, b: string) => [a, b].sort(compareId).join(':')

export function castMembers(universeDir: string): DuoMember[] {
  return rows(duoDocument(join(universeDir, 'cast', 'roster.json')).characters).map((raw, index) => {
    const key = /^\.\.\/characters\/([a-z0-9-]+)\/character\.json$/.exec(text(raw.record))?.[1]
    if (!key || !text(raw.id) || !text(raw.name)) throw new Error('The ranked cast contains an invalid character record.')
    return { id: text(raw.id), key, name: text(raw.name), role: 'character', tier: text(raw.tier), order: typeof raw.order === 'number' ? raw.order : index + 1,
      ...(typeof raw.characterId === 'number' ? { characterId: raw.characterId } : {}), ...(typeof raw.outfitId === 'number' ? { outfitId: raw.outfitId } : {}) }
  })
}

export function farmDuoRoster(members: DuoMember[], assignments: unknown, source = '', sourceSha256 = ''): DuoRoster {
  if (!Array.isArray(assignments)) throw new Error('The Farm household has no authored duos.')
  const known = new Set(members.map(member => member.id)), seen = new Set<string>()
  const pairs = assignments.map((assignment): DuoPair => {
    if (!Array.isArray(assignment) || assignment.length !== 2 || assignment.some(id => typeof id !== 'string' || !known.has(id)) || assignment[0] === assignment[1]) throw new Error('A Farm duo must name two distinct members of the ranked cast.')
    const key = canonicalPair(assignment[0] as string, assignment[1] as string)
    if (seen.has(key)) throw new Error('The Farm household repeats a duo in either direction.')
    seen.add(key)
    const ids = key.split(':') as [string, string]
    return { id: 'farm-' + ids.join('-'), key, members: ids, owner: ids[0] }
  })
  return { schemaVersion: 1, kind: 'duo-splash-roster', universe: 'farm-life', source, sourceSha256, members, pairs }
}

export function cyberpunkDuoRoster(members: DuoMember[], allies: { id: string; name: string; key: string; uma: string }[], source = '', sourceSha256 = ''): DuoRoster {
  const result = [...members], pairs: DuoPair[] = [], used = new Set<string>()
  for (const member of members) {
    const matches = allies.filter(ally => ally.uma === member.id)
    if (matches.length !== 1) throw new Error('Each ranked Cyberpunk character needs exactly one mapped Boss Ally.')
    const ally = matches[0]!
    if (!safe(ally.id) || used.has(ally.id)) throw new Error('A Cyberpunk Boss Ally is invalid or mapped more than once.')
    used.add(ally.id)
    const allyId = 'ally-' + ally.id
    result.push({ id: allyId, key: ally.key, name: ally.name, role: 'boss-ally', tier: member.tier, order: member.order })
    pairs.push({ id: `cyberpunk-${member.id}-${ally.id}`, key: `${member.id}:${ally.id}`, members: [member.id, allyId], owner: member.id })
  }
  return { schemaVersion: 1, kind: 'duo-splash-roster', universe: 'cyberpunk', source, sourceSha256, members: result, pairs }
}

export function readDuoRoster(universeDir: string): DuoRoster | null {
  const raw = duoDocument(join(duoFolder(universeDir), 'roster.json'))
  if (raw.kind !== 'duo-splash-roster' || !Array.isArray(raw.members) || !Array.isArray(raw.pairs)) return null
  const members = raw.members as DuoMember[], pairs = raw.pairs as DuoPair[]
  const known = new Set(members.map(member => member.id)), seen = new Set<string>()
  if (known.size !== members.length || members.some(member => !text(member.id) || !safe(text(member.key)) || !text(member.name) || !['character', 'boss-ally'].includes(member.role) || !Number.isSafeInteger(member.order))) throw new Error('The duo roster contains an invalid or duplicate member.')
  for (const pair of pairs) {
    if (!safe(pair.id) || seen.has(pair.id) || !Array.isArray(pair.members) || pair.members.length !== 2 || pair.members[0] === pair.members[1] || pair.members.some(id => !known.has(id)) || !pair.members.includes(pair.owner)) throw new Error('The duo roster contains an invalid or duplicate pair.')
    seen.add(pair.id)
  }
  return raw as unknown as DuoRoster
}

export function prepareDuos(universeDir: string, roster: DuoRoster, options: { dryRun?: boolean; check?: boolean } = {}) {
  const root = duoFolder(universeDir), changed: string[] = []
  const put = (file: string, value: unknown, preserve = false) => {
    if (preserve && existsSync(file)) return
    const body = JSON.stringify(value, null, 2) + '\n'
    if (existsSync(file) && readFileSync(file, 'utf8') === body) return
    changed.push(relative(root, file).replaceAll('\\', '/'))
    if (!options.dryRun && !options.check) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body) }
  }
  put(join(root, 'roster.json'), roster)
  for (const pair of roster.pairs) {
    const members = pair.members.map(id => roster.members.find(member => member.id === id)!)
    const folder = join(root, 'pairs', pair.id)
    put(join(folder, 'pair.json'), { ...pair, participants: members })
    put(join(folder, 'manifest.json'), { schemaVersion: 1, kind: 'duo-splash', pair: pair.id, assets: [] }, true)
  }
  if (options.check && changed.length) throw new Error(`${changed.length} duo metadata files need preparation.`)
  return { characters: roster.members.filter(member => member.role === 'character').length, pairs: roster.pairs.length, changed }
}

export function buildDuoRoster(universeDir: string, universe: string, householdFile: string) {
  const members = castMembers(universeDir)
  if (members.length !== 50) throw new Error('Duo authoring requires the ranked 50-character roster.')
  if (universe === 'farm-life') {
    const roster = farmDuoRoster(members, duoDocument(householdFile).duos, householdFile, hash(householdFile))
    if (roster.pairs.length !== 75 || members.some(member => roster.pairs.filter(pair => pair.members.includes(member.id)).length !== 3)) throw new Error('Farm duo authoring requires 75 mutual pairs and exactly three partners per ranked character.')
    return roster
  }
  if (universe !== 'cyberpunk') throw new Error('Duo splash authoring supports Farm and Cyberpunk.')
  const cast = join(universeDir, 'enemies', 'casual', 'cast'), allies: { id: string; name: string; key: string; uma: string }[] = []
  const files: string[] = []
  const walk = (folder: string, depth: number) => {
    if (depth > 4 || !existsSync(folder)) return
    const file = join(folder, 'character.json')
    if (existsSync(file)) {
      const info = duoDocument(file)
      allies.push({ id: text(info.id), name: text(info.name), key: folder.split(/[\\/]/).at(-1)!, uma: text(duoObject(info.uma).id) })
      files.push(file)
      return
    }
    for (const item of readdirSync(folder, { withFileTypes: true })) if (item.isDirectory() && !item.name.startsWith('.')) walk(join(folder, item.name), depth + 1)
  }
  walk(cast, 0)
  const digest = createHash('sha256').update(files.sort().map(file => hash(file)).join('\n')).digest('hex')
  return cyberpunkDuoRoster(members, allies, cast, digest)
}

/** Each pair has one authoring folder; neither participant receives a copied image. */
export function duoStudy(universeDir: string, pair: DuoPair) {
  const folder = join(duoFolder(universeDir), 'pairs', pair.id)
  const active = text(duoDocument(join(folder, 'active-study.json')).activeVersion)
  const versions = existsSync(folder) ? readdirSync(folder).filter(name => /^v\d{3}$/.test(name)).sort().reverse() : []
  const version = /^v\d{3}$/.test(active) ? active : versions[0]
  const versionDir = version ? join(folder, version) : folder
  return { folder, versionDir, assets: rows(duoDocument(join(versionDir, 'manifest.json')).assets) }
}
export function duoImagePath(folder: string, versionDir: string, image: unknown): string | null {
  if (typeof image !== 'string' || isAbsolute(image) || !image.endsWith('.png')) return null
  const file = resolve(versionDir, image), rel = relative(folder, file)
  return rel && !isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + pathSeparator()) ? file : null
}
const pathSeparator = () => process.platform === 'win32' ? '\\' : '/'
