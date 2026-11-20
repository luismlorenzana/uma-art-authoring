import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), cli = join(root, 'tools/farm-expressions.mjs'), folders = []
afterEach(() => { for (const f of folders.splice(0)) rmSync(f, { recursive: true, force: true }) })
function fixture() { const folder = mkdtempSync(join(tmpdir(), 'farm-expression-plan-')); folders.push(folder);return folder }
function run(args, folder) { return spawnSync(process.execPath, ['--import', 'tsx', cli, ...args], { cwd: root, env: { ...process.env, UMA_ART_CONTENT: folder }, encoding: 'utf8' }) }
describe('Farm expression planner command', () => {
  it('writes a new private plan and refuses overwriting it or writing outside content', () => {
    const folder = fixture(), file = join(folder, 'reviews/plan.json')
    expect(run(['plan', '--all-looks', '--out', file], folder).status).toBe(0)
    expect(JSON.parse(readFileSync(file, 'utf8')).minimumReviews).toBe(168)
    expect(run(['plan', '--out', file], folder).status).not.toBe(0)
    expect(run(['plan', '--out', join(dirname(folder), 'outside.json')], folder).stderr).toContain('under content/')
  })
  it('fails approval checking when a recorded state remains a candidate', () => {
    const folder = fixture(), manifest = join(folder, 'manifest.json')
    writeFileSync(manifest, JSON.stringify({ outfits: ['pajamas-2'], assets: [{ outfit: 'pajamas-2', neutralOwnerApproved: true, outputs: [{ expression: 'tender', ownerApproved: true }, { expression: 'loving', ownerApproved: false }] }], faces: [{ expression: 'tender' }, { expression: 'loving' }] }))
    const coverage = run(['check', '--manifest', manifest], folder), approved = run(['check', '--manifest', manifest, '--approved'], folder)
    expect(coverage.status).toBe(0)
    expect(approved.status).toBe(1)
    expect(JSON.parse(approved.stdout).problems).toEqual(['pajamas-2/loving: owner approval pending'])
    expect(JSON.parse(approved.stdout).approvalGranted).toBe(false)
  })
})
