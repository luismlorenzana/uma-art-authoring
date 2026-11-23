import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { galleryPage } from './gallery-pages.js'
import type { Mounts } from './gallery-data.js'
import { readCollection } from './lib.js'
import { originalCharacterFolder, originalEntry, originalFolder, originalPortraits, originalStudy, originalTabs, originalWorks, prepareOriginalCollection, readOriginalCollection, validateOriginalCollection, type OriginalCollection } from './original-casts.js'

const temporary: string[] = []
afterEach(() => { for (const folder of temporary.splice(0)) rmSync(folder, { recursive: true, force: true }) })
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'original-art-')); temporary.push(root)
  const mounts: Mounts = { work: join(root, 'work'), art: join(root, 'art'), enemy: join(root, 'enemy') }
  const collection: OriginalCollection = {
    schemaVersion: 1, kind: 'original-character-collection', id: 'invented-cast', title: 'Invented People', subtitle: 'Original hierarchy',
    ranks: [
      { id: 'rulers', label: 'Rulers', singular: 'Ruler', expectedCount: 1 },
      { id: 'captains', label: 'Captains', singular: 'Captain', expectedCount: 1, parentRank: 'rulers', membersPerParent: 1 },
      { id: 'retainers', label: 'Retainers', singular: 'Retainer', expectedCount: 1, parentRank: 'captains', membersPerParent: 1 },
      { id: 'ancestors', label: 'Ancestors', singular: 'Ancestor', expectedCount: 1 },
    ],
    courts: [{ id: 'day', title: 'Day Court' }, { id: 'old', title: 'Old Court', ancestral: true }],
    characters: [
      { id: 'ruler-one', name: 'Ruler One', rank: 'rulers', court: 'day', adult: true },
      { id: 'captain-one', name: 'Captain One', rank: 'captains', court: 'day', serves: 'ruler-one', adult: true },
      { id: 'retainer-one', name: 'Retainer One', rank: 'retainers', court: 'day', serves: 'captain-one', adult: true },
      { id: 'ancestor-one', name: 'Ancestor One', rank: 'ancestors', court: 'old', adult: true },
    ],
  }
  const folder = originalFolder(mounts.work, 'cyberpunk', collection.id)
  function put(path: string, value: unknown) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, typeof value === 'string' ? value : JSON.stringify(value)) }
  put(join(folder, 'collection.json'), collection)
  return { root, mounts, collection, folder, put }
}

it('validates the declared rank counts and court-specific serving hierarchy without a ranked cast', () => {
  const { collection, folder } = fixture()
  expect(readOriginalCollection(folder).characters).toHaveLength(4)
  const changed = structuredClone(collection)
  changed.characters[2]!.serves = 'ruler-one'
  expect(() => validateOriginalCollection(changed)).toThrow(/hierarchy|serving/)
  changed.characters[2]!.serves = 'captain-one'
  changed.characters[2]!.court = 'old'
  expect(() => validateOriginalCollection(changed)).toThrow(/court/)
  changed.characters[2]!.court = 'day'
  changed.ranks[1]!.expectedCount = 2
  expect(() => validateOriginalCollection(changed)).toThrow(/count/)
  changed.ranks[1]!.expectedCount = 1
  changed.characters[3]!.id = '../outside'
  expect(() => validateOriginalCollection(changed)).toThrow(/safe/)
  expect(() => originalFolder('/work', 'cyberpunk', '../escape')).toThrow(/path/)
})

it('prepares original references and five pending album sections while preserving authored files', () => {
  const { collection, folder, put } = fixture()
  expect(() => prepareOriginalCollection(folder, collection, { check: true })).toThrow(/missing/)
  expect(existsSync(join(folder, 'rulers'))).toBe(false)
  expect(prepareOriginalCollection(folder, collection, { dryRun: true }).files).toBeGreaterThan(0)
  expect(existsSync(join(folder, 'rulers'))).toBe(false)
  prepareOriginalCollection(folder, collection)
  const own = originalCharacterFolder(folder, collection.characters[0]!)
  const identity = JSON.parse(readFileSync(join(own, 'character.json'), 'utf8'))
  expect(identity).toMatchObject({ id: 'original-invented-cast-ruler-one', adult: true, references: [] })
  expect(readdirSync(join(own, 'references'))).toEqual(['README.md'])
  for (const tab of Object.keys(originalTabs) as (keyof typeof originalTabs)[]) {
    const study = originalStudy(own, tab)
    expect(study.active).toMatchObject({ activeVersion: 'v001', ownerApproved: false })
    expect(readdirSync(study.versionDir)).toEqual(['manifest.json'])
  }
  put(join(own, 'brief.md'), 'Owner-authored brief')
  put(join(own, 'active-study.json'), { activeVersion: 'v002', ownerApproved: true })
  expect(prepareOriginalCollection(folder, collection).files).toBe(0)
  expect(readFileSync(join(own, 'brief.md'), 'utf8')).toBe('Owner-authored brief')
  expect(originalStudy(own, 'art').active.activeVersion).toBe('v002')
  expect(prepareOriginalCollection(folder, collection, { check: true }).files).toBe(0)
  put(join(own, 'character.json'), { ...identity, court: 'old' })
  expect(() => prepareOriginalCollection(folder, collection)).toThrow(/identity differs/)
  put(join(own, 'character.json'), '{broken')
  expect(() => prepareOriginalCollection(folder, collection, { check: true })).toThrow(/identity differs/)
})

it('adds an independent rank/court gallery with no baseline or published-franchise fallback', () => {
  const { mounts, collection, folder, put } = fixture()
  prepareOriginalCollection(folder, collection)
  // A legacy character deliberately shares the original ruler's display name.
  put(join(mounts.work, 'cyberpunk/cast/roster.json'), { characters: [{ name: 'Ruler One', record: '../characters/ruler-one/character.json' }] })
  put(join(mounts.work, 'cyberpunk/characters/ruler-one/character.json'), { references: [{ kind: 'art', file: 'references/legacy.webp' }] })
  put(join(mounts.work, 'cyberpunk/characters/ruler-one/references/legacy.webp'), 'invented legacy reference')
  put(join(mounts.art, 'universes/cyberpunk/index.json'), { looks: [{ character: 'Ruler One', path: 'images/legacy.png' }] })
  put(join(mounts.art, 'universes/cyberpunk/images/legacy.png'), 'invented legacy art')
  const base = '/gallery/cyberpunk/originals/invented-cast'
  expect(galleryPage(mounts, '/gallery/cyberpunk', new URLSearchParams())).toContain('Invented People')
  expect(galleryPage(mounts, base, new URLSearchParams())).toContain('Ancestors')
  const list = galleryPage(mounts, base + '/rulers', new URLSearchParams())!
  expect(list).toContain('Day Court')
  expect(list).toContain('Not authored yet')
  expect(list).not.toContain('legacy.webp')
  expect(list).not.toContain('legacy.png')
  const page = galleryPage(mounts, base + '/captains/captain-one', new URLSearchParams())!
  expect(page).toContain('Serves <a href="' + base + '/rulers/ruler-one">Ruler One</a>')
  for (const label of Object.values(originalTabs)) expect(page).toContain(label)
  expect(page).not.toContain('Duo Splash Art')
  expect(page).not.toContain('legacy.webp')
  expect(galleryPage(mounts, base + '/rulers/ruler-one/extra', new URLSearchParams())).toBeNull()
})

it('reviews only a character’s own manifest images and composes her original expression recipe', () => {
  const { mounts, collection, folder, put } = fixture()
  prepareOriginalCollection(folder, collection)
  const character = collection.characters[0]!, own = originalCharacterFolder(folder, character)
  put(join(own, 'v001/body.png'), 'invented body')
  put(join(own, '../../../../elsewhere.png'), 'invented outside image')
  put(join(own, 'v001/manifest.json'), { fullBodyAssets: [{ id: 'body', image: 'body.png', title: '<script>bad</script>', approval: { status: 'approved', by: 'owner' } }, { id: 'escape', image: '../../../../elsewhere.png' }] })
  expect(originalWorks(mounts, own, 'art')).toHaveLength(1)
  const page = galleryPage(mounts, '/gallery/cyberpunk/originals/invented-cast/rulers/ruler-one', new URLSearchParams())!
  expect(page).toContain('&lt;script&gt;bad&lt;/script&gt;')
  expect(page).not.toContain('<script>bad</script>')
  const faces = originalStudy(own, 'expressions').versionDir
  put(join(faces, 'base.png'), 'invented base')
  put(join(faces, 'face.png'), 'invented face')
  put(join(faces, 'manifest.json'), { assets: [{ outfit: 'first', base: 'base.png', position: { x: 1, y: 2 }, outputs: [{ expression: 'calm', face: 'face.png' }] }] })
  expect(originalPortraits(mounts, own)[0]!.states).toHaveLength(2)
  const expressions = galleryPage(mounts, '/gallery/cyberpunk/originals/invented-cast/rulers/ruler-one', new URLSearchParams('view=expressions'))!
  expect(expressions).toContain('id="portrait-data"')
  expect(originalEntry(folder, collection, character).id).toBe('original-invented-cast-ruler-one')
  put(join(mounts.work, 'cyberpunk/approved/manifest.json'), { assets: [] })
  expect(readCollection('cyberpunk', join(mounts.work, 'cyberpunk/approved')).looks).toEqual([])
})
