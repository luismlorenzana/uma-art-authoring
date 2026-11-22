import { join, relative, sep } from 'node:path'
import { duoDocument, duoFolder, duoStudy, readDuoRoster, type DuoMember, type DuoPair } from './duos.js'
import { entries, library, mediaFile, type Entry, type Mounts, type Universe, type Work } from './gallery-data.js'

const nameKey = (value: string) => value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '')
const text = (value: unknown) => typeof value === 'string' ? value : ''
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {}
const rows = (value: unknown) => Array.isArray(value) ? value.map(object) : []

function url(mounts: Mounts, mount: keyof Mounts, base: string, file: unknown) {
  if (typeof file !== 'string') return ''
  const parts = relative(mounts[mount], join(base, file)).split(sep)
  return mediaFile(mounts[mount], parts) ? `/_gallery/media/${mount}/${parts.map(encodeURIComponent).join('/')}` : ''
}

export function duoLibrary(mounts: Mounts, universe: Universe) {
  const root = join(mounts.work, universe.slug), roster = readDuoRoster(root)
  const characters = entries(mounts, universe, 'characters'), allies = universe.slug === 'cyberpunk' ? entries(mounts, universe, 'boss-allies') : []
  const publishedRoot = join(mounts.art, 'universes', universe.slug)
  const profileIndex = duoDocument(join(publishedRoot, 'profiles', 'index.json'))
  function entry(member: DuoMember): Entry | undefined {
    return member.role === 'character' ? characters.find(item => item.key === member.key) : allies.find(item => item.id === member.id.slice('ally-'.length))
  }
  function profile(member: DuoMember): string {
    if (member.role === 'character') {
      const base = publishedRoot, index = profileIndex
      const identity = rows(index.characters).find(item => nameKey(text(item.name)) === nameKey(member.name) || item.id === member.key)
      const profiles = rows(index.profiles).filter(item => item.character === identity?.id || item.character === member.key)
      const preferred = profiles.find(item => item.outfit === 'spring') ?? profiles[0]
      // The profile publisher mirrors its own pack root, whose paths include profiles/.
      const image = url(mounts, 'art', join(base, 'profiles'), preferred?.path) || url(mounts, 'art', base, preferred?.path)
      if (image) return image
    }
    const own = entry(member)
    if (!own) return ''
    return library(mounts, universe, member.role === 'character' ? 'characters' : 'boss-allies').files(own).find(file => file.status !== 'In progress')?.url ?? ''
  }
  function works(pair: DuoPair): Work[] {
    const study = duoStudy(root, pair), selected = new Map<string, Work>(), hashes = new Map<string, string>()
    for (const asset of study.assets) {
      const image = url(mounts, 'work', study.versionDir, asset.image)
      if (!image) continue
      const status = object(asset.approval).status === 'approved' && object(asset.approval).by === 'owner' ? 'Approved' : 'In progress'
      const id = `duo-${pair.id}-${text(asset.id)}`
      selected.set(id, { label: text(asset.title) || 'Duo Splash', url: image, status })
      hashes.set(id, createHash('sha256').update(readFileSync(join(study.versionDir, text(asset.image)))).digest('hex'))
    }
    const published = join(mounts.art, 'universes', universe.slug)
    for (const asset of rows(duoDocument(join(published, 'index.json')).looks)) {
      if (asset.category !== 'duo-splash' || object(asset.duo).id !== pair.id) continue
      const image = url(mounts, 'art', published, asset.path)
      const local = selected.get(text(asset.id))
      if (local && local.status === 'Approved' && hashes.get(text(asset.id)) === asset.sha256) local.status = 'Published'
      if (image && !local) {
        selected.set(text(asset.id), { label: text(asset.title) || 'Duo Splash', url: image, status: 'Published' })
      }
    }
    return [...selected.values()]
  }
  return { roster, profile, works, members: roster?.members.filter(member => member.role === 'character').sort((a, b) => a.order - b.order) ?? [],
    pairsFor: (member: DuoMember) => roster?.pairs.filter(pair => pair.members.includes(member.id)) ?? [],
    folder: duoFolder(root) }
}
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
