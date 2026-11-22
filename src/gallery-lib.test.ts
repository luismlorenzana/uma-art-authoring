import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { entries, library, mediaFile, universes, type Mounts } from './gallery-data.js'
import { galleryPage } from './gallery-pages.js'
import { fileFor, typeOf } from './gallery-lib.js'
import { farmCategories } from './art-categories.js'

const folders: string[] = []
const blank = new URLSearchParams()
afterEach(() => { for (const dir of folders.splice(0)) rmSync(dir, { recursive: true, force: true }) })

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'gallery-'))
  folders.push(root)
  const mounts: Mounts = { work: join(root, 'work'), art: join(root, 'art'), enemy: join(root, 'enemy') }
  const put = (path: string, value: string | object = 'invented image fixture') => {
    const file = join(root, path)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value))
  }
  put('work/farm-life/cast/roster.json', { characters: [
    { name: 'Zoe & Vale', tier: 'T1', record: '../characters/zoe-vale/character.json' },
    { name: 'Amber Reed', tier: 'T2', record: '../characters/amber-reed/character.json' },
  ] })
  for (const key of ['zoe-vale', 'amber-reed']) {
    put(`work/farm-life/characters/${key}/character.json`, { references: [{ kind: 'art', file: 'references/art.webp' }] })
    put(`work/farm-life/characters/${key}/references/art.webp`)
  }
  return { mounts, put }
}

it('keeps the ranked order, with the first authored look on the card and an image-only fallback', () => {
  const { mounts, put } = fixture()
  put('work/farm-life/characters/zoe-vale/v001/full-body/first.png')
  const list = galleryPage(mounts, '/gallery/farm-life/characters', blank)!
  expect(list.indexOf('Zoe &amp; Vale')).toBeLessThan(list.indexOf('Amber Reed'))
  expect(list).toContain('full-body/first.png')
  expect(list).toContain('amber-reed/references/art.webp')
  expect(list).not.toContain('zoe-vale/references/art.webp')
  expect(list).not.toContain('Opposes')
})

it('scopes Weapons and Combat Sprites by enemy album and unit ID', () => {
  const { mounts, put } = fixture()
  const roles = [
    ['bosses', 'enemies', 'unit-one'],
    ['boss-allies', 'enemies/casual', 'unit-one'],
    ['lieutenants', 'enemies/lieutenants', 'unit-two'],
  ] as const
  for (const [type, folder, id] of roles) {
    put(`work/cyberpunk/${folder}/cast/tier-1/01-rider/common-name/character.json`, {
      id, name: 'Common Name', uma: { name: 'Rider One' },
    })
    for (const category of ['weapons', 'combat-sprites']) {
      const work = `work/cyberpunk/${folder}/categories/${category}/characters/${id}/v001`
      put(work + '/manifest.json', { fullBodyAssets: [{ id: 'first', outfit: 'first', image: type + '-' + category + '.png' }] })
      put(work + '/' + type + '-' + category + '.png')
      const html = galleryPage(mounts, `/gallery/cyberpunk/${type}/${id}`, new URLSearchParams('view=' + category))!
      expect(html).toContain(`view=${category}" aria-current="page"`)
      expect(html).toContain(type + '-' + category + '.png')
      expect(html.match(/<nav class="tabs"[\s\S]*?<\/nav>/)?.[0].match(/<a /g)).toHaveLength(5)
      const ordinary = galleryPage(mounts, `/gallery/cyberpunk/${type}/${id}`, blank)!
      expect(ordinary).not.toContain(type + '-' + category + '.png')
    }
  }
  const ally = galleryPage(mounts, '/gallery/cyberpunk/boss-allies/unit-one', new URLSearchParams('view=weapons'))!
  expect(ally).not.toContain('bosses-weapons.png')
  expect(ally).not.toContain('lieutenants-weapons.png')
})

it('adds Weapons and Combat Sprites to Cyberpunk crew albums with independent content', () => {
  const { mounts, put } = fixture()
  put('work/cyberpunk/cast/roster.json', { characters: [
    { name: 'Rider One', tier: 'T1', record: '../characters/rider-one/character.json' },
  ] })
  const path = '/gallery/cyberpunk/characters/rider-one'
  const base = 'work/cyberpunk/categories/'
  put(base + 'weapons/characters/rider-one/v001/manifest.json', {
    fullBodyAssets: [{ id: 'sword', outfit: 'blade', image: 'weapon.png' }],
  })
  put(base + 'weapons/characters/rider-one/v001/weapon.png')
  put(base + 'combat-sprites/approved/manifest.json', {
    assets: [{ character: 'Rider One', id: 'idle', outfit: 'armor', image: 'idle.png', approval: { status: 'approved' } }],
  })
  put(base + 'combat-sprites/approved/idle.png')
  const weapons = galleryPage(mounts, path, new URLSearchParams('view=weapons'))!
  expect(weapons).toContain('?view=weapons" aria-current="page">Weapons</a>')
  expect(weapons).toContain('weapon.png')
  expect(weapons).not.toContain('idle.png')
  expect(weapons.match(/<nav class="tabs"[\s\S]*?<\/nav>/)?.[0].match(/<a /g)).toHaveLength(6)
  const sprites = galleryPage(mounts, path, new URLSearchParams('view=combat-sprites'))!
  expect(sprites).toContain('?view=combat-sprites" aria-current="page">Combat Sprites</a>')
  expect(sprites).toContain('idle.png')
  expect(sprites).not.toContain('weapon.png')
  expect(galleryPage(mounts, '/gallery/cyberpunk', blank)).not.toContain('>Weapons<')
  expect(galleryPage(mounts, '/gallery/farm-life/characters/zoe-vale', blank)).not.toContain('?view=weapons')
})

it('puts the four additional collections in each Farm character album and keeps their art separate', () => {
  const { mounts, put } = fixture()
  const farm = galleryPage(mounts, '/gallery/farm-life', blank)!
  for (const [key, category] of Object.entries(farmCategories)) {
    if (key === 'duo-splash') continue // Shared pairs use their own roster and manifests.
    expect(farm).not.toContain(category.label)
    for (const character of ['zoe-vale', 'amber-reed']) {
      const page = galleryPage(mounts, '/gallery/farm-life/characters/' + character, new URLSearchParams('view=' + key))!
      expect(page).toContain(`?view=${key}" aria-current="page">${category.label}</a>`)
      expect(page.match(/<nav class="tabs"[\s\S]*?<\/nav>/)?.[0].match(/<a /g)).toHaveLength(8)
      expect(page).toContain('No art in this collection yet.')
    }
  }
  put('work/farm-life/categories/pajama-outfits/characters/zoe-vale/v001/manifest.json', {
    fullBodyAssets: [
      { id: 'one', outfit: 'pajamas', image: 'one.png' },
      { id: 'two', outfit: 'pajamas', image: 'two.png' },
    ],
  })
  for (const key of ['one', 'two']) put('work/farm-life/categories/pajama-outfits/characters/zoe-vale/v001/' + key + '.png')
  put('art/universes/farm-life/index.json', { looks: [
    { id: 'anniversary', character: 'Zoe & Vale', category: 'wedding-anniversary-splash', kind: 'splash', path: 'images/anniversary.png' },
  ] })
  put('art/universes/farm-life/images/anniversary.png')
  const outfit = galleryPage(mounts, '/gallery/farm-life/characters/zoe-vale', new URLSearchParams('view=pajama-outfits'))!
  expect(outfit).toContain('one.png')
  expect(outfit).toContain('two.png')
  expect(outfit).not.toContain('anniversary.png')
  const extra = galleryPage(mounts, '/gallery/farm-life/characters/zoe-vale', new URLSearchParams('view=wedding-anniversary-splash'))!
  expect(extra).toContain('images/anniversary.png')
  expect(extra).not.toContain('one.png')
  expect(galleryPage(mounts, '/gallery/farm-life/characters/zoe-vale', new URLSearchParams('view=splash'))).not.toContain('anniversary.png')
  expect(galleryPage(mounts, '/gallery/cyberpunk/pajama-outfits', blank)).toBeNull()
})

it('uses one album route for outfits, layered facial expressions, and splash art', () => {
  const { mounts, put } = fixture()
  const path = '/gallery/farm-life/characters/zoe-vale'
  put('work/farm-life/approved/look.png')
  put('work/farm-life/approved/manifest.json', { assets: [{ character: 'Zoe & Vale', outfit: 'spring', image: 'look.png', approval: { status: 'approved' } }] })
  put('work/farm-life/dialogue-portraits/base.png')
  put('work/farm-life/dialogue-portraits/face.png')
  put('work/farm-life/dialogue-portraits/manifest.json', { assets: [{ character: 'zoe-vale', outfit: 'spring', base: 'base.png', position: { x: 2, y: 3 }, outputs: [{ expression: 'happy', face: 'face.png' }] }] })
  put('work/farm-life/splash-art/manifest.json', { assets: [{ scene: 'first-meeting', character: 'Zoe & Vale', image: 'local.png', sha256: 'same-bytes' }] })
  put('work/farm-life/splash-art/local.png')
  put('art/universes/farm-life/index.json', { looks: [
    { kind: 'splash', id: 'duplicate', character: 'Zoe & Vale', path: 'images/copy.png', sha256: 'same-bytes' },
    { kind: 'splash', id: 'scene', character: 'Zoe & Vale', path: 'images/scene.png' },
  ] })
  put('art/universes/farm-life/images/copy.png')
  put('art/universes/farm-life/images/scene.png')
  const album = galleryPage(mounts, path, blank)!
  expect(album).toContain('Character Art')
  expect(album).toContain('Facial Expressions')
  expect(album).toContain('Splash Art')
  expect(album).toContain('approved/look.png')
  expect(album).toContain('Open full-body baseline')
  const portraits = galleryPage(mounts, path, new URLSearchParams('view=expressions'))!
  expect(portraits).toContain('"label":"Happy","image":"","face"')
  expect(portraits).toContain('"at":{"x":2,"y":3}')
  const splash = galleryPage(mounts, path, new URLSearchParams('view=splash'))!
  expect(splash).toContain('images/scene.png')
  expect(splash).toContain('splash-art/local.png')
  expect(splash).not.toContain('images/copy.png')
  expect(splash).not.toContain('approved/look.png')
})

it('finds published expressions by her name when the portrait index keys her differently from the roster', () => {
  const { mounts, put } = fixture()
  const universe = universes.find(({ slug }) => slug === 'farm-life')!
  put('art/universes/farm-life/portraits/index.json', {
    characters: [{ id: 'zoe-and-vale', name: 'Zoe & Vale' }, { id: 'amber-reed', name: 'Amber Reed' }, { id: 'zoe', name: 'Zoe' }],
    bases: [
      { id: 'zoe-and-vale-spring', character: 'zoe-and-vale', outfit: 'spring', path: 'bases/zoe-spring.png' },
      { id: 'amber-reed-spring', character: 'amber-reed', outfit: 'spring', path: 'bases/amber-spring.png' },
      { id: 'zoe-summer', character: 'zoe', outfit: 'summer', path: 'bases/other-summer.png' },
    ],
    faces: [{ id: 'zoe-and-vale-happy', character: 'zoe-and-vale', expression: 'happy', path: 'faces/zoe-happy.png' }],
    states: [
      { character: 'zoe-and-vale', outfit: 'spring', expression: 'neutral', base: 'zoe-and-vale-spring', face: null, at: null },
      { character: 'zoe-and-vale', outfit: 'spring', expression: 'happy', base: 'zoe-and-vale-spring', face: 'zoe-and-vale-happy', at: { x: 4, y: 5 } },
      { character: 'amber-reed', outfit: 'spring', expression: 'neutral', base: 'amber-reed-spring', face: null, at: null },
    ],
  })
  for (const file of ['bases/zoe-spring.png', 'bases/amber-spring.png', 'bases/other-summer.png', 'faces/zoe-happy.png']) put(`art/universes/farm-life/portraits/${file}`)
  const [zoe, amber] = entries(mounts, universe, 'characters')
  const lib = library(mounts, universe, 'characters')
  const hers = lib.portraits(zoe!)
  expect(hers.map(({ label }) => label)).toEqual(['Spring'])
  expect(hers[0]!.base).toContain('bases/zoe-spring.png')
  expect(hers[0]!.states.map(({ label }) => label)).toEqual(['Neutral', 'Happy'])
  expect(hers[0]!.states[1]).toMatchObject({ at: { x: 4, y: 5 } })
  expect(lib.portraits(amber!).map(({ base }) => base.split('/').at(-1))).toEqual(['amber-spring.png'])
})

it('keeps boss enemy and ally looks separate and distinguishes enemies with the same name', () => {
  const { mounts, put } = fixture()
  for (const [dir, id] of [['enemies', 'unit-one'], ['enemies/casual', 'unit-one'], ['enemies/lieutenants', 'unit-two']]) {
    put(`work/cyberpunk/${dir}/cast/tier-1/01-captain/common-name/character.json`, { id, name: 'Common Name', uma: { name: 'Captain' } })
  }
  put('work/cyberpunk/enemies/approved/manifest.json', { assets: [{ unitId: 'unit-one', character: 'Common Name', look: 'armor', image: 'boss.png' }] })
  put('work/cyberpunk/enemies/approved/boss.png')
  put('work/cyberpunk/enemies/casual/approved/manifest.json', { assets: [{ unitId: 'unit-one', look: 'everyday', image: 'ally.png' }] })
  put('work/cyberpunk/enemies/casual/approved/ally.png')
  put('enemy/cyberpunk/index.json', { looks: [
    { unitId: 'unit-one', look: 'pilot', path: 'pilot.png', kind: 'base' },
    { unitId: 'unit-one', look: 'jacket', path: 'jacket.png', kind: 'casual' },
  ] })
  put('enemy/cyberpunk/pilot.png')
  put('enemy/cyberpunk/jacket.png')
  const universe = universes[2]
  const bosses = entries(mounts, universe, 'bosses')
  const allies = entries(mounts, universe, 'boss-allies')
  const lieutenants = entries(mounts, universe, 'lieutenants')
  expect(bosses.map(({ id }) => id)).toEqual(['unit-one'])
  expect(allies.map(({ id }) => id)).toEqual(['unit-one'])
  expect(lieutenants.map(({ id }) => id)).toEqual(['unit-two'])
  expect(library(mounts, universe, 'bosses').files(bosses[0]!).map(({ url }) => url.split('/').at(-1))).toEqual(['boss.png', 'pilot.png'])
  expect(library(mounts, universe, 'boss-allies').files(allies[0]!).map(({ url }) => url.split('/').at(-1))).toEqual(['ally.png', 'pilot.png', 'jacket.png'])
  expect(library(mounts, universe, 'lieutenants').files(lieutenants[0]!)).toEqual([])
})

it('keeps raw media routes inside the configured root and excludes manifests from image routes', () => {
  const { mounts, put } = fixture()
  put('work/farm-life/approved/photo with spaces.png')
  expect(fileFor(mounts.work, '/farm-life/approved/photo%20with%20spaces.png')).toMatch(/photo with spaces\.png$/)
  expect(fileFor(mounts.work, '/%2e%2e/file.png')).toBeNull()
  expect(fileFor(mounts.work, '/%ZZ')).toBeNull()
  expect(mediaFile(mounts.work, ['farm-life', 'cast', 'roster.json'])).toBeNull()
  expect(mediaFile(mounts.work, ['..', 'elsewhere.png'])).toBeNull()
  expect(typeOf('file.mjs')).toBe('text/javascript; charset=utf-8')
})
