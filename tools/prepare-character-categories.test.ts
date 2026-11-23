import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const temporary: string[] = []
afterEach(() => { for (const folder of temporary.splice(0)) rmSync(folder, { recursive: true, force: true }) })

it('prepares all 50 sprite studies without copying images or overwriting later authored work, and checks missing files without writing', () => {
  const content = mkdtempSync(join(tmpdir(), 'farm-sprite-preparation-')); temporary.push(content)
  const work = join(content, 'authoring/character-universes'), farm = join(work, 'farm-life')
  const characters = Array.from({ length: 50 }, (_, index) => ({ name: `Resident ${index + 1}`, tier: `T${Math.floor(index / 10) + 1}`, record: `../characters/resident-${index + 1}/character.json` }))
  mkdirSync(join(farm, 'cast'), { recursive: true })
  writeFileSync(join(farm, 'cast/roster.json'), JSON.stringify({ characters }))
  const run = (...flags: string[]) => spawnSync(process.execPath, ['--import', 'tsx', 'tools/prepare-character-categories.ts', '--universe', 'farm-life', '--category', 'character-sprites', ...flags], { cwd: root, env: { ...process.env, UMA_ART_CONTENT: content, UNIVERSES_DIR: work }, encoding: 'utf8' })
  const category = join(farm, 'categories/character-sprites')
  expect(run('--check').status).toBe(1)
  expect(existsSync(category)).toBe(false)
  expect(run('--dry-run').status).toBe(0)
  expect(existsSync(category)).toBe(false)
  const prepared = run()
  expect(prepared.status, prepared.stderr).toBe(0)
  expect(prepared.stdout).toContain('151 files created')
  expect(readdirSync(join(category, 'characters'))).toHaveLength(50)
  expect(existsSync(join(farm, 'categories/pajama-outfits'))).toBe(false)
  const first = join(category, 'characters/resident-1')
  expect(JSON.parse(readFileSync(join(first, 'active-study.json'), 'utf8')).ownerApproved).toBe(false)
  expect(JSON.parse(readFileSync(join(first, 'v001/manifest.json'), 'utf8')).fullBodyAssets).toEqual([])
  expect(readFileSync(join(first, 'brief.md'), 'utf8')).not.toContain('married-life handoff')
  expect(readdirSync(join(first, 'v001'))).toEqual(['manifest.json'])
  writeFileSync(join(first, 'active-study.json'), JSON.stringify({ activeVersion: 'v002', ownerApproved: true }))
  writeFileSync(join(first, 'v001/manifest.json'), JSON.stringify({ fullBodyAssets: [{ id: 'authored' }] }))
  expect(run().stdout).toContain('0 files created')
  expect(JSON.parse(readFileSync(join(first, 'active-study.json'), 'utf8')).activeVersion).toBe('v002')
  expect(JSON.parse(readFileSync(join(first, 'v001/manifest.json'), 'utf8')).fullBodyAssets[0].id).toBe('authored')
  expect(run('--check').status).toBe(0)
  rmSync(join(first, 'brief.md'))
  expect(run('--check').status).toBe(1)
  expect(existsSync(join(first, 'brief.md'))).toBe(false)
}, 15000)
