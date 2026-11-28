import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { prepareQuestAlbums } from './quest-albums.js'
import { digest } from './private-art.js'
import { entries, library, universes, type Mounts } from './gallery-data.js'
import { galleryPage } from './gallery-pages.js'

const roots: string[] = []
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }) })
const png = (mark = 0) => { const b = Buffer.alloc(64); Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(b); b.write('IHDR', 12); b.writeUInt32BE(20, 16); b.writeUInt32BE(30, 20); b[63] = mark; return b }

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'quest-albums-')); roots.push(root)
  const work = join(root, 'work'), quest = join(work, 'high-fantasy'), mounts: Mounts = { work, art: join(root, 'art'), enemy: join(root, 'enemy') }
  const put = (file: string, value: unknown) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, Buffer.isBuffer(value) ? value : JSON.stringify(value)) }
  const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'))
  put(join(quest, 'cast/roster.json'), { characters: [{ id: 'actor-one', name: 'Pilot One', tier: 'T1', record: '../characters/pilot-one/character.json' }] })
  const actors = [
    { type: 'characters', id: 'pilot-one', actorId: 'actor-one', folder: join(quest, 'characters/pilot-one'), name: 'Pilot One' },
    { type: 'bosses', id: 'unit-one', actorId: 'unit-one', folder: join(quest, 'enemies/cast/tier-1/01-pilot-one/shared-name'), name: 'Shared Name' },
    { type: 'lieutenants', id: 'unit-two', actorId: 'unit-two', folder: join(quest, 'enemies/lieutenants/cast/tier-1/01-pilot-one/shared-name'), name: 'Shared Name' },
  ] as const
  for (const [index, actor] of actors.entries()) {
    put(join(actor.folder, 'character.json'), { id: actor.actorId, name: actor.name, key: actor.id, uma: { name: 'Pilot One' } })
    put(join(actor.folder, 'active-study.json'), { activeVersion: 'v003', ownerApproved: index < 2 })
    put(join(actor.folder, 'v003/native/base.png'), png(index))
    put(join(actor.folder, 'v003/manifest.json'), { fullBodyAssets: index < 2 ? [{ id: 'village-base', outfit: 'village', image: 'native/base.png', width: 20, height: 30, sha256: digest(png(index)), approval: { status: 'approved', by: 'owner' } }] : [] })
  }
  const prepare = (args: { dryRun?: boolean; check?: boolean } = {}) => prepareQuestAlbums({ work, ...args })
  return { root, work, quest, mounts, actors, put, read, prepare }
}

it('prepares all three species without touching bases, grants no approvals and detects missing/stale inputs', () => {
  const f = fixture(), base = join(f.actors[0].folder, 'v003/native/base.png'), before = readFileSync(base)
  expect(f.prepare({ dryRun: true })).toMatchObject({ actors: 3, approvedQuestCharacters: 2, pendingQuestCharacters: 1, copiedImages: 0 })
  expect(existsSync(join(f.actors[0].folder, 'dialogue-portraits'))).toBe(false)
  expect(f.prepare()).toMatchObject({ actors: 3, sectionsPerActor: 3, approvedQuestBases: 2, copiedImages: 0 })
  expect(readFileSync(base)).toEqual(before)
  expect(f.prepare({ check: true }).changedFiles).toBe(0)
  const sprite = join(f.quest, 'enemies/categories/character-sprites/characters/unit-one')
  expect(f.read(join(sprite, 'inputs.json')).bases[0].sha256).toBe(digest(png(1)))
  expect(f.read(join(sprite, 'active-study.json')).ownerApproved).toBe(false)
  expect(f.read(join(sprite, 'v001/manifest.json')).fullBodyAssets).toEqual([])
  const elf = join(f.quest, 'enemies/lieutenants/categories/character-sprites/characters/unit-two')
  expect(f.read(join(elf, 'inputs.json')).status).toBe('awaiting-approved-quest-base')
  expect(f.read(join(elf, 'inputs.json')).bases).toEqual([])
  rmSync(join(sprite, 'inputs.json'))
  expect(() => f.prepare({ check: true })).toThrow(/nothing was written/)
  expect(existsSync(join(sprite, 'inputs.json'))).toBe(false)
})

it('reads selected expression/splash studies and isolates sprites across Umas, Humans and Elves', () => {
  const f = fixture(); f.prepare()
  const universe = universes.find(item => item.slug === 'high-fantasy')!
  for (const actor of f.actors) {
    const expressions = join(actor.folder, 'dialogue-portraits')
    f.put(join(expressions, 'active-study.json'), { activeVersion: 'v002' })
    f.put(join(expressions, 'v002/neutral.png'), png())
    f.put(join(expressions, 'v002/happy.png'), png(1))
    f.put(join(expressions, 'v002/manifest.json'), { assets: [{ outfit: 'village', base: 'neutral.png', outputs: [{ expression: 'happy', image: 'happy.png' }] }] })
    const splash = join(actor.folder, 'splash-art')
    f.put(join(splash, 'v001/scene.png'), png())
    f.put(join(splash, 'v001/manifest.json'), { assets: [{ id: 'scene-one', image: 'scene.png', title: actor.type + ' scene' }] })
    const subject = entries(f.mounts, universe, actor.type, 'character-sprites')[0]!
    f.put(join(subject.folder, 'v001/sprite.png'), png())
    f.put(join(subject.folder, 'v001/manifest.json'), { fullBodyAssets: [{ id: 'pose-one', image: 'sprite.png', title: actor.type + ' pose' }] })
    const baseURL = `/gallery/high-fantasy/${actor.type}/${actor.id}`
    const expressionsHTML = galleryPage(f.mounts, baseURL, new URLSearchParams('view=expressions'))!
    expect(expressionsHTML).toContain('dialogue-portraits/v002/neutral.png')
    expect(expressionsHTML).toContain('dialogue-portraits/v002/happy.png')
    const splashHTML = galleryPage(f.mounts, baseURL, new URLSearchParams('view=splash'))!
    expect(splashHTML).toContain(actor.type + ' scene')
    const spriteHTML = galleryPage(f.mounts, baseURL, new URLSearchParams('view=character-sprites'))!
    expect(spriteHTML).toContain('view=character-sprites" aria-current="page"')
    expect(spriteHTML).toContain(actor.type + ' pose')
    expect(spriteHTML).not.toContain('characters/actor-one/')
    if (actor.type !== 'lieutenants') expect(spriteHTML).toContain('Approved Quest base:')
    else expect(spriteHTML).toContain('An approved Quest base is needed')
  }
  const human = entries(f.mounts, universe, 'bosses')[0]!
  expect(library(f.mounts, universe, 'bosses').files(human)[0]?.status).toBe('Approved')
})

it('preserves authored section manifests, current pointers and approvals when refreshing preparation', () => {
  const f = fixture(), folder = join(f.actors[0].folder, 'dialogue-portraits')
  f.put(join(folder, 'active-study.json'), { activeVersion: 'v008', ownerApproved: true })
  f.put(join(folder, 'v008/manifest.json'), { assets: [{ id: 'owner-selection', marker: 'invented fixture' }] })
  const before = readFileSync(join(folder, 'v008/manifest.json'))
  f.prepare(); f.prepare()
  expect(readFileSync(join(folder, 'v008/manifest.json'))).toEqual(before)
  expect(f.read(join(folder, 'active-study.json'))).toEqual({ activeVersion: 'v008', ownerApproved: true })
  expect(existsSync(join(folder, 'v001/manifest.json'))).toBe(false)
})

it('refuses changed or private bases before writing any section', () => {
  const f = fixture()
  f.put(join(f.actors[1].folder, 'v003/native/base.png'), png(9))
  expect(() => f.prepare()).toThrow(/no album files were written/)
  expect(existsSync(join(f.actors[0].folder, 'dialogue-portraits'))).toBe(false)
  const g = fixture(), mf = join(g.actors[0].folder, 'v003/manifest.json'), manifest = g.read(mf)
  manifest.fullBodyAssets[0].image = 'owner-private/base.png'; g.put(mf, manifest)
  expect(() => g.prepare()).toThrow(/OWNER_ONLY_DIRECTORY/)
  expect(existsSync(join(g.actors[0].folder, 'dialogue-portraits'))).toBe(false)
})

it('keeps the same relative references when the content root is reached through a directory link', () => {
  const f = fixture(); f.prepare()
  const alias = join(f.root, 'linked-content')
  symlinkSync(f.work, alias, process.platform === 'win32' ? 'junction' : 'dir')
  expect(prepareQuestAlbums({ work: alias, check: true }).changedFiles).toBe(0)
})
