import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { authoring } from '../paths.mjs'
import { categoryFolder, artCategories, categoriesFor, type ArtCategory } from '../src/art-categories.js'
import { entries, universes } from '../src/gallery-data.js'

const dryRun = process.argv.includes('--dry-run')
const universeAt = process.argv.indexOf('--universe')
const slug = universeAt < 0 ? 'farm-life' : process.argv[universeAt + 1]
const universe = universes.find((entry) => entry.slug === slug)
if (!universe) throw new Error('Choose a known universe for category folders.')
const config = categoriesFor(universe.slug)
if (!Object.keys(config).length) throw new Error('This universe has no additional character categories.')
const roster = entries({ work: authoring, art: '', enemy: '' }, universe, 'characters')
if (roster.length !== 50) throw new Error('Prepare the ranked character roster before the category folders.')
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
for (const [key, { label, kind }] of Object.entries(config) as [ArtCategory, typeof artCategories[ArtCategory]][]) {
  const folder = join(authoring, universe.slug, categoryFolder(key))
  create(join(folder, 'approved', 'manifest.json'), JSON.stringify({ collection: label, category: key, assets: [] }, null, 2) + '\n')
  for (const character of roster) {
    create(join(folder, 'characters', character.key, 'brief.md'),
      `# ${character.name}\n\n${label} · ${character.tier}\n\n[Identity and baseline](../../../../characters/${character.key}/brief.md)\n\nSave new art in v001/, v002/, and subsequent studies. ` +
      `Use ${kind === 'splash' ? 'assets' : 'fullBodyAssets'} in the version manifest and record exact owner approval before publishing.\n`)
  }
}
console.log(`${Object.keys(config).length} ${universe.title} collections, ${roster.length} characters each. ${created} files ${dryRun ? 'to create' : 'created'}.`)
