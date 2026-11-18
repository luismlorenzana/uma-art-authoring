import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { authoring } from '../paths.mjs'
import { categoryFolder, farmCategories, type ArtCategory } from '../src/art-categories.js'
import { entries, universes } from '../src/gallery-data.js'

const dryRun = process.argv.includes('--dry-run')
const roster = entries({ work: authoring, art: '', enemy: '' }, universes[1], 'characters')
if (roster.length !== 50) throw new Error('Prepare the ranked Farm roster before the category folders.')
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
for (const [key, { label, kind }] of Object.entries(farmCategories) as [ArtCategory, typeof farmCategories[ArtCategory]][]) {
  const folder = join(authoring, 'farm-life', categoryFolder(key))
  create(join(folder, 'approved', 'manifest.json'), JSON.stringify({ collection: label, category: key, assets: [] }, null, 2) + '\n')
  for (const character of roster) {
    create(join(folder, 'characters', character.key, 'brief.md'),
      `# ${character.name}\n\n${label} · ${character.tier}\n\n[Identity and baseline](../../../../characters/${character.key}/brief.md)\n\nSave new art in v001/, v002/, and subsequent studies. ` +
      `Use ${kind === 'splash' ? 'assets' : 'fullBodyAssets'} in the version manifest and record exact owner approval before publishing.\n`)
  }
}
console.log(`Four Farm collections, ${roster.length} characters each. ${created} files ${dryRun ? 'to create' : 'created'}.`)
