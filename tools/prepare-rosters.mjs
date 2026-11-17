import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { authoring, platformContent } from '../paths.mjs'

const universes = ['high-fantasy', 'farm-life', 'cyberpunk']
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const json = (file) => JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
const optional = (file) => existsSync(file) ? json(file) : null
const keyOf = (label) => label.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export function prepareRosters({ root, planPath, dryRun = false }) {
  const plan = json(planPath)
  const board = plan.boards.find(({ id }) => id === 'umas')
  const tiers = ['T1', 'T2', 'T3', 'T4', 'T5']
  const entries = board?.order.filter((row) => tiers.includes(row.tier)) ?? []
  const expected = plan.batches.slice(0, 5).flatMap(({ outfits }) => outfits)
  if (entries.length !== 50 || new Set(entries.map(({ identity }) => identity)).size !== 50 ||
      entries.some((row, i) => row.order !== i + 1 || row.outfitId !== expected[i])) {
    throw new Error('Expected 50 distinct characters in the first five ranked batches.')
  }
  const keys = entries.map(({ name }) => keyOf(name))
  if (new Set(keys).size !== entries.length || keys.includes('')) throw new Error('Duplicate or invalid character folder key.')

  const seed = entries.map((row, idx) => {
    const key = keys[idx]
    const source = join(root, 'cyberpunk', 'characters', key)
    const record = json(join(source, 'character.json'))
    const ref = record.references?.find(({ kind, file }) => kind === 'art' && file === 'references/art.webp')
    if (!ref || row.identity !== record.id || row.outfitId !== record.outfitId) {
      throw new Error(`The baseline library does not match ranked position ${row.order}.`)
    }
    const bytes = readFileSync(join(source, 'references', 'art.webp'))
    if (hash(bytes) !== ref.sha256 || bytes.length !== ref.bytes) {
      throw new Error(`The baseline image failed its checksum at ranked position ${row.order}.`)
    }
    return { row, key, bytes, ref: { kind: 'art', file: 'references/art.webp', sha256: ref.sha256, bytes: ref.bytes, width: ref.width, height: ref.height } }
  })

  const writes = []
  function proposed(file, bytes, replace = false) {
    if (existsSync(file) && readFileSync(file).equals(bytes)) return
    writes.push({ file, bytes, replace })
  }
  const recordBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`)
  for (const slug of universes) {
    const universe = join(root, slug)
    const rosterPath = join(universe, 'cast', 'roster.json')
    const previous = optional(rosterPath)
    const characters = seed.map(({ row, key, bytes, ref }) => {
      const folder = join(universe, 'characters', key)
      const image = join(folder, 'references', 'art.webp')
      if (existsSync(image) && hash(readFileSync(image)) !== ref.sha256) {
        throw new Error(`An existing ${slug} baseline differs at ranked position ${row.order}. Existing work was preserved.`)
      }
      proposed(image, bytes)
      const file = join(folder, 'character.json')
      const current = optional(file)
      if (current && (current.id !== row.identity || current.outfitId !== row.outfitId)) {
        throw new Error(`An existing ${slug} character record differs at ranked position ${row.order}.`)
      }
      if (!current) proposed(file, recordBytes({
        schemaVersion: 1, kind: 'playable-cast-character', key, id: row.identity, name: row.name,
        characterId: row.characterId, outfitId: row.outfitId, rankerTier: row.tier, castRevision: board.revision,
        uma: { id: row.identity, name: row.name, tier: row.tier, order: row.order }, references: [ref],
      }))
      const brief = join(folder, 'brief.md')
      if (!existsSync(brief)) proposed(brief, Buffer.from(
        `# ${row.name}\n\n[Full-body baseline](references/art.webp)\n\nSave each study under a versioned folder beside this brief.\n`,
      ))
      return { id: row.identity, name: row.name, characterId: row.characterId, outfitId: row.outfitId,
        tier: row.tier, order: row.order, record: `../characters/${key}/character.json` }
    })
    proposed(rosterPath, recordBytes({
      kind: 'playable-roster', ...previous, rankerBoard: board.id, rankerRevision: board.revision,
      rankerUpdatedAt: board.updatedAt, rankerPlanGeneratedAt: plan.generatedAt, tiers, characters,
    }), true)
  }
  if (!dryRun) for (const { file, bytes, replace } of writes) {
    const parent = dirname(file)
    mkdirSync(parent, { recursive: true })
    if (!replace) {
      try { writeFileSync(file, bytes, { flag: 'wx' }) } catch (error) {
        if (error.code !== 'EEXIST' || !readFileSync(file).equals(bytes)) throw error
      }
      continue
    }
    const stage = mkdtempSync(join(parent, '.roster-'))
    const staged = join(stage, 'roster.json')
    try {
      writeFileSync(staged, bytes)
      renameSync(staged, file)
    } finally { rmSync(stage, { recursive: true, force: true }) }
  }
  return { universes: universes.length, characters: entries.length, files: writes.length }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dryRun = process.argv.includes('--dry-run')
  const result = prepareRosters({ root: authoring, planPath: join(platformContent, 'authoring', 'ranker', 'plan.json'), dryRun })
  console.log(`${result.characters} ranked characters per universe across ${result.universes} universes. ${result.files} files ${dryRun ? 'to write' : 'written'}.`)
}
