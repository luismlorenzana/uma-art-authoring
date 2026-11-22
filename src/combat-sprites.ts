import { createHash } from 'node:crypto'
import { readFileSync, realpathSync, statSync } from 'node:fs'
import { isAbsolute, relative, sep } from 'node:path'
import { fileFor } from './gallery-lib.js'

export const FACINGS = ['S', 'W', 'N', 'E'] as const
export const RIG_SLOTS = {
  core: 'core', leftArm: 'arm', rightArm: 'arm', legs: 'legs', visor: 'visor',
  leftHand: 'hand', rightHand: 'hand', back: 'back', coat: 'coat',
} as const

type Facing = typeof FACINGS[number]
type Slot = keyof typeof RIG_SLOTS
type Rig = Record<Slot, string | null>
type Point = [number, number]
type Rect = [number, number, number, number]
type Row = Record<string, unknown>
type Page = { file: string; sha256: string; bytes: number; width: number; height: number }
type Layer = { page: string; rect: Rect; at: Point; when?: { slot: Slot; part: string } }
type Frame = { layers: Layer[]; anchors: Record<string, Point> }
type Clip = { frames: { frame: string; ms: number }[]; loop: boolean; events: { frame: number; cue: string }[] }
type Track = { frames: Record<string, Frame>; clips: Record<string, Clip> }
type Fitting = { id: string; label: string; motion: string; rig: Rig; note?: string }

export interface SpriteBundle {
  schemaVersion: 1
  kind: 'combat-sprite-bundle'
  universe: 'cyberpunk'
  character: string
  outfit: number | string
  look: 'armor-helmet'
  version: string
  status: 'draft' | 'approved'
  cell: Point
  foot: Point
  figureHeight: number
  reviewHeight: number
  sources: { label: string; sha256: string }[]
  pages: Record<string, Page>
  motions: Record<string, Record<Facing, Track>>
  fittings: Fitting[]
}

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const version = /^v\d{3,6}$/
const hash = /^[a-f0-9]{64}$/
const path = /^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*\.png$/
const maxPageBytes = 12 * 1024 * 1024

function invalid(field: string): never { throw new Error(field + ': invalid combat sprite bundle value') }

function object(value: unknown, field: string, allowed?: readonly string[]): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(field)
  const row = value as Row
  if (allowed && Object.keys(row).some(key => !allowed.includes(key))) invalid(field)
  return row
}

function string(value: unknown, field: string, pattern?: RegExp): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 160 || (pattern && !pattern.test(value))) invalid(field)
  return value
}

function number(value: unknown, field: string, low: number, high: number, integer = true): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < low || value > high || (integer && !Number.isInteger(value))) invalid(field)
  return value
}

function bool(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') invalid(field)
  return value
}

function list<T>(value: unknown, field: string, min: number, max: number, parse: (v: unknown, field: string) => T): T[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) invalid(field)
  return value.map((v, i) => parse(v, field + '[' + i + ']'))
}

function point(value: unknown, field: string, width: number, height: number, integer = true): Point {
  const [x, y] = list(value, field, 2, 2, v => number(v, field, 0, Math.max(width, height), integer))
  return [number(x, field, 0, width, integer), number(y, field, 0, height, integer)]
}

function record<T>(value: unknown, field: string, min: number, max: number, parse: (v: unknown, field: string) => T): Record<string, T> {
  const entries = Object.entries(object(value, field))
  if (entries.length < min || entries.length > max) invalid(field)
  return Object.fromEntries(entries.map(([key, v]) => [
    string(key, field, slug), parse(v, field + '.' + key),
  ]))
}

function rigOf(value: unknown, field: string): Rig {
  const row = object(value, field, Object.keys(RIG_SLOTS))
  return Object.fromEntries(Object.entries(RIG_SLOTS).map(([slot, family]) => {
    const part = row[slot]
    if (part === null && ['leftHand', 'rightHand', 'back', 'coat'].includes(slot)) return [slot, null]
    const id = string(part, field + '.' + slot, slug)
    if (!id.startsWith(family + '-')) invalid(field + '.' + slot)
    return [slot, id]
  })) as Rig
}

function whenOf(value: unknown, field: string): NonNullable<Layer['when']> {
  const row = object(value, field, ['slot', 'part'])
  if (typeof row.slot !== 'string' || !Object.hasOwn(RIG_SLOTS, row.slot)) invalid(field + '.slot')
  const slot = row.slot as Slot
  const part = string(row.part, field + '.part', slug)
  if (!part.startsWith(RIG_SLOTS[slot] + '-')) invalid(field + '.part')
  return { slot, part }
}

/** The checked wire format shared by the gallery, bundle check command, and future release reader. */
export function parseSpriteBundle(value: unknown): SpriteBundle {
  const root = object(value, 'bundle', ['schemaVersion', 'kind', 'universe', 'character', 'outfit', 'look', 'version', 'status',
    'cell', 'foot', 'figureHeight', 'reviewHeight', 'sources', 'pages', 'motions', 'fittings'])
  if (root.schemaVersion !== 1 || root.kind !== 'combat-sprite-bundle' || root.universe !== 'cyberpunk' || root.look !== 'armor-helmet') invalid('bundle identity')
  if (root.status !== 'draft' && root.status !== 'approved') invalid('status')
  const cell = point(root.cell, 'cell', 1024, 1024)
  const [width, height] = cell
  if (!width || !height) invalid('cell')
  const foot = point(root.foot, 'foot', width - 1, height - 1)
  const figureHeight = number(root.figureHeight, 'figureHeight', 1, height)
  const reviewHeight = number(root.reviewHeight, 'reviewHeight', 40, 200)
  const sources = list(root.sources, 'sources', 1, 64, (value, field) => {
    const row = object(value, field, ['label', 'sha256'])
    return { label: string(row.label, field + '.label'), sha256: string(row.sha256, field + '.sha256', hash) }
  })
  const pages = record(root.pages, 'pages', 1, 96, (value, field) => {
    const row = object(value, field, ['file', 'sha256', 'bytes', 'width', 'height'])
    return {
      file: string(row.file, field + '.file', path), sha256: string(row.sha256, field + '.sha256', hash),
      bytes: number(row.bytes, field + '.bytes', 24, maxPageBytes),
      width: number(row.width, field + '.width', 1, 2048), height: number(row.height, field + '.height', 1, 2048),
    }
  })
  if (new Set(Object.values(pages).map(page => page.file)).size !== Object.keys(pages).length) invalid('pages: duplicate files')

  function readLayer(value: unknown, field: string): Layer {
    const row = object(value, field, ['page', 'rect', 'at', 'when'])
    const key = string(row.page, field + '.page', slug), page = pages[key]
    if (!page || !Object.hasOwn(pages, key)) invalid(field + '.page')
    const [x, y, w, h] = list(row.rect, field + '.rect', 4, 4, v => number(v, field + '.rect', 0, 2048))
    if (x === undefined || y === undefined || !w || !h || x + w > page.width || y + h > page.height || w > width || h > height) invalid(field + '.rect')
    const at = point(row.at, field + '.at', width - w, height - h)
    return { page: key, rect: [x, y, w, h], at, ...(row.when === undefined ? {} : { when: whenOf(row.when, field + '.when') }) }
  }

  function readTrack(value: unknown, field: string): Track {
    const track = object(value, field, ['frames', 'clips'])
    const frames = record(track.frames, field + '.frames', 1, 512, (value, name) => {
      const frame = object(value, name, ['layers', 'anchors'])
      const layers = list(frame.layers, name + '.layers', 1, 24, readLayer)
      const anchors = frame.anchors === undefined ? {} : record(frame.anchors, name + '.anchors', 0, 16,
        (v, f) => point(v, f, width, height, false))
      return { layers, anchors }
    })
    const clips = record(track.clips, field + '.clips', 1, 32, (value, name) => {
      const clip = object(value, name, ['frames', 'loop', 'events'])
      const cels = list(clip.frames, name + '.frames', 1, 160, (v, f) => {
        const row = object(v, f, ['frame', 'ms'])
        const frame = string(row.frame, f + '.frame', slug)
        if (!Object.hasOwn(frames, frame)) invalid(f + '.frame')
        return { frame, ms: number(row.ms, f + '.ms', 1, 5000, false) }
      })
      const events = clip.events === undefined ? [] : list(clip.events, name + '.events', 0, 24, (v, f) => {
        const row = object(v, f, ['frame', 'cue'])
        return { frame: number(row.frame, f + '.frame', 0, cels.length - 1), cue: string(row.cue, f + '.cue', slug) }
      })
      return { frames: cels, loop: bool(clip.loop, name + '.loop'), events }
    })
    for (const name of ['idle', 'walk', 'settle', 'attack']) if (!clips[name]) invalid(field + '.clips.' + name)
    return { frames, clips }
  }

  const motions = record(root.motions, 'motions', 1, 24, (value, field) => {
    const row = object(value, field, FACINGS)
    return Object.fromEntries(FACINGS.map(facing => [facing, readTrack(row[facing], field + '.' + facing)])) as Record<Facing, Track>
  })
  const fittings = list(root.fittings, 'fittings', 1, 64, (value, field) => {
    const row = object(value, field, ['id', 'label', 'motion', 'rig', 'note'])
    const motion = string(row.motion, field + '.motion', slug)
    if (!Object.hasOwn(motions, motion)) invalid(field + '.motion')
    const note = row.note === undefined ? undefined : string(row.note, field + '.note')
    return { id: string(row.id, field + '.id', slug), label: string(row.label, field + '.label'),
      motion, rig: rigOf(row.rig, field + '.rig'), ...(note ? { note } : {}) }
  })
  if (new Set(fittings.map(f => f.id)).size !== fittings.length ||
    new Set(fittings.map(f => JSON.stringify(f.rig))).size !== fittings.length) invalid('fittings: duplicate IDs or rigs')

  const usedPages = new Set<string>()
  for (const [motion, directions] of Object.entries(motions)) {
    const compatible = fittings.filter(fitting => fitting.motion === motion)
    if (!compatible.length) invalid('motions.' + motion + ': unused')
    for (const track of Object.values(directions)) for (const frame of Object.values(track.frames)) {
      for (const { when, page } of frame.layers) {
        usedPages.add(page)
        if (when && !compatible.some(fitting => fitting.rig[when.slot] === when.part)) invalid('motion layer: no fitting uses conditional part')
      }
      if (compatible.some(fitting => !frame.layers.some(layer => !layer.when || fitting.rig[layer.when.slot] === layer.when.part))) {
        invalid('motion frame: no visible layers for fitting')
      }
    }
  }
  if (usedPages.size !== Object.keys(pages).length) invalid('pages: unreferenced texture')
  const outfit = typeof root.outfit === 'string' ? string(root.outfit, 'outfit', slug) : number(root.outfit, 'outfit', 1, Number.MAX_SAFE_INTEGER)
  return {
    schemaVersion: 1, kind: root.kind, universe: root.universe, look: root.look, status: root.status,
    character: string(root.character, 'character', slug), outfit, version: string(root.version, 'version', version),
    cell, foot, figureHeight, reviewHeight, sources, pages, motions, fittings,
  }
}

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

export function readSpriteBundle(folder: string): SpriteBundle {
  const file = fileFor(folder, '/bundle.json')
  if (!file) throw new Error('Missing bundle.json')
  if (statSync(file).size > 8 * 1024 * 1024) throw new Error('Sprite bundle manifest exceeds 8 MiB')
  const bundle = parseSpriteBundle(JSON.parse(readFileSync(file, 'utf8')))
  for (const page of Object.values(bundle.pages)) {
    const texture = fileFor(folder, '/' + page.file)
    if (!texture || statSync(texture).size !== page.bytes) throw new Error('Missing or changed texture: ' + page.file)
    const bytes = readFileSync(texture)
    if (!bytes.subarray(0, 8).equals(pngSignature) || bytes.toString('ascii', 12, 16) !== 'IHDR' ||
      bytes.readUInt32BE(16) !== page.width || bytes.readUInt32BE(20) !== page.height ||
      createHash('sha256').update(bytes).digest('hex') !== page.sha256) {
      throw new Error('Texture dimensions or hash mismatch: ' + page.file)
    }
  }
  return bundle
}

export function spriteAlbum(work: string, folder: string, character: string) {
  const pointer = fileFor(folder, '/active-bundle.json')
  if (!pointer) return null
  let selected: string
  try {
    const row = object(JSON.parse(readFileSync(pointer, 'utf8')), 'active-bundle', ['schemaVersion', 'version'])
    if (row.schemaVersion !== 1) invalid('active-bundle schemaVersion')
    selected = string(row.version, 'active-bundle version', version)
  } catch { throw new Error('Invalid active-bundle.json') }
  const manifest = fileFor(folder, '/' + selected + '/bundle.json')
  if (!manifest) throw new Error('Selected bundle.json is missing')
  const bundle = readSpriteBundle(folder + sep + selected)
  if (bundle.character !== character || bundle.version !== selected) throw new Error('Bundle belongs to a different character or revision')
  const urls = Object.fromEntries(Object.entries(bundle.pages).map(([key, page]) => {
    const file = fileFor(folder, '/' + selected + '/' + page.file)!
    const relativePath = relative(realpathSync(work), file)
    if (!relativePath || isAbsolute(relativePath) || relativePath.split(sep).includes('..')) throw new Error('Texture is outside the Art workspace')
    const parts = relativePath.split(sep).map(encodeURIComponent)
    return [key, '/_gallery/media/work/' + parts.join('/')]
  }))
  return { bundle, urls }
}
