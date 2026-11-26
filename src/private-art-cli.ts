import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { content } from '../paths.mjs'
import { remoteAt } from './lib.js'
import { contentDestination, digest, fail, jsonFile, normalSourceFile, parsePrivatePlan, preparePrivatePlan, privatePrefix, PrivateArtError } from './private-art.js'
import { checkPrivatePackage, publishPrivatePackage } from './private-art-publish.js'

const option = (args: string[], name: string) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1] }
const needed = (value: string | undefined) => value && !value.startsWith('--') ? value : fail('MISSING_OPTION')
export function exportNormalSeedPack(contentRoot: string, planFile: string, destination: string): { exportedNormalSources: number; actors: number } {
  const plan = parsePrivatePlan(jsonFile(planFile)), out = contentDestination(contentRoot, destination)
  if (existsSync(out)) fail('OUTPUT_ALREADY_EXISTS')
  mkdirSync(join(out, 'sources'), { recursive: true })
  for (const asset of plan.assets) {
    const bytes = readFileSync(normalSourceFile(contentRoot, asset.sourceFile))
    if (digest(bytes) !== asset.sourceSha256) fail('NORMAL_SOURCE_CHANGED')
    const next = `sources/${asset.slot}.png`
    writeFileSync(join(out, next), bytes, { flag: 'wx' })
    asset.sourceFile = next
  }
  writeFileSync(join(out, 'plan.json'), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' })
  writeFileSync(join(out, 'owner-approval-template.json'), JSON.stringify({ schemaVersion: 1, assets: plan.assets.map(a => ({ slot: a.slot, sourceSha256: a.sourceSha256, ownerApproved: false, approvedOn: '', sha256: '' })) }, null, 2) + '\n', { flag: 'wx' })
  return { exportedNormalSources: plan.assets.length, actors: plan.actors.length }
}
/** Agent-safe commands never accept an owner key, plaintext-variant root, edit instruction, or prompt. */
export function runPrivateArt(args: string[]): void {
  const command = args[0]
  if (args.some(arg => /^(?:--key|--key-file|--owner-root|--private-root|--prompt|--prompt-file)(?:=|$)/.test(arg))) fail('OWNER_ONLY_OPTION')
  if (command === 'prepare') {
    const universe = needed(option(args, '--universe')), collection = option(args, '--collection') ?? 'characters'
    const plan = preparePrivatePlan(content, universe, collection)
    const file = contentDestination(content, option(args, '--out') ?? join(content, 'private-art-control', universe, collection, 'plan.json'))
    if (!file.endsWith('.json')) fail('INVALID_PLAN_OUTPUT')
    if (existsSync(file) && JSON.stringify(parsePrivatePlan(jsonFile(file))) !== JSON.stringify(plan)) fail('PLAN_CHANGED_USE_NEW_OUTPUT')
    if (!args.includes('--check')) {
      mkdirSync(dirname(file), { recursive: true })
      if (!existsSync(file)) writeFileSync(file, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' })
    }
    console.log(JSON.stringify({ actors: plan.actors.length, base: plan.assets.filter(a => a.kind === 'base').length, splash: plan.assets.filter(a => a.kind === 'splash').length, pending: plan.pending, checked: args.includes('--check') }))
    return
  }
  if (command === 'export') {
    console.log(JSON.stringify(exportNormalSeedPack(content, needed(option(args, '--plan')), needed(option(args, '--out')))))
    return
  }
  if (command === 'check' || command === 'publish') {
    const folder = resolve(needed(option(args, '--package'))), pkg = checkPrivatePackage(folder)
    if (command === 'check') { console.log(JSON.stringify({ privateAssets: pkg.assets.length, valid: true })); return }
    const prefix = privatePrefix(pkg.universe, pkg.collection)
    const receipt = join(content, 'private-art-control', pkg.universe, pkg.collection, 'publication')
    const result = publishPrivatePackage(folder, remoteAt(prefix), receipt, new Date().toISOString(), args.includes('--dry-run'))
    console.log(JSON.stringify({ ...result, dryRun: args.includes('--dry-run') }))
    return
  }
  fail('USE_PREPARE_EXPORT_CHECK_OR_PUBLISH')
}
export function privateArtFailure(error: unknown): string {
  return error instanceof PrivateArtError ? `Private art stopped: ${error.code}.` : 'Private art stopped: OPERATION_FAILED. No payload or tool diagnostics were printed.'
}
