import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { entries, universes, type Entry, type Mounts } from './gallery-data.js'
import { pngSize } from './lib.js'
import { contentDestination, digest, jsonFile, normalSourceFile, row } from './private-art.js'

const records = (value: unknown) => Array.isArray(value) ? value.map(row) : []
const text = (value: unknown) => typeof value === 'string' ? value : ''
const doc = (file: string) => existsSync(file) ? row(jsonFile(file)) : {}
const slashed = (file: string) => file.split(sep).join('/')
interface Base { id: string; outfit: string; file: string; sha256: string; width: number; height: number }

function approvedBases(entry: Entry): Base[] {
  const pointer = doc(join(entry.folder, 'active-study.json')), version = text(pointer.activeVersion)
  if (!version) return []
  if (!/^v\d+$/.test(version)) throw new Error('Invalid Quest base-study pointer.')
  const versionFolder = join(entry.folder, version), manifest = doc(join(versionFolder, 'manifest.json'))
  return records(manifest.fullBodyAssets).flatMap(asset => {
    const approval = row(asset.approval ?? {})
    if (approval.status !== 'approved' || approval.by !== 'owner') return []
    if (!/^[a-f0-9]{64}$/.test(text(asset.sha256)) || !text(asset.id) || !text(asset.outfit)) throw new Error('An approved Quest base has incomplete metadata.')
    const file = normalSourceFile(entry.folder, join(versionFolder, text(asset.image))), bytes = readFileSync(file), size = pngSize(bytes)
    if (digest(bytes) !== asset.sha256 || size?.width !== asset.width || size?.height !== asset.height) throw new Error('An approved Quest base changed; no album files were written.')
    return [{ id: text(asset.id), outfit: text(asset.outfit), file, sha256: text(asset.sha256), width: Number(asset.width), height: Number(asset.height) }]
  })
}

/** Metadata only. Never copies a base or expression, changes an approval, or opens an owner-private variant. */
export function prepareQuestAlbums(options: { work: string; dryRun?: boolean; check?: boolean }) {
  const universe = universes.find(item => item.slug === 'high-fantasy')!
  const work = realpathSync(options.work), mounts: Mounts = { work, art: '', enemy: '' }, root = join(work, universe.slug)
  const proposed = new Map<string, string>()
  let actors = 0, ready = 0, baseCount = 0
  const put = (file: string, value: unknown, freshOnly = false) => {
    file = contentDestination(root, file)
    if (freshOnly && existsSync(file)) return
    const next = typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n'
    if (!existsSync(file) || readFileSync(file, 'utf8').replace(/\r\n/g, '\n') !== next) proposed.set(file, next)
  }
  for (const type of ['characters', 'bosses', 'lieutenants'] as const) {
    const people = entries(mounts, universe, type)
    if (!people.length) throw new Error('Prepare the three Quest cast sections before preparing albums.')
    const sprites = new Map(entries(mounts, universe, type, 'character-sprites').map(entry => [entry.id, entry]))
    const role = type === 'characters' ? 'uma' : type === 'bosses' ? 'human' : 'elf'
    const approved = type === 'characters' ? join(root, 'categories/character-sprites/approved')
      : join(root, type === 'bosses' ? 'enemies' : 'enemies/lieutenants', 'categories/character-sprites/approved')
    put(join(approved, 'manifest.json'), { schemaVersion: 1, category: 'character-sprites', album: type, assets: [] }, true)
    for (const entry of people) {
      actors++
      const identity = row(jsonFile(normalSourceFile(root, join(entry.folder, 'character.json')))), bases = approvedBases(entry)
      if (!['string', 'number'].includes(typeof identity.id) || !String(identity.id)) throw new Error('A Quest actor identity is missing.')
      if (bases.length) ready++
      baseCount += bases.length
      const sprite = sprites.get(entry.id)
      if (!sprite) throw new Error('A Quest sprite identity is missing.')
      const sections = [
        { id: 'expressions', label: 'Facial Expressions', folder: join(entry.folder, 'dialogue-portraits'), field: 'assets' },
        { id: 'splash', label: 'Splash Art', folder: join(entry.folder, 'splash-art'), field: 'assets' },
        { id: 'character-sprites', label: 'Character Sprites', folder: sprite.folder, field: 'fullBodyAssets' },
      ]
      for (const section of sections) {
        const versions = existsSync(section.folder) ? readdirSync(section.folder, { withFileTypes: true }).filter(item => item.isDirectory() && /^v\d+$/.test(item.name)).map(item => item.name).sort((a, b) => Number(b.slice(1)) - Number(a.slice(1))) : []
        const pointer = doc(join(section.folder, 'active-study.json')), version = text(pointer.activeVersion) || versions[0] || 'v001'
        if (!/^v\d+$/.test(version)) throw new Error('Invalid existing Quest album pointer.')
        put(join(section.folder, 'active-study.json'), { schemaVersion: 1, activeVersion: version, ownerApproved: false }, true)
        put(join(section.folder, version, 'manifest.json'), {
          schemaVersion: 1, section: section.id, ...(section.id === 'character-sprites' ? { category: section.id } : {}),
          characterNames: { [entry.key]: entry.name }, [section.field]: [], ...(section.id === 'expressions' ? { faces: [] } : {}),
        }, true)
        const inputs = {
          schemaVersion: 1, kind: 'quest-album-inputs', section: section.id, actorId: String(identity.id), role,
          identityFile: slashed(relative(section.folder, join(entry.folder, 'character.json'))),
          status: bases.length ? 'approved-quest-base-ready' : 'awaiting-approved-quest-base',
          bases: bases.map(base => ({ id: base.id, outfit: base.outfit, image: slashed(relative(section.folder, base.file)), sha256: base.sha256, width: base.width, height: base.height })),
        }
        const inputFile = join(section.folder, 'inputs.json'), previous = doc(inputFile)
        if (Object.keys(previous).length && previous.kind !== 'quest-album-inputs') throw new Error('An existing album input document has a different format; it was preserved.')
        put(inputFile, inputs)
        const identityLink = slashed(relative(section.folder, join(entry.folder, 'character.json')))
        put(join(section.folder, 'brief.md'), `# ${entry.name} · ${section.label}\n\n[Character identity](${identityLink})\n\nUse the approved Quest outfit bases pinned in inputs.json. If none is approved yet, keep this section pending; do not substitute a Cyberpunk pilot or another character.\nSave new work under fresh vNNN versions; keep existing pointers, images and exact approvals. Inputs are references only, never finished or approved ${section.label.toLowerCase()}.\n\nRead docs/quest-art-albums.md in the Art repo for the manifest format. Keep actual prompts and exact source/output hashes with the normal study. Owner-private variants and their prompts remain off-limits.\n`, true)
      }
    }
  }
  if (options.check && proposed.size) throw new Error(`Quest albums need ${proposed.size} preparation updates; nothing was written.`)
  if (!options.check && !options.dryRun) for (const [file, value] of proposed) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, value) }
  return { actors, sectionsPerActor: 3, approvedQuestCharacters: ready, approvedQuestBases: baseCount, pendingQuestCharacters: actors - ready, changedFiles: proposed.size, copiedImages: 0 }
}
