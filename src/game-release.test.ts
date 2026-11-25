import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cyberpunkPublishCommand, publishCyberpunkGame, type GamePublishOptions } from './game-release.js'

const folders: string[] = []
afterEach(() => { for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true }) })
function setup() {
  const folder = mkdtempSync(join(tmpdir(), 'cyber-publish-'))
  folders.push(folder)
  mkdirSync(join(folder, 'scripts/art'), { recursive: true })
  writeFileSync(join(folder, 'scripts/art/cli.ts'), '// synthetic CLI')
  const options: GamePublishOptions = { universe: 'cyberpunk', event: 'looks', only: ['officer-one'], dryRun: false,
    release: true, contentRoot: folder, platformRoot: folder, env: { UMA_CYBERPUNK_ROOT: folder } }
  return { folder, options }
}
describe('Cyberpunk publishing hook', () => {
  it('leaves Farm, other universes and no-release paths untouched', () => {
    const { options } = setup()
    for (const value of [{ ...options, universe: 'farm-life' }, { ...options, universe: 'quest' }, { ...options, release: false }]) {
      expect(cyberpunkPublishCommand(value)).toBeNull()
      publishCyberpunkGame(value, () => { throw Error('must not run') })
    }
  })
  it('passes selection, portraits/enemy/category events and dry-run directly to the game CLI without a shell', () => {
    const { options, folder } = setup()
    for (const event of ['looks', 'portraits', 'enemies', 'weapons', 'combat-sprites'] as const) {
      const cmd = cyberpunkPublishCommand({ ...options, event, dryRun: true })!
      expect(cmd.executable).toBe(process.execPath)
      expect(cmd.cwd).toBe(folder)
      expect(cmd.args).toEqual(['--import', 'tsx', join(folder, 'scripts/art/cli.ts'), '--event', event, '--campaign', 'four-act', '--only', 'officer-one', '--dry-run'])
    }
  })
  it('uses the local shared-register handoff and reports partial delivery failures', () => {
    const { options, folder } = setup()
    writeFileSync(join(folder, 'cyberpunk-four-pillars-handoff.json'), JSON.stringify({ canonicalGameCheckout: folder }))
    expect(cyberpunkPublishCommand({ ...options, env: {} })!.cwd).toBe(folder)
    expect(() => publishCyberpunkGame(options, () => 1)).toThrow('Platform art was published')
    expect(() => cyberpunkPublishCommand({ ...options, env: { UMA_CYBERPUNK_ROOT: join(folder, 'missing') } })).toThrow('Set UMA_CYBERPUNK_ROOT')
  })
})
