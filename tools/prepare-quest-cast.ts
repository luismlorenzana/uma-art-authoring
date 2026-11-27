import { join } from 'node:path'
import { authoring, platformContent } from '../paths.mjs'
import { jsonFile } from '../src/private-art.js'
import { prepareQuestAuthoring } from '../src/quest-authoring.js'

try {
  const args = process.argv.slice(2), index = args.indexOf('--source')
  const source = index >= 0 ? args[index + 1] : 'cyberpunk'
  if (!source) throw new Error('Provide a source universe.')
  const report = prepareQuestAuthoring({ work: authoring, plan: jsonFile(join(platformContent, 'authoring/ranker/plan.json')), source, dryRun: args.includes('--dry-run'), check: args.includes('--check') })
  console.log(JSON.stringify({ ...report, dryRun: args.includes('--dry-run'), checked: args.includes('--check') }))
} catch (error) {
  console.error(error instanceof Error && !('code' in error) ? error.message : 'Quest preparation stopped; existing work was preserved.')
  process.exitCode = 1
}
