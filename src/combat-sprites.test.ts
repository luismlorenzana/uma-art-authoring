import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { FACINGS, parseSpriteBundle } from './combat-sprites.js'
import { galleryPage } from './gallery-pages.js'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jCioAAAAASUVORK5CYII=', 'base64')
const sha256 = createHash('sha256').update(png).digest('hex')
const folders: string[] = []
afterEach(() => { for (const dir of folders.splice(0)) rmSync(dir, { recursive: true, force: true }) })

function bundleFixture() {
  const single = { frames: [{ frame: 'carry', ms: 200 }], loop: false }
  const base = { page: 'base', rect: [0, 0, 1, 1], at: [4, 4] }
  const track = { frames: { carry: { layers: [base, { ...base, page: 'pack', when: { slot: 'back', part: 'back-med' } }], anchors: { 'primary-grip': [4, 4] } } },
    clips: { idle: single, walk: single, settle: single, attack: { ...single, events: [{ frame: 0, cue: 'impact' }] } } }
  const rig = { core: 'core-frame', leftArm: 'arm-standard', rightArm: 'arm-standard', legs: 'legs-standard',
    visor: 'visor-basic', leftHand: null, rightHand: 'hand-rifle', back: 'back-med', coat: null }
  const page = { width: 1, height: 1, bytes: png.length, sha256 }
  return {
    schemaVersion: 1, kind: 'combat-sprite-bundle', universe: 'cyberpunk', character: 'synthetic-actor',
    outfit: 9000001, look: 'armor-helmet', version: 'v001', status: 'draft',
    cell: [60, 60], foot: [30, 55], figureHeight: 50, reviewHeight: 100, sources: [{ label: 'Synthetic source', sha256 }],
    pages: { base: { ...page, file: 'pages/base.png' }, pack: { ...page, file: 'pages/pack.png' } },
    motions: { rifle: Object.fromEntries(FACINGS.map(facing => [facing, structuredClone(track)])) },
    fittings: [{ id: 'rifle-med', label: 'Rifle + Med', motion: 'rifle', rig }],
  }
}

it('keeps exact fitted IDs and authored depth order, rejecting invalid bounds, unbound layers and events', () => {
  const source = bundleFixture()
  expect(parseSpriteBundle(source).motions.rifle?.N.frames.carry?.layers.map(layer => layer.page)).toEqual(['base', 'pack'])

  const outOfBounds = bundleFixture()
  outOfBounds.motions.rifle.N!.frames.carry.layers[0]!.rect[2] = 2
  expect(() => parseSpriteBundle(outOfBounds)).toThrow(/rect/)

  const wrongSlot = bundleFixture()
  wrongSlot.fittings[0]!.rig.back = 'back-bulwark'
  expect(() => parseSpriteBundle(wrongSlot)).toThrow(/conditional part/)

  const badEvent = bundleFixture()
  badEvent.motions.rifle.N!.clips.attack.events[0]!.frame = 1
  expect(() => parseSpriteBundle(badEvent)).toThrow(/events/)

  const repeatedRig = bundleFixture()
  repeatedRig.fittings.push({ ...repeatedRig.fittings[0]!, id: 'another-name' })
  expect(() => parseSpriteBundle(repeatedRig)).toThrow(/duplicate IDs or rigs/)
})

it('plays the selected bundle in its Cyberpunk album and surfaces a damaged page without loading it', () => {
  const work = mkdtempSync(join(tmpdir(), 'combat-sprite-gallery-'))
  folders.push(work)
  const bundle = bundleFixture()
  function put(path: string, value: Buffer | object) {
    const file = join(work, 'cyberpunk', path)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, Buffer.isBuffer(value) ? value : JSON.stringify(value))
  }
  const root = 'categories/combat-sprites/characters/synthetic-actor'
  put('cast/roster.json', { characters: [{ name: 'Synthetic Actor', tier: 'T1', record: '../characters/synthetic-actor/character.json' }] })
  put(root + '/active-bundle.json', { schemaVersion: 1, version: 'v001' })
  put(root + '/v001/bundle.json', bundle)
  put(root + '/v001/pages/base.png', png)
  put(root + '/v001/pages/pack.png', png)
  const album = () => galleryPage({ work, art: work, enemy: work }, '/gallery/cyberpunk/characters/synthetic-actor', new URLSearchParams('view=combat-sprites'))
  expect(album()).toContain('data-sprite-version="v001"')
  expect(album()).toContain('Rifle + Med')
  expect(album()).toContain('/_gallery/media/work/cyberpunk/' + root + '/v001/pages/pack.png')
  const corrupt = Buffer.from(png)
  corrupt[corrupt.length - 1] = corrupt[corrupt.length - 1]! ^ 1
  put(root + '/v001/pages/pack.png', corrupt)
  expect(album()).toContain('Texture dimensions or hash mismatch')
  expect(album()).not.toContain('id="combat-sprite-data"')
})
