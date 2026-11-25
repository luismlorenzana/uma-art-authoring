import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

export interface GamePublishOptions {
  universe: string
  event: 'looks' | 'portraits' | 'enemies' | 'weapons' | 'combat-sprites'
  only: readonly string[]
  dryRun: boolean
  release: boolean
  platformRoot: string
  contentRoot: string
  env?: NodeJS.ProcessEnv
}
export interface GamePublishCommand { executable: string; args: string[]; cwd: string }

/** Cyberpunk owns its release namespace. Farm continues through the unchanged Platform release hook. */
export function cyberpunkPublishCommand(options: GamePublishOptions): GamePublishCommand | null {
  if (options.universe !== 'cyberpunk' || !options.release) return null
  const env = options.env ?? process.env
  let localRoot: string | undefined
  const handoff = resolve(options.contentRoot, 'cyberpunk-four-pillars-handoff.json')
  if (existsSync(handoff)) {
    const value: unknown = JSON.parse(readFileSync(handoff, 'utf8'))
    if (value && typeof value === 'object' && 'canonicalGameCheckout' in value && typeof value.canonicalGameCheckout === 'string') localRoot = value.canonicalGameCheckout
  }
  const cwd = resolve(env.UMA_CYBERPUNK_ROOT ?? localRoot ?? resolve(options.platformRoot, '../uma-cyberpunk'))
  const script = resolve(cwd, 'scripts/art/cli.ts')
  if (!existsSync(script)) throw new Error(`Cyberpunk art reached Platform, but game publishing needs ${script}. Set UMA_CYBERPUNK_ROOT to the game checkout and retry its art:publish command.`)
  return { executable: process.execPath, cwd, args: ['--import', 'tsx', script, '--event', options.event, '--campaign', 'four-act',
    ...(options.only.length ? ['--only', options.only.join(',')] : []), ...(options.dryRun ? ['--dry-run'] : [])] }
}

export function publishCyberpunkGame(options: GamePublishOptions, run = (command: GamePublishCommand): number =>
  spawnSync(command.executable, command.args, { cwd: command.cwd, stdio: 'inherit', env: options.env ?? process.env }).status ?? 1): void {
  const command = cyberpunkPublishCommand(options)
  if (!command) return
  console.log(`\nCyberpunk game: ${options.dryRun ? 'plan from currently published art' : 'publish approved art'} (${options.event})`)
  const code = run(command)
  if (code !== 0) throw new Error('Platform art was published, but the Cyberpunk game release failed. Check the game receipt and current selection before retrying. Repair with pnpm art:publish in the game checkout; Farm master data is untouched.')
}
