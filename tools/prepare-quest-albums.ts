import { authoring } from '../paths.mjs'
import { prepareQuestAlbums } from '../src/quest-albums.js'

try {
  const args = process.argv.slice(2)
  console.log(JSON.stringify(prepareQuestAlbums({ work: authoring, dryRun: args.includes('--dry-run'), check: args.includes('--check') })))
} catch (error) {
  console.error(error instanceof Error && !('code' in error) ? error.message : 'Quest album preparation stopped; existing work was preserved.')
  process.exitCode = 1
}
