import { authoring } from '../paths.mjs'
import { originalFolder, prepareOriginalCollection, readOriginalCollection } from '../src/original-casts.js'

const args = process.argv.slice(2)
const option = (name: string) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1] }
const universe = option('--universe') ?? 'cyberpunk', id = option('--collection')
if (!id) throw new Error('Use pnpm originals --universe <universe> --collection <key> [--dry-run|--check].')
const folder = originalFolder(authoring, universe, id), collection = readOriginalCollection(folder)
const result = prepareOriginalCollection(folder, collection, { dryRun: args.includes('--dry-run'), check: args.includes('--check') })
console.log(`Original collection: ${result.characters} characters; ${result.files} files ${args.includes('--dry-run') ? 'to create' : args.includes('--check') ? 'missing' : 'created'}. No baseline images imported.`)
