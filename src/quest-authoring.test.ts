import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { digest } from './private-art.js'
import { prepareQuestAuthoring } from './quest-authoring.js'
import { entries, universes, type Mounts } from './gallery-data.js'
import { galleryPage } from './gallery-pages.js'

const folders: string[] = []
afterEach(() => { for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true }) })
const png = (marker = 0) => { const bytes = Buffer.alloc(64); Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes); bytes.write('IHDR', 12); bytes.writeUInt32BE(20, 16); bytes.writeUInt32BE(30, 20); bytes[63] = marker; return bytes }

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'quest-cast-')); folders.push(root)
  const work = join(root, 'work'), target = join(work, 'high-fantasy'), source = join(work, 'cyberpunk')
  const put = (file: string, value: unknown) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, Buffer.isBuffer(value) ? value : JSON.stringify(value)) }
  const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'))
  const roster = { characters: [{ id: 'rider-one', name: 'Aster Vale', tier: 'T1', order: 1, record: '../characters/aster-vale/character.json' }] }
  const record = { id: 'rider-one', name: 'Aster Vale', key: 'aster-vale', outfitId: 9000001, references: [{ kind: 'art', file: 'references/art.webp' }] }
  for (const folder of [source, target]) {
    put(join(folder, 'cast/roster.json'), roster)
    put(join(folder, 'characters/aster-vale/character.json'), record)
    put(join(folder, 'characters/aster-vale/references/art.webp'), Buffer.from('invented legacy reference'))
    put(join(folder, 'approved/manifest.json'), { assets: [] })
  }
  const approval = { status: 'approved', by: 'owner' }, normal = { image: 'normal.png', sha256: digest(png()), width: 20, height: 30, approval }
  for (const version of ['v001', 'v002', 'v003']) {
    put(join(source, 'characters/aster-vale', version, 'normal.png'), png())
    put(join(source, 'characters/aster-vale', version, 'manifest.json'), { fullBodyAssets: [{ ...normal, id: 'pilot-' + version, outfit: 'pilot', ...(version === 'v003' ? { approval: { status: 'pending' } } : {}) }] })
  }
  const members = [{ id: 'unit-one', name: 'Human One' }, { id: 'unit-two', name: 'Elf Two' }, { id: 'unit-three', name: 'Elf Three' }, { id: 'unit-four', name: 'Elf Four' }]
  for (const [role, people] of [['enemies', members.slice(0, 1)], ['enemies/lieutenants', members.slice(1)]] as const) {
    const records = people.map(member => ({ ...member, folder: `tier-1/01-aster-vale/${member.id}` }))
    put(join(source, role, 'cast/roster.json'), { kind: 'enemy-cast-roster', characters: records })
    for (const member of records) put(join(source, role, 'cast', member.folder, 'character.json'), { id: member.id, name: member.name })
    put(join(source, role, 'approved/normal.png'), png())
    put(join(source, role, 'approved/manifest.json'), { assets: people.map(member => ({ ...normal, id: member.id + '-base', unitId: member.id, look: 'combat-station' })) })
  }
  const plan = { enemyCasts: { cyberpunk: { revision: 7, tiers: [{ tier: 'T1', umas: [{ uma: 'rider-one', name: 'Aster Vale', order: 1, boss: members[0], subBosses: members.slice(1) }] }] } } }
  const prepare = (options: { dryRun?: boolean; check?: boolean } = {}) => prepareQuestAuthoring({ work, plan, ...options })
  const mounts: Mounts = { work, art: join(root, 'published'), enemy: join(root, 'enemy') }
  return { root, work, target, source, put, read, plan, prepare, mounts }
}

it('references the latest approved bases in place, preserves IDs and legacy work, and checks idempotently', () => {
  const f = fixture(), file = join(f.target, 'characters/aster-vale/character.json'), original = readFileSync(file)
  expect(f.prepare({ dryRun: true })).toMatchObject({ umas: 1, humans: 1, elves: 3, referencedBases: 5, copiedImages: 0 })
  expect(readFileSync(file)).toEqual(original)
  expect(existsSync(join(f.target, 'enemies'))).toBe(false)
  f.put(join(f.target, 'characters/aster-vale/v009/manifest.json'), { fullBodyAssets: [], retained: 'invented earlier study' })
  expect(f.prepare()).toMatchObject({ umas: 1, humans: 1, elves: 3, copiedImages: 0 })
  const current = f.read(file)
  expect(current.id).toBe('rider-one')
  expect(current.outfitId).toBe(9000001)
  expect(current.authoringBase.imageId).toBe('pilot-v002')
  expect(resolve(dirname(file), current.references[0].file)).toBe(join(f.source, 'characters/aster-vale/v002/normal.png'))
  expect(current.references[1].kind).toBe('legacy-art')
  expect(f.read(join(f.target, 'characters/aster-vale/v009/manifest.json')).retained).toBe('invented earlier study')
  expect(f.read(join(f.target, 'characters/aster-vale/active-study.json')).activeVersion).toBe('v009')
  expect(f.prepare({ check: true }).changedFiles).toBe(0)
  expect(f.prepare().changedFiles).toBe(0)
})

it('shows Quest species labels, three standard album tabs and reciprocal cast links without changing other universes', () => {
  const f = fixture(); f.prepare()
  const blank = new URLSearchParams(), quest = universes.find(universe => universe.slug === 'high-fantasy')!
  const landing = galleryPage(f.mounts, '/gallery/high-fantasy', blank)!
  for (const label of ['Umas', 'Humans', 'Elves']) expect(landing).toContain(`<h2>${label}</h2>`)
  expect(landing).not.toContain('Boss Ally')
  const umas = entries(f.mounts, quest, 'characters'), humans = entries(f.mounts, quest, 'bosses'), elves = entries(f.mounts, quest, 'lieutenants')
  expect(umas[0]!.relationships).toHaveLength(4)
  expect(humans[0]!.relationships?.some(link => link.type === 'characters' && link.id === 'aster-vale')).toBe(true)
  expect(elves[0]!.relationships?.some(link => link.type === 'bosses' && link.id === 'unit-one')).toBe(true)
  const album = galleryPage(f.mounts, '/gallery/high-fantasy/lieutenants/unit-two', blank)!
  expect(album).toContain('aria-label="Related cast"')
  expect(album).toContain('/gallery/high-fantasy/bosses/unit-one')
  expect(album).toContain('/gallery/high-fantasy/characters/aster-vale')
  for (const tab of ['Character Art', 'Facial Expressions', 'Splash Art']) expect(album).toContain(tab)
  const umaList = galleryPage(f.mounts, '/gallery/high-fantasy/characters', blank)!
  expect(umaList).toContain('cyberpunk/characters/aster-vale/v002/normal.png')
  expect(umaList).not.toContain('references/art.webp')
  expect(galleryPage(f.mounts, '/gallery/farm-life', blank)).toContain('<h2>Characters</h2>')
})

it('refuses stale, unapproved or private source files before changing Quest metadata', () => {
  const f = fixture(), file = join(f.target, 'characters/aster-vale/character.json'), original = readFileSync(file)
  f.put(join(f.source, 'enemies/approved/normal.png'), png(9))
  expect(() => f.prepare()).toThrow(/source base changed/)
  expect(readFileSync(file)).toEqual(original)
  expect(existsSync(join(f.target, 'enemies'))).toBe(false)
  f.put(join(f.source, 'enemies/approved/normal.png'), png())
  const manifest = f.read(join(f.source, 'enemies/approved/manifest.json'))
  manifest.assets[0].image = 'normal.private.png'
  f.put(join(f.source, 'enemies/approved/manifest.json'), manifest)
  expect(() => f.prepare()).toThrow(/OWNER_ONLY_DIRECTORY/)
  expect(readFileSync(file)).toEqual(original)
})

it('detects duplicate assignments and missing relationship metadata without fabricating a replacement cast', () => {
  const f = fixture(), uma = f.plan.enemyCasts.cyberpunk.tiers[0]!.umas[0]!
  uma.subBosses[1] = uma.subBosses[0]!
  expect(() => f.prepare()).toThrow(/cast more than once/)
  expect(existsSync(join(f.target, 'enemies'))).toBe(false)
  const g = fixture(); g.prepare()
  rmSync(join(g.target, 'cast/relationships.json'))
  expect(() => g.prepare({ check: true })).toThrow(/nothing was written/)
  expect(existsSync(join(g.target, 'cast/relationships.json'))).toBe(false)
})
