// `pnpm run publish <universe>… | --all [--only <id|outfit|character>,…] [--portraits] [--dry-run]`: publishes a universe's owner-approved looks to Uma Character Art,
// `gs://uma-platform-content/art/universes/<universe>/` (CA4, AP73–AP82). Only a look whose manifest entry says the owner
// approved it, and whose PNG still has the approved hash and size, goes up, byte for byte. Nothing is ever deleted there.
// It then flags each look as published beside the manifest, where the local gallery shows it. With `--portraits` it
// publishes the universe's approved dialogue portraits as their pieces instead (CA5, P169), and leaves the looks alone.
// `--only` takes a character's key (`--only character-one,character-two`) for her whole set: looks and splash art, or with
// `--portraits` her pieces and states, every other character's staying as the bucket has them (P189).
// With `--enemies` it publishes the universe's approved enemy looks (`enemies/approved/`, P182) to Uma Enemy Art instead,
// `gs://uma-platform-content/enemy-art/<game>/` (EA1, P183); `--only` then names looks by id, faction or enemy name.
// A push of looks or portraits then runs `pnpm art:release <universe>` (P203): a universe master data ships (farm-life)
// goes on to master data `latest` (portraits, illustrations, the candidate read back, promoted, profile pictures), so
// publishing her art ends with the games able to read it. `--no-release` stops at Character Art; a dry run never goes on.
import { spawnSync } from 'node:child_process'
import { platform, content } from '../paths.mjs'
import { publishCyberpunkGame } from './game-release.js'
import { enemiesDir, enemyMirror, enemyPrefix, enemySlice, enemyUniverses, pushEnemies } from './enemies.js'
import { approvedDir, authoring, bucketRemote, BUCKET, isUniverse, mirror, push, remoteAt, universesIn } from './lib.js'
import { portraitsDir, portraitUniverses, pushPortraits } from './portraits.js'
import { isArtCategory, supportsCategory } from './art-categories.js'

const initial = process.argv.slice(2).filter((a) => a !== '--')
const categoryAt = initial.findIndex((arg) => arg === '--category' || arg.startsWith('--category='))
const categoryName = categoryAt < 0 ? undefined : initial[categoryAt]!.split('=')[1] ?? initial[categoryAt + 1]
if (categoryAt >= 0 && !isArtCategory(categoryName)) throw new Error('--category needs a supported art category.')
const category = isArtCategory(categoryName) ? categoryName : undefined
const raw = initial.filter((arg, i) => i !== categoryAt && !(i === categoryAt + 1 && categoryAt >= 0 && !initial[categoryAt]!.includes('=')))
// `--only a,b` or `--only=a,b`: only those looks (by id, outfit or character) change; every other look stays as the bucket has it.
const onlyAt = raw.findIndex((a) => a === '--only' || a.startsWith('--only='))
const only = onlyAt === -1 ? [] : (raw[onlyAt]!.includes('=') ? raw[onlyAt]!.slice('--only='.length) : raw[onlyAt + 1] ?? '').split(',').map((s) => s.trim()).filter(Boolean)
if (onlyAt !== -1 && only.length === 0) throw new Error('--only needs look ids or outfits, joined by commas.')
const args = onlyAt === -1 ? raw : raw.filter((_, i) => i !== onlyAt && !(i === onlyAt + 1 && !raw[onlyAt]!.includes('=')))
const dryRun = args.includes('--dry-run'), portraits = args.includes('--portraits'), enemies = args.includes('--enemies'), release = !args.includes('--no-release')
if (category && (portraits || enemies)) throw new Error('--category selects outfit or splash collections.')
if (portraits && enemies) throw new Error('--portraits and --enemies are separate pushes; run them one at a time.')
const named = args.filter((a) => !a.startsWith('--'))
const all = portraits ? portraitUniverses() : enemies ? enemyUniverses() : universesIn()
const universes = args.includes('--all') ? all : named
if (universes.length === 0) throw new Error(`Name a universe, or --all: pnpm run publish <${all.join('|') || 'universe'}>… [--dry-run]`)
for (const u of universes) if (!isUniverse(u) || !all.includes(u)) throw new Error(`No approved ${portraits ? 'dialogue portraits' : enemies ? 'enemy collection' : 'collection'} for "${u}" in ${authoring}. There: ${all.join(', ') || 'none'}.`)
if (category && universes.some((universe) => !supportsCategory(universe, category))) throw new Error('--category does not belong to the selected universe.')

const now = new Date().toISOString()
/** After a push: each universe's art on to master data `latest` (`pnpm art:release`, P203), unless told not to. */
function toMasterData(pushed: readonly string[]): void {
  const masterUniverses = pushed.filter(u => u !== 'cyberpunk')
  if (!release || category || masterUniverses.length === 0) return
  if (dryRun) { console.log(`\nDry run: master data untouched (a push runs pnpm art:release ${masterUniverses.join(', ')} next).`); return }
  for (const universe of masterUniverses) {
    console.log(`\nMaster data: pnpm art:release ${universe}`)
    const r = spawnSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['-s', 'art:release', universe], { cwd: platform, stdio: 'inherit', env: { ...process.env, ART_DIR: mirror }, shell: process.platform === 'win32' })
    if (r.status !== 0) { console.error(`art:release ${universe} stopped; Character Art has the art, master data latest doesn't yet. Fix it and run pnpm art:release ${universe}.`); process.exitCode = 1; return }
  }
}
function toCyberpunk(pushed: readonly string[], event: 'looks' | 'portraits' | 'enemies' | 'weapons' | 'combat-sprites'): void {
  for (const universe of pushed) publishCyberpunkGame({ universe, event, only, dryRun, release, platformRoot: platform, contentRoot: content })
}
if (portraits) {
  for (const universe of universes) {
    console.log(`${dryRun ? 'Would publish' : 'Publishing'} ${universe}'s dialogue portraits as pieces: ${portraitsDir(universe)} → gs://${BUCKET}/art/universes/${universe}/portraits/`)
    if (only.length) console.log(`  Only: ${only.join(', ')} (every other character's pieces stay as they are)`)
    const r = pushPortraits(universe, portraitsDir(universe), mirror, bucketRemote(universe), now, { dryRun, only })
    const p = r.publication
    console.log(`  ${r.uploaded.length} piece${r.uploaded.length === 1 ? '' : 's'} ${dryRun ? 'to send' : 'sent'}, ${r.unchanged} already published; ${p.bases} outfit crops and ${p.faces} faces make ${r.states} states`)
    console.log(`  Recipe: ${r.indexed ? (dryRun ? 'would be written' : 'written') : 'unchanged'}; flag: ${p.state}${r.flagged.length ? `; wrote ${r.flagged.join(', ')}` : ''}`)
    if (r.kept.length) console.log(`  Kept as published (not on this machine, or outside --only): ${r.kept.join(', ')}`)
    for (const [key, c] of Object.entries(p.characters ?? {})) console.log(`    ${key}: ${c.state ?? p.state}, ${c.states} states from ${c.bases} crops and ${c.faces} faces`)
  }
  toCyberpunk(universes, 'portraits')
  toMasterData(universes)
  process.exit()
}
if (enemies) {
  let refusedEnemies = 0
  for (const universe of universes) {
    console.log(`${dryRun ? 'Would publish' : 'Publishing'} ${universe}'s enemy looks: ${enemiesDir(universe)} → gs://${BUCKET}/${enemyPrefix(universe)}/`)
    if (only.length) console.log(`  Only: ${only.join(', ')} (every other enemy look stays as it is)`)
    const r = pushEnemies(universe, enemiesDir(universe), enemyMirror, remoteAt(enemyPrefix(universe)), now, { dryRun, only })
    console.log(`  ${r.uploaded.length} enemy look${r.uploaded.length === 1 ? '' : 's'} ${dryRun ? 'to send' : 'sent'}, ${r.unchanged} already published`)
    for (const id of r.uploaded) console.log(`    ${id}`)
    if (r.withdrawn.length) console.log(`  ${r.withdrawn.length} ${dryRun ? 'would leave' : 'left'} the index (no longer approved here; the files stay in the bucket): ${r.withdrawn.join(', ')}`)
    if (r.kept.length) console.log(`  ${r.kept.length} kept as published (outside --only, or the local copy is damaged): ${r.kept.join(', ')}`)
    for (const look of r.refused) console.log(`  Not sent, ${look.id}: ${look.why}`)
    refusedEnemies += r.refused.filter((l) => l.kind === 'damaged').length
    // Each album's own flags: a look both albums hold (P190) counts in each.
    const line = (name: string, c: Record<string, number>) => `${name} ${c.published} published, ${c.changed} changed, ${c.unpublished} not published, ${c.refused} refused`
    const albums = [['enemy album', null], ['casual album', 'casual'], ['lieutenants\' album', 'lieutenants']] as const
    const lines = albums.map(([name, c]) => [name, enemySlice(r.publication, c).counts] as const).filter(([name, c]) => name === 'enemy album' || c.published + c.changed + c.unpublished + c.refused)
    console.log(`  Flags: ${lines.map(([name, c]) => line(name, c)).join('; ')}${r.flagged.length ? `; wrote ${r.flagged.join(', ')}` : ''}`)
  }
  if (refusedEnemies) process.exitCode = 1
  else toCyberpunk(universes, 'enemies')
  process.exit()
}
let refused = 0
for (const universe of universes) {
  console.log(`${dryRun ? 'Would publish' : 'Publishing'} ${universe}: ${approvedDir(universe)} → gs://${BUCKET}/art/universes/${universe}/`)
  if (only.length) console.log(`  Only: ${only.join(', ')} (every other look stays as it is)`)
  const r = push(universe, approvedDir(universe), mirror, bucketRemote(universe), now, { dryRun, only, category })
  console.log(`  ${r.uploaded.length} look${r.uploaded.length === 1 ? '' : 's'} ${dryRun ? 'to send' : 'sent'}, ${r.unchanged} already published`)
  for (const id of r.uploaded) console.log(`    ${id}`)
  if (r.withdrawn.length) console.log(`  ${r.withdrawn.length} ${dryRun ? 'would leave' : 'left'} the index (no longer approved here; the files stay in the bucket): ${r.withdrawn.join(', ')}`)
  if (r.kept.length) console.log(`  ${r.kept.length} kept as published (outside --only, not on this machine, or the local copy is damaged): ${r.kept.join(', ')}`)
  for (const look of r.refused) console.log(`  Not sent, ${look.id}: ${look.why}`)
  refused += r.refused.length
  const c = r.publication.counts
  console.log(`  Flags: ${c.published} published, ${c.changed} changed, ${c.unpublished} not published, ${c.refused} refused${r.flagged.length ? `; wrote ${r.flagged.join(', ')}` : ''}`)
}
if (refused) { process.exitCode = 1; console.log(`\n${refused} look${refused === 1 ? '' : 's'} refused: master data not touched until the push is clean.`) } else { toCyberpunk(universes, category === 'weapons' || category === 'combat-sprites' ? category : 'looks'); toMasterData(universes) }
