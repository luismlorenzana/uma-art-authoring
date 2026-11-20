// Plan review coverage only. Image generation, pixel verification and owner approval remain separate steps.
import fs from 'node:fs/promises'
import path from 'node:path'
import { root, content } from '../paths.mjs'
import { additionalFarmLooks, planFarmExpressions, readReviewManifest, readSceneRequirements, standardExpressionReviews } from '../src/farm-expression-plan.ts'
const usage = 'pnpm farm:expressions plan|check [--manifest <file> | --outfits <keys> | --all-looks] [--requirements <file>] [--approved] [--out <new-content-file>]'
try {
  const [command, ...args] = process.argv.slice(2)
  if (!command || command === '--help') { console.log(usage); process.exit(0) }
  if (!['plan', 'check'].includes(command)) throw Error(usage)
  const flags = new Map()
  for (let i = 0; i < args.length; i++) {
    const flag = args[i]
    if (flags.has(flag)) throw Error('Repeated flag: ' + flag)
    if (['--all-looks', '--approved'].includes(flag)) flags.set(flag, true)
    else if (['--manifest', '--outfits', '--requirements', '--out'].includes(flag) && args[i + 1] && !args[i + 1].startsWith('--')) flags.set(flag, args[++i])
    else throw Error(usage)
  }
  if (['--manifest', '--outfits', '--all-looks'].filter(k => flags.has(k)).length > 1) throw Error('Choose one manifest or outfit selection')
  if (command === 'check' && !flags.has('--manifest')) throw Error('check requires --manifest')
  if (flags.has('--approved') && command !== 'check') throw Error('--approved belongs to check')
  const json = async f => JSON.parse(await fs.readFile(path.resolve(f), 'utf8'))
  const manifest = flags.has('--manifest') ? readReviewManifest(await json(flags.get('--manifest'))) : readReviewManifest({ outfits: flags.has('--outfits') ? flags.get('--outfits').split(',') : [...Object.keys(standardExpressionReviews), ...(flags.has('--all-looks') ? additionalFarmLooks : [])] })
  const scenes = flags.has('--requirements') ? readSceneRequirements(await json(flags.get('--requirements'))) : {}
  const plan = planFarmExpressions(manifest, scenes)
  const problems = command === 'check' ? plan.rows.flatMap(row => [
    ...row.missingCompositions.map(e => row.outfit + '/' + e + ': missing composition'),
    ...row.missingSharedFaces.map(e => row.outfit + '/' + e + ': missing shared face'),
    ...(flags.has('--approved') ? row.pendingOwnerApproval.map(e => row.outfit + '/' + e + ': owner approval pending') : []),
  ]) : []
  const report = { ...plan, ...(command === 'check' ? { passed: problems.length === 0, problems } : {}) }
  const encoded = JSON.stringify(report, null, 2) + '\n'
  if (flags.has('--out')) {
    const destination = path.resolve(root, flags.get('--out')), relative = path.relative(content, destination)
    if (!relative || path.isAbsolute(relative) || relative === '..' || relative.startsWith('..' + path.sep)) throw Error('Save private plans under content/')
    await fs.mkdir(path.dirname(destination), { recursive: true })
    const resolvedParent = await fs.realpath(path.dirname(destination)), actualContent = await fs.realpath(content), contained = path.relative(actualContent, resolvedParent)
    if (path.isAbsolute(contained) || contained === '..' || contained.startsWith('..' + path.sep)) throw Error('Plan destination leaves content/ through a link')
    await fs.writeFile(destination, encoded, { flag: 'wx' })
    console.log(destination)
  } else process.stdout.write(encoded)
  if (problems.length) process.exitCode = 1
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 }
