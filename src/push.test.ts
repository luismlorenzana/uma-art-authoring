import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const counts = { published: 1, changed: 0, unpublished: 0, refused: 0 }
  const result = { uploaded: [], unchanged: 1, withdrawn: [], kept: [], refused: [], indexed: false, flagged: [],
    states: 1, publication: { state: 'published', bases: 1, faces: 1, counts } }
  return { game: vi.fn(), master: vi.fn(() => ({ status: 0 })), counts, result, enemy: vi.fn(() => result) }
})
vi.mock('node:child_process', () => ({ spawnSync: mocks.master }))
vi.mock('../paths.mjs', () => ({ platform: '/platform', content: '/content' }))
vi.mock('./game-release.js', () => ({ publishCyberpunkGame: mocks.game }))
vi.mock('./lib.js', () => ({ approvedDir: () => '/approved', authoring: '/authoring', bucketRemote: () => ({}), BUCKET: 'test',
  isUniverse: () => true, mirror: '/mirror', push: () => mocks.result, remoteAt: () => ({}), universesIn: () => ['cyberpunk', 'farm-life'] }))
vi.mock('./enemies.js', () => ({ enemiesDir: () => '/enemies', enemyMirror: '/mirror', enemyPrefix: (u: string) => `enemy-art/${u}`,
  enemySlice: () => ({ counts: mocks.counts }), enemyUniverses: () => ['cyberpunk'], pushEnemies: mocks.enemy }))
vi.mock('./portraits.js', () => ({ portraitsDir: () => '/portraits', portraitUniverses: () => ['cyberpunk', 'farm-life'], pushPortraits: () => mocks.result }))
vi.mock('./art-categories.js', () => ({ isArtCategory: (v: string) => ['weapons', 'combat-sprites'].includes(v), supportsCategory: () => true }))

const original = process.argv
async function run(args: string[]) {
  vi.resetModules()
  process.argv = ['node', 'push.ts', ...args]
  const exit = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('test exit') })
  vi.spyOn(console, 'log').mockImplementation(() => {})
  try { await import('./push.js') } catch (error) { if (!(error instanceof Error) || error.message !== 'test exit') throw error }
  finally { exit.mockRestore(); process.argv = original }
}
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); process.exitCode = 0 })

describe('native publishing routes', () => {
  it.each([
    [[], 'looks'], [['--portraits'], 'portraits'], [['--enemies'], 'enemies'],
    [['--category', 'weapons'], 'weapons'], [['--category', 'combat-sprites'], 'combat-sprites'],
  ])('forwards %j to the scoped game event %s after Platform succeeds', async (flags, event) => {
    await run(['cyberpunk', ...flags, '--only', 'officer-one', '--dry-run'])
    expect(mocks.game).toHaveBeenCalledWith(expect.objectContaining({ universe: 'cyberpunk', event, only: ['officer-one'], dryRun: true, release: true }))
    expect(mocks.master).not.toHaveBeenCalled()
  })
  it('keeps Farm on its existing master-data release command', async () => {
    await run(['farm-life'])
    expect(mocks.master).toHaveBeenCalledWith(expect.any(String), ['-s', 'art:release', 'farm-life'], expect.any(Object))
  })
  it('does not invoke the game when Platform refuses damaged enemy art', async () => {
    mocks.enemy.mockReturnValueOnce({ ...mocks.result, refused: [{ kind: 'damaged', id: 'officer-one', why: 'changed hash' }] } as never)
    await run(['cyberpunk', '--enemies'])
    expect(mocks.game).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })
})
