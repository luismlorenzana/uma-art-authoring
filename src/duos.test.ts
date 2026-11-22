import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { cyberpunkDuoRoster, duoFolder, duoImagePath, farmDuoRoster, prepareDuos, type DuoMember } from './duos.js'
import { galleryPage } from './gallery-pages.js'
import { duoLibrary } from './gallery-duos.js'
import { planPush, publicationOf, readCollection, selectionOf, writeFlags } from './lib.js'
import { universes, type Mounts } from './gallery-data.js'

const cleanup: string[] = []
afterEach(() => { for (const root of cleanup.splice(0)) rmSync(root, { recursive: true, force: true }) })
const members: DuoMember[] = [
  { id: '9001', key: 'pilot-one', name: 'Pilot One', role: 'character', tier: 'T1', order: 1 },
  { id: 's900102', key: 'pilot-two', name: 'Pilot Two', role: 'character', tier: 'T1', order: 2 },
]
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'duo-art-')); cleanup.push(root)
  const mounts: Mounts = { work: join(root, 'work'), art: join(root, 'art'), enemy: join(root, 'enemy') }
  const universeDir = join(mounts.work, 'farm-life')
  const put = (file: string, value: unknown) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, Buffer.isBuffer(value) ? value : JSON.stringify(value)) }
  put(join(universeDir, 'cast/roster.json'), { characters: members.map(member => ({ ...member, record: `../characters/${member.key}/character.json` })) })
  put(join(universeDir, 'approved/manifest.json'), { assets: [] })
  const roster = farmDuoRoster(members, [['s900102', '9001']])
  prepareDuos(universeDir, roster)
  const pair = roster.pairs[0]!, folder = join(duoFolder(universeDir), 'pairs', pair.id)
  return { root, mounts, universeDir, roster, pair, folder, put }
}

it('uses one canonical pair for both characters, rejects reverse duplicates and preserves authored manifests on preparation', () => {
  const { universeDir, roster, folder, put } = fixture()
  expect(roster.pairs[0]!.key).toBe('9001:s900102')
  expect(() => farmDuoRoster(members, [['9001', 's900102'], ['s900102', '9001']])).toThrow(/repeats/)
  expect(() => farmDuoRoster(members, [['9001', 'unknown']])).toThrow(/ranked cast/)
  put(join(folder, 'manifest.json'), { assets: [{ id: 'existing-selection' }] })
  expect(prepareDuos(universeDir, roster).changed).toEqual([])
  expect(JSON.parse(readFileSync(join(folder, 'manifest.json'), 'utf8')).assets[0].id).toBe('existing-selection')
  expect(readdirSync(folder).sort()).toEqual(['manifest.json', 'pair.json'])
})

it('requires exactly one unique Boss Ally per Cyberpunk character', () => {
  const ally = { id: 'ally-unit-one', name: 'Ally One', key: 'ally-one', uma: '9001' }
  expect(() => cyberpunkDuoRoster(members, [ally])).toThrow(/exactly one/)
  const roster = cyberpunkDuoRoster(members.slice(0, 1), [ally])
  expect(roster.pairs[0]!.owner).toBe('9001')
  expect(roster.members[1]!.role).toBe('boss-ally')
})

it('references existing authored profiles and renders the same splash in both participant albums', () => {
  const { mounts, universeDir, folder, put, pair } = fixture()
  const published = join(mounts.art, 'universes/farm-life')
  put(join(published, 'profiles/index.json'), { characters: members.map(member => ({ id: member.key, name: member.name })), profiles: members.map(member => ({ character: member.key, outfit: 'spring', path: `profiles/${member.key}.webp` })) })
  for (const member of members) put(join(published, `profiles/profiles/${member.key}.webp`), 'synthetic image bytes')
  put(join(folder, 'manifest.json'), { assets: [{ id: 'shared', title: 'Together', image: 'shared.png', approval: { status: 'approved', by: 'owner' } }] })
  put(join(folder, 'shared.png'), 'synthetic image bytes')
  const list = galleryPage(mounts, '/gallery/farm-life/duos', new URLSearchParams())!
  expect(list).toContain('/_gallery/media/art/universes/farm-life/profiles/profiles/pilot-one.webp')
  expect(list).not.toContain('references/art.webp')
  const first = galleryPage(mounts, '/gallery/farm-life/duos/pilot-one', new URLSearchParams())!
  const second = galleryPage(mounts, '/gallery/farm-life/characters/pilot-two', new URLSearchParams('view=duo-splash'))!
  expect(first).toContain('With Pilot Two')
  expect(second).toContain('With Pilot One')
  const image = `categories/duo-splash/pairs/${pair.id}/shared.png`
  expect(first).toContain(image)
  expect(second).toContain(image)
  expect(duoLibrary(mounts, universes[1]!).pairsFor(members[0]!)).toHaveLength(1)
  expect(duoImagePath(folder, folder, '../escape.png')).toBeNull()
  expect(duoFolder(universeDir)).toBe(join(universeDir, 'categories/duo-splash'))
  const sha256 = createHash('sha256').update(readFileSync(join(folder, 'shared.png'))).digest('hex')
  put(join(published, 'images/shared.png'), 'synthetic image bytes')
  put(join(published, 'index.json'), { looks: [{ id: `duo-${pair.id}-shared`, category: 'duo-splash', duo: { id: pair.id }, path: 'images/shared.png', title: 'Together', sha256 }] })
  expect(duoLibrary(mounts, universes[1]!).works(pair).map(work => work.status)).toEqual(['Published'])
  put(join(folder, 'shared.png'), 'a new private revision')
  expect(duoLibrary(mounts, universes[1]!).works(pair).map(work => work.status)).toEqual(['Approved'])
})

it('publishes a single approved image with both members, selectable by either participant', () => {
  const { universeDir, folder, put } = fixture()
  // A small synthetic PNG header; no original image or dataset is a fixture.
  const png = Buffer.alloc(24)
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png)
  png.write('IHDR', 12); png.writeUInt32BE(2, 16); png.writeUInt32BE(1, 20)
  const sha256 = createHash('sha256').update(png).digest('hex')
  put(join(folder, 'shared.png'), png)
  put(join(folder, 'manifest.json'), { assets: [{ id: 'shared', image: 'shared.png', width: 2, height: 1, sha256, approval: { status: 'approved', by: 'owner', on: '2026-01-01' } }] })
  const collection = readCollection('farm-life', join(universeDir, 'approved'))
  expect(collection.looks).toHaveLength(1)
  expect(collection.looks[0]!.duo?.members.map(member => member.id)).toEqual(['9001', 's900102'])
  const plan = planPush(collection, null, '2026-01-02', selectionOf(['pilot-two']))
  expect(plan.upload).toHaveLength(1)
  expect(plan.index.looks).toHaveLength(1)
  expect(plan.index.looks[0]!.duo).toEqual(collection.looks[0]!.duo)
  const publication = publicationOf(collection, plan.index, '2026-01-02')
  writeFlags(join(universeDir, 'approved'), publication)
  const flags = JSON.parse(readFileSync(join(duoFolder(universeDir), 'approved/publication.json'), 'utf8'))
  expect(flags.looks).toHaveLength(1)
  expect(flags.looks[0].state).toBe('published')
  expect(flags.looks[0].image).toContain('../pairs/')
  const elsewhere = { ...collection, looks: [], refused: [], order: [] }
  expect(planPush(elsewhere, plan.index, '2026-01-03').withdrawn).toEqual([])
  expect(publicationOf(elsewhere, plan.index, '2026-01-03').withdrawable).toEqual([])
  put(join(folder, 'shared.png'), Buffer.alloc(24))
  const damaged = readCollection('farm-life', join(universeDir, 'approved'))
  expect(damaged.refused[0]!.kind).toBe('damaged')
  expect(planPush(damaged, plan.index, '2026-01-04').withdrawn).toEqual([])
})

it('references an existing release profile when the publication mirror has only metadata, keeping sister identity distinct', () => {
  const { root, mounts, put } = fixture()
  mounts.profiles = join(root, 'release')
  put(join(mounts.profiles, 'manifest.json'), { art: 'data/art.json' })
  put(join(mounts.profiles, 'data/art.json'), { dialoguePortraits: { '9101': 'art/base.json', 'outfit:910102': 'art/sister.json' } })
  put(join(mounts.profiles, 'art/base.json'), { bases: { spring: { profile: { path: 'art/base.webp' } } } })
  put(join(mounts.profiles, 'art/sister.json'), { bases: { spring: { profile: { path: 'art/sister.webp' } } } })
  put(join(mounts.profiles, 'art/base.webp'), 'invented base profile')
  put(join(mounts.profiles, 'art/sister.webp'), 'invented sister profile')
  const lib = duoLibrary(mounts, universes[1]!)
  expect(lib.profile({ ...members[0]!, characterId: 9101 })).toContain('/profiles/art/base.webp')
  expect(lib.profile({ ...members[1]!, characterId: 9101, outfitId: 910102 })).toContain('/profiles/art/sister.webp')
})
