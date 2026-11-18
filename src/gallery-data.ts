import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { keyOf } from './lib.js'
import { categoryFolder, farmCategories, isArtCategory } from './art-categories.js'

export const universes = [
  { slug: 'high-fantasy', title: 'Uma Quest', accent: 'quest' },
  { slug: 'farm-life', title: 'Uma Farm', accent: 'farm' },
  { slug: 'cyberpunk', title: 'Uma Cyberpunk', accent: 'cyberpunk' },
] as const

export const artTypes = {
  characters: { singular: 'Character', label: 'Characters', folder: ['characters'] },
  bosses: { singular: 'Boss Enemy', label: 'Boss Enemy', folder: ['enemies'] },
  'boss-allies': { singular: 'Boss Ally', label: 'Boss Ally', folder: ['enemies', 'casual'] },
  lieutenants: { singular: 'Lieutenant', label: 'Lieutenants', folder: ['enemies', 'lieutenants'] },
  'pajama-outfits': { singular: 'Character', label: farmCategories['pajama-outfits'].label, folder: ['categories', 'pajama-outfits'] },
  'wedding-anniversary-outfits': { singular: 'Character', label: farmCategories['wedding-anniversary-outfits'].label, folder: ['categories', 'wedding-anniversary-outfits'] },
  'pajama-splash': { singular: 'Character', label: farmCategories['pajama-splash'].label, folder: ['categories', 'pajama-splash'] },
  'wedding-anniversary-splash': { singular: 'Character', label: farmCategories['wedding-anniversary-splash'].label, folder: ['categories', 'wedding-anniversary-splash'] },
} as const

export type Universe = typeof universes[number]
export type ArtType = keyof typeof artTypes
export type Mounts = Record<'work' | 'art' | 'enemy', string>
type Row = Record<string, unknown>

export interface Entry {
  id: string
  name: string
  key: string
  folder: string
  referenceFolder?: string
  tier: string
  opponent?: string
}

export interface Work {
  label: string
  url: string
  status: 'Approved' | 'In progress' | 'Published'
}

interface Location { mount: keyof Mounts; dir: string }

export interface PortraitState {
  label: string
  image?: string
  face?: string
  at?: { x: number; y: number }
}

export interface Portrait {
  label: string
  base: string
  states: PortraitState[]
}

const imageFile = /\.(?:png|webp|jpe?g|avif)$/i
const slug = /^[a-z0-9][a-z0-9-]*$/
const row = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.map(row) : []
const str = (value: unknown) => typeof value === 'string' ? value : ''
const title = (value: string) => value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

function doc(path: string): Row {
  try { return row(JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))) }
  catch { return {} }
}

function children(path: string) {
  try { return readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true })) }
  catch { return [] }
}

function contained(base: string, destination: string) {
  const path = relative(base, destination)
  return path && !isAbsolute(path) && path !== '..' && !path.startsWith('..' + sep)
}

/** Resolve both the spelling and the real file before serving it. */
export function mediaFile(base: string, parts: string[]): string | null {
  if (!parts.length || parts.some((part) => !part || part.startsWith('.') || /[/\\:\0]/.test(part))) return null
  const target = resolve(base, ...parts)
  if (!imageFile.test(target)) return null
  try {
    const actual = realpathSync(target)
    return contained(realpathSync(base), actual) && statSync(actual).isFile() ? actual : null
  } catch { return null }
}

function image(mounts: Mounts, location: Location, file: unknown) {
  if (typeof file !== 'string' || !file || isAbsolute(file) || file.includes(':')) return ''
  const root = mounts[location.mount]
  const parts = relative(root, resolve(location.dir, file)).split(sep)
  return mediaFile(root, parts) ? `/_gallery/media/${location.mount}/${parts.map(encodeURIComponent).join('/')}` : ''
}

export function entries(mounts: Mounts, universe: Universe, type: ArtType): Entry[] {
  const root = join(mounts.work, universe.slug)
  if (type === 'characters' || isArtCategory(type)) {
    return rows(doc(join(root, 'cast', 'roster.json')).characters).flatMap((record) => {
      const name = str(record.name)
      const key = /^\.\.\/characters\/([a-z0-9-]+)\/character\.json$/.exec(str(record.record))?.[1]
      const referenceFolder = join(root, 'characters', key ?? '')
      const folder = isArtCategory(type) ? join(root, categoryFolder(type), 'characters', key ?? '') : referenceFolder
      return key && name ? [{ id: key, name, key, folder, referenceFolder, tier: str(record.tier) }] : []
    })
  }
  const cast = join(root, ...artTypes[type].folder, 'cast')
  return children(cast).filter((tier) => tier.isDirectory() && /^tier-\d+$/.test(tier.name)).flatMap((tier) =>
    children(join(cast, tier.name)).filter((group) => group.isDirectory() && slug.test(group.name)).flatMap((group) =>
      children(join(cast, tier.name, group.name)).filter((member) => member.isDirectory() && slug.test(member.name)).flatMap((member) => {
        const folder = join(cast, tier.name, group.name, member.name)
        const info = doc(join(folder, 'character.json'))
        const id = str(info.id), name = str(info.name)
        return slug.test(id) && name ? [{ id, name, key: member.name, folder, tier: 'T' + tier.name.slice(5), opponent: str(row(info.uma).name) }] : []
      })))
}

export function categories(mounts: Mounts, universe: Universe): ArtType[] {
  const root = join(mounts.work, universe.slug)
  return (Object.keys(artTypes) as ArtType[]).filter((type) =>
    isArtCategory(type) ? universe.slug === 'farm-life'
      : type === 'characters' || children(join(root, ...artTypes[type].folder, 'cast')).some((entry) => entry.isDirectory()))
}

function study(entry: Entry) {
  const active = str(doc(join(entry.folder, 'active-study.json')).activeVersion)
  const versions = children(entry.folder).filter((item) => item.isDirectory() && /^v\d+$/.test(item.name)).reverse()
  const version = /^v\d+$/.test(active) ? active : versions[0]?.name
  const dir = version ? join(entry.folder, version) : entry.folder
  return { dir, manifest: doc(join(dir, 'manifest.json')), latest: versions[0]?.name }
}

function match(record: Row, entry: Entry) {
  return [record.characterKey, record.character, record.name].some((value) => keyOf(str(value)) === entry.key)
}

export function library(mounts: Mounts, universe: Universe, type: ArtType) {
  const root = join(mounts.work, universe.slug)
  const category = isArtCategory(type) ? type : undefined
  const characterArt = type === 'characters' || category !== undefined
  const published = characterArt
    ? { mount: 'art' as const, dir: join(mounts.art, 'universes', universe.slug) }
    : { mount: 'enemy' as const, dir: join(mounts.enemy, universe.slug) }
  const live = rows(doc(join(published.dir, 'index.json')).looks).filter((look) => {
    const { kind } = look
    if (category) return look.category === category
    if (look.category) return false
    if (type === 'bosses') return kind !== 'casual' && kind !== 'lieutenant'
    if (type === 'boss-allies') return kind === 'casual' || kind === 'base'
    if (type === 'lieutenants') return kind === 'lieutenant'
    return true
  })
  const approvedDir = join(root, ...(type === 'characters' ? [] : artTypes[type].folder), 'approved')
  const approved = { dir: approvedDir, assets: rows(doc(join(approvedDir, 'manifest.json')).assets) }

  function files(entry: Entry, splash = false): Work[] {
    if (category) splash = farmCategories[category].kind === 'splash'
    const picked = new Map<string, Work>()
    const seenHashes = new Set<string>()
    const active = study(entry)
    const same = characterArt
      ? (look: Row) => match(look, entry)
      : (look: Row) => look.unitId === entry.id
    const add = (look: Row, location: Location, status: Work['status']) => {
      const slot = str(splash ? look.scene || look.id : look.outfit || look.look || look.id)
      const slotKey = category ? str(look.id) : slot
      if (!slotKey || picked.has(slotKey)) return
      const hash = str(look.sha256)
      if ((splash || category) && hash && seenHashes.has(hash)) return
      const url = image(mounts, location, location.mount === 'work' ? look.image : look.path)
      if (!url) return
      picked.set(slotKey, { label: str(look.title) || title(slot), url, status })
      if ((splash || category) && hash) seenHashes.add(hash)
    }
    const splashDir = join(root, 'splash-art')
    const local = splash && !category ? { dir: splashDir, assets: rows(doc(join(splashDir, 'manifest.json')).assets) } : approved
    const addLocal = (look: Row, dir: string) => add(look, { mount: 'work', dir },
      look.ownerApproved === true || row(look.approval).status === 'approved' ? 'Approved' : 'In progress')
    if (characterArt) {
      const own = splash && !category ? join(active.dir, 'splash-art') : active.dir
      const records = splash ? rows(doc(join(own, 'manifest.json')).assets) : rows(active.manifest.fullBodyAssets)
      for (const look of records) addLocal(look, own)
    }
    for (const look of local.assets.filter(same)) addLocal(look, local.dir)
    for (const look of live.filter((look) => same(look) && (look.kind === 'splash') === splash)) {
      add(look, published, 'Published')
    }
    if (picked.size === 0 && (!splash || category)) {
      const last = active.latest ? join(entry.folder, active.latest) : entry.folder
      for (const dir of [last, join(last, 'images'), join(last, 'full-body')]) {
        for (const file of children(dir)) {
          if (file.isFile() && imageFile.test(file.name) && !/^face[-_.]|facial|mask|overview|splash|comparison/i.test(file.name)) {
            addLocal({ id: file.name, title: title(file.name.replace(imageFile, '')), image: file.name }, dir)
          }
        }
      }
    }
    return [...picked.values()]
  }

  function baseline(entry: Entry) {
    const folder = entry.referenceFolder ?? entry.folder
    const info = doc(join(folder, 'character.json'))
    const candidates = rows(info.references)
    const ref = candidates.find((item) => item.kind === 'art') ?? candidates.find((item) => item.kind === 'face')
    return image(mounts, { mount: 'work', dir: folder }, ref?.file)
  }

  function portraits(entry: Entry): Portrait[] {
    const active = study(entry)
    const sharedDir = join(root, 'dialogue-portraits')
    const shared = doc(join(sharedDir, 'manifest.json'))
    const sets = new Map<string, Portrait>()
    const at = (v: unknown) => {
      const p = row(v)
      return typeof p.x === 'number' && typeof p.y === 'number' && Number.isInteger(p.x) && Number.isInteger(p.y)
        ? { x: p.x, y: p.y } : undefined
    }
    const add = (dir: string, record: Row, index: Row) => {
      const label = str(record.outfit)
      const location = { mount: 'work' as const, dir }
      const base = image(mounts, location, record.base)
      if (!label || !base || sets.has(label)) return
      const states = rows(record.outputs).flatMap((output) => {
        const mood = str(output.expression)
        const composed = image(mounts, location, output.image)
        const faceData = rows(index.faces).find((f) => f.expression === mood && match(f, entry))
        const face = image(mounts, location, output.face || faceData?.file)
        const position = at(output.position) ?? at(record.position)
        return mood && (composed || (face && position))
          ? [{ label: title(mood), image: composed, face, at: position }] : []
      })
      sets.set(label, { label: title(label), base, states: [{ label: 'Neutral', image: base }, ...states] })
    }
    for (const record of rows(active.manifest.assets)) add(active.dir, record, active.manifest)
    for (const record of rows(shared.assets).filter((asset) => match(asset, entry))) add(sharedDir, record, shared)
    if (type === 'characters') {
      const location = { mount: 'art' as const, dir: join(published.dir, 'portraits') }
      const index = doc(join(location.dir, 'index.json'))
      const faces = new Map(rows(index.faces).map((face) => [face.id, face]))
      const states = rows(index.states).filter((state) => state.character === entry.key)
      for (const record of rows(index.bases).filter((asset) => asset.character === entry.key)) {
        const outfit = str(record.outfit)
        const base = image(mounts, location, record.path)
        if (!outfit || !base || sets.has(outfit)) continue
        const variants = states.filter((state) => state.base === record.id && state.expression !== 'neutral').flatMap((state) => {
          const face = image(mounts, location, faces.get(state.face)?.path)
          const position = at(state.at)
          return face && position ? [{ label: title(str(state.expression)), face, at: position }] : []
        })
        sets.set(outfit, { label: title(outfit), base, states: [{ label: 'Neutral', image: base }, ...variants] })
      }
    }
    return [...sets.values()]
  }

  return { files, baseline, portraits }
}
