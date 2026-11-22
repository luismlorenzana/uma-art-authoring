import { resolve } from 'node:path'
import { readSpriteBundle } from './combat-sprites.js'

try {
  if (process.argv.length !== 3) throw new Error('Usage: node --import tsx src/check-combat-sprites.ts <version folder>')
  const bundle = readSpriteBundle(resolve(process.argv[2]!))
  const fits = bundle.fittings.map(fitting => fitting.label).join(', ')
  console.log(`${bundle.version} · ${bundle.status} · ${Object.keys(bundle.pages).length} checked textures · ${fits}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
