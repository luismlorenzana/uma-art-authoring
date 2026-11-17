import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'

export const MANIFEST = 'manifest.json'
export const GALLERY = 'review.html'
export const RECORD = 'publication.json'
export const PORTRAIT_RECORD = 'portraits-publication.json'
export const slashed = (path: string) => path.split(sep).join('/')
const STUDIES = 'characters'

export interface Publication {
  counts: { published: number; unpublished: number; changed: number }
  publishedAt: string | null
}

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const isUniverse = (value: string): boolean => value.length <= 40 && KEBAB.test(value)
/** A universe's approved folder. */
export const approvedDir = (universe: string, base: string): string => join(base, universe, 'approved')
/** Every universe with an approved collection, by name. */
export function universesIn(base: string): string[] {
  if (!existsSync(base)) return []
  return readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory() && isUniverse(e.name) && existsSync(join(approvedDir(e.name, base), MANIFEST)))
    .map((e) => e.name).sort()
}

const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null)
const words = (id: string) => id.split('-').map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w)).join(' ')

export interface CharacterStudy {
  key: string
  name: string
  /** `<universe>/characters/<key>`. */
  folder: string
  /** The active version's folder, `<folder>/<version>`. */
  versionDir: string
  manifest: Record<string, unknown>
}
/** The universe's character collections whose active version the owner approved, by key. */
export function characterStudies(universeDir: string): CharacterStudy[] {
  const root = join(universeDir, STUDIES)
  if (!existsSync(root)) return []
  const out: CharacterStudy[] = []
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !KEBAB.test(entry.name)) continue
    const folder = join(root, entry.name), activeFile = join(folder, 'active-study.json')
    if (!existsSync(activeFile)) continue
    const active = JSON.parse(readFileSync(activeFile, 'utf8')) as unknown
    if (!object(active) || active.ownerApproved !== true || typeof active.activeVersion !== 'string' || !/^v\d{3}$/.test(active.activeVersion)) continue
    const versionDir = join(folder, active.activeVersion), manifestFile = join(versionDir, MANIFEST)
    if (!existsSync(manifestFile)) continue
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as unknown
    if (!object(manifest)) continue
    const names = object(manifest.characterNames) ? manifest.characterNames : {}
    const name = typeof names[entry.name] === 'string' ? names[entry.name] as string : text(active.character) ?? words(entry.name)
    out.push({ key: entry.name, name, folder, versionDir, manifest })
  }
  return out.sort((a, b) => a.key.localeCompare(b.key))
}
