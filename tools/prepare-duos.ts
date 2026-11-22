import { resolve } from 'node:path'
import { authoring, platform } from '../paths.mjs'
import { buildDuoRoster, prepareDuos } from '../src/duos.js'

const args = process.argv.slice(2).filter(arg => arg !== '--')
const named = args.filter(arg => !arg.startsWith('--'))
const universes = args.includes('--all') || named.length === 0 ? ['farm-life', 'cyberpunk'] : named
const household = resolve(process.env.UMA_FARM_STORY_DIR ?? resolve(platform, '../uma-story-authoring/content/farm/story'), 'household.json')
for (const universe of universes) {
  const root = resolve(authoring, universe)
  const roster = buildDuoRoster(root, universe, household)
  const result = prepareDuos(root, roster, { dryRun: args.includes('--dry-run'), check: args.includes('--check') })
  console.log(`${universe}: ${result.characters} characters, ${result.pairs} shared pairs; ${result.changed.length} metadata files ${args.includes('--dry-run') ? 'would change' : args.includes('--check') ? 'need changing' : 'changed'}. No images copied.`)
}
