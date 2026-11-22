import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { authoring } from '../paths.mjs'
import { categoryFolder, artCategories, categoriesFor, type ArtCategory } from '../src/art-categories.js'
import { artTypes, entries, universes } from '../src/gallery-data.js'

const dryRun = process.argv.includes('--dry-run')
const universeAt = process.argv.indexOf('--universe')
const slug = universeAt < 0 ? 'farm-life' : process.argv[universeAt + 1]
const universe = universes.find((entry) => entry.slug === slug)
if (!universe) throw new Error('Choose a known universe for category folders.')
const config = Object.fromEntries(Object.entries(categoriesFor(universe.slug)).filter(([key]) => key !== 'duo-splash'))
if (!Object.keys(config).length) throw new Error('This universe has no additional character categories.')
const roles = universe.slug === 'cyberpunk' ? ['characters', 'bosses', 'boss-allies', 'lieutenants'] as const : ['characters'] as const
let created = 0
function create(file: string, body: string) {
  if (existsSync(file)) return
  created++
  if (dryRun) return
  mkdirSync(dirname(file), { recursive: true })
  try { writeFileSync(file, body, { flag: 'wx' }) } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST') throw error
  }
}
for (const role of roles) {
  const roster = entries({ work: authoring, art: '', enemy: '' }, universe, role)
  if (!roster.length || (role === 'characters' && roster.length !== 50)) throw new Error('Prepare the cast before the category folders.')
  for (const [key, { label, kind }] of Object.entries(config) as [ArtCategory, typeof artCategories[ArtCategory]][]) {
    const folder = join(authoring, universe.slug, ...(role === 'characters' ? [] : artTypes[role].folder), categoryFolder(key))
    create(join(folder, 'approved', 'manifest.json'), JSON.stringify({ collection: label, category: key, album: role, assets: [] }, null, 2) + '\n')
    for (const character of entries({ work: authoring, art: '', enemy: '' }, universe, role, key)) {
      const file = join(character.folder, 'brief.md')
      const source = relative(character.folder, join(character.referenceFolder!, 'character.json')).split(sep).join('/')
      create(file, `# ${character.name}\n\n${label} · ${character.tier}\n\n[Identity and baseline](${source})\n\nSave new art in v001/, v002/, and subsequent studies. ` +
        `Use ${kind === 'splash' ? 'assets' : 'fullBodyAssets'} in the version manifest and record exact owner approval before publishing.\n` +
        (universe.slug === 'farm-life' && kind === 'look' ? '\nRead the Farm README and [married-life handoff](../../../married-life-handoff.md) before planning expression reviews. New numbered night looks require Neutral, Tender and Loving; baseline pajama slot 1 retains its broader scene coverage. Keep existing approvals and use the exact numbered portrait keys.\n' : ''))
    }
  }
}
console.log(`${Object.keys(config).length} additional collections per album across ${roles.length} ${universe.title} album types. ${created} files ${dryRun ? 'to create' : 'created'}.`)
