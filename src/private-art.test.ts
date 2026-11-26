// Invented image bytes and approvals only. Never use actual owner-private files as fixtures.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { fileFor } from './gallery-lib.js'
import { mediaFile } from './gallery-data.js'
import { contentDestination, digest, matchingPrivateAsset, normalSourceFile, parsePrivatePackage, parsePrivatePlan, preparePrivatePlan, type PrivateArtPackage } from './private-art.js'
import { prepareOwnerPackage } from './private-art-owner.js'
import { checkPrivatePackage, publishPrivatePackage } from './private-art-publish.js'
import { exportNormalSeedPack, privateArtFailure, runPrivateArt } from './private-art-cli.js'
import { readCollection, type Remote } from './lib.js'

const temporary: string[] = []
afterEach(() => { for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true }) })
const png = (marker = 0) => { const b = Buffer.alloc(64); Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(b); b.write('IHDR', 12); b.writeUInt32BE(20, 16); b.writeUInt32BE(30, 20); b[63] = marker; return b }
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'opaque-art-')); temporary.push(root)
  const normal = join(root, 'normal'), repo = join(root, 'repo'), owner = join(root, 'owner'), outbox = join(root, 'private-art-outbox')
  for (const dir of [normal, repo, owner]) mkdirSync(dir)
  const put = (file: string, value: unknown) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, Buffer.isBuffer(value) ? value : JSON.stringify(value)) }
  const collection = join(normal, 'authoring/character-universes/cyberpunk/originals/invented-cast')
  // Stale rank counts are a roster concern, not permission to rewrite identities for variants.
  put(join(collection, 'collection.json'), { schemaVersion: 1, kind: 'original-character-collection', id: 'invented-cast', ranks: [{ id: 'rulers', expectedCount: 99 }], characters: [{ id: 'ruler-one', rank: 'rulers', court: 'day' }, { id: 'not-authored', rank: 'rulers', court: 'day' }] })
  const own = join(collection, 'rulers/day/ruler-one')
  for (const [section, field, id] of [['', 'fullBodyAssets', 'normal-body'], ['splash-art', 'assets', 'normal-scene']]) {
    const dir = join(own, section!), image = section ? '../v000/normal.png' : 'normal.png'
    put(join(dir, 'active-study.json'), { activeVersion: 'v001' })
    put(join(dir, 'v001', image), png())
    put(join(dir, 'v001/manifest.json'), { [field!]: [{ id, image, sha256: digest(png()), width: 20, height: 30, approval: { status: 'approved', by: 'owner', on: '2026-01-01' } }, ...(section === '' ? [{ id: 'draft', image: 'unapproved.private.png', approval: { status: 'pending' } }] : [])] })
  }
  const plan = preparePrivatePlan(normal, 'cyberpunk', 'invented-cast'), planFile = join(root, 'plan.json'), approvalsFile = join(owner, 'approvals.json')
  put(planFile, plan)
  for (const asset of plan.assets) put(join(owner, asset.privateFile), png(9))
  put(approvalsFile, { schemaVersion: 1, assets: plan.assets.map(a => ({ slot: a.slot, sourceSha256: a.sourceSha256, sha256: digest(png(9)), ownerApproved: true, approvedOn: '2026-01-02' })) })
  const pack = (destination = outbox) => prepareOwnerPackage({ planFile, sourceRoot: normal, ownerRoot: owner, approvalsFile, outbox: destination, repoRoot: repo })
  return { root, normal, repo, owner, outbox, put, plan, planFile, pack, approvalsFile }
}

it('prepares exact base/splash IDs and all original identities without reading private inputs', () => {
  const f = fixture()
  expect(f.plan.actors).toEqual(['original-invented-cast-not-authored', 'original-invented-cast-ruler-one'])
  expect(f.plan.assets.map(a => [a.id, a.kind])).toEqual([['normal-body', 'base'], ['normal-scene', 'splash']])
  expect(f.plan.pending).toBe(3)
  rmSync(f.owner, { recursive: true })
  expect(preparePrivatePlan(f.normal, 'cyberpunk', 'invented-cast')).toEqual(f.plan)
  expect(() => preparePrivatePlan(f.normal, 'cyberpunk', '../owner')).toThrow()
  const bad = structuredClone(f.plan); bad.assets[0]!.sourceFile = 'owner-private/normal.png'
  expect(() => parsePrivatePlan(bad)).toThrow()
})

it('packages owner-approved synthetic PNGs with the same IDs and excludes creative records', () => {
  const f = fixture()
  expect(f.pack()).toEqual({ packaged: 2, waiting: 0 })
  const pkg = checkPrivatePackage(f.outbox), asset = pkg.assets[0]!
  expect(asset.id).toBe('normal-body')
  expect(asset.actorId).toBe(f.plan.assets[0]!.actorId)
  expect(readFileSync(join(f.outbox, asset.path))).toEqual(png(9))
  expect(asset.path.endsWith('.private.png')).toBe(true)
  expect(existsSync(join(f.outbox, 'approvals.json'))).toBe(false)
  expect(() => f.pack()).toThrow()
})

it('refuses changed private approvals and stale normal source revisions', () => {
  const f = fixture()
  f.put(join(f.owner, f.plan.assets[0]!.privateFile), png(4))
  expect(() => f.pack()).toThrow(/OWNER_ASSET_CHANGED/)
  expect(existsSync(join(f.outbox, 'package.json'))).toBe(false)
  f.put(join(f.owner, f.plan.assets[0]!.privateFile), png(9))
  f.put(join(f.normal, f.plan.assets[0]!.sourceFile), png(4))
  expect(() => f.pack()).toThrow(/NORMAL_SOURCE_CHANGED/)
})

function memoryRemote(): Remote & { files: Map<string, { bytes: Buffer; generation: number }>; race: boolean } {
  const remote = {
    files: new Map<string, { bytes: Buffer; generation: number }>(), race: false,
    read(path: string) { const value = this.files.get(path); return value ? { text: value.bytes.toString('utf8'), generation: String(value.generation) } : null },
    uploadFolder() { throw new Error('Folder upload is not permitted') },
    uploadFile(file: string, path: string, generation: string) {
      const old = this.files.get(path)
      if ((this.race && path === 'index.json') || String(old?.generation ?? 0) !== generation) return false
      this.files.set(path, { bytes: readFileSync(file), generation: (old?.generation ?? 0) + 1 }); return true
    },
    list() { return [...this.files].map(([path, value]) => ({ path, bytes: value.bytes.length, md5: createHash('md5').update(value.bytes).digest('base64') })) },
  }
  return remote
}

it('uploads only selected files before a guarded index, preserves other slots and supports dry runs', () => {
  const f = fixture(); f.pack()
  const remote = memoryRemote(), receipt = join(f.root, 'receipt')
  expect(publishPrivatePackage(f.outbox, remote, receipt, '2026-01-03', true)).toMatchObject({ planned: 2, uploaded: 0, indexed: false })
  expect(remote.files.size).toBe(0)
  expect(publishPrivatePackage(f.outbox, remote, receipt, '2026-01-03')).toMatchObject({ uploaded: 2, indexed: true })
  expect(publishPrivatePackage(f.outbox, remote, receipt, '2026-01-04')).toMatchObject({ uploaded: 0, indexed: false })
  const pkg = checkPrivatePackage(f.outbox)
  expect(matchingPrivateAsset(pkg, f.plan.assets[0]!)).toBeTruthy()
  expect(matchingPrivateAsset(pkg, { ...f.plan.assets[0]!, sourceSha256: 'f'.repeat(64) })).toBeNull()
  const partial: PrivateArtPackage = { ...pkg, assets: [pkg.assets[0]!] }
  f.put(join(f.outbox, 'package.json'), partial)
  publishPrivatePackage(f.outbox, remote, receipt, '2026-01-04')
  expect(JSON.parse(remote.read('index.json')!.text).assets).toHaveLength(2)
  const other = memoryRemote(); other.race = true
  expect(() => publishPrivatePackage(f.outbox, other, receipt, '2026-01-05')).toThrow(/REMOTE_INDEX_RACE/)
  expect(other.files.has('index.json')).toBe(false)
})

it('rejects changed files, extra prompt fields and unsafe paths without reflecting sensitive errors', () => {
  const f = fixture(); f.pack()
  const pkg = checkPrivatePackage(f.outbox)
  f.put(join(f.outbox, pkg.assets[0]!.path), png(2))
  expect(() => checkPrivatePackage(f.outbox)).toThrow(/PRIVATE_FILE_CHANGED/)
  expect(() => parsePrivatePackage({ ...pkg, prompt: 'invented secret marker' })).toThrow()
  const bad = structuredClone(pkg); bad.assets[0]!.path = '../owner/private.png'
  expect(() => parsePrivatePackage(bad)).toThrow()
  expect(privateArtFailure(new Error('invented secret marker'))).not.toContain('invented secret marker')
  expect(() => runPrivateArt(['prepare', '--prompt-file', 'owner.txt'])).toThrow(/OWNER_ONLY_OPTION/)
})

it('exports only normal seeds and blocks output escapes through directory links', () => {
  const f = fixture(), seed = join(f.normal, 'private-art-control/seed-v001')
  expect(exportNormalSeedPack(f.normal, f.planFile, seed)).toEqual({ exportedNormalSources: 2, actors: 2 })
  const portable = parsePrivatePlan(JSON.parse(readFileSync(join(seed, 'plan.json'), 'utf8')))
  expect(portable.assets.map(a => a.id)).toEqual(f.plan.assets.map(a => a.id))
  for (const asset of portable.assets) expect(readFileSync(join(seed, asset.sourceFile))).toEqual(png())
  expect(() => exportNormalSeedPack(f.normal, f.planFile, seed)).toThrow(/OUTPUT_ALREADY_EXISTS/)
  expect(() => exportNormalSeedPack(f.normal, f.planFile, join(f.root, 'outside'))).toThrow(/OUTPUT_MUST_BE_IGNORED_CONTENT/)
  symlinkSync(f.owner, join(f.normal, 'shortcut'), process.platform === 'win32' ? 'junction' : 'dir')
  expect(() => contentDestination(f.normal, join(f.normal, 'shortcut/export'))).toThrow(/OUTPUT_MUST_BE_IGNORED_CONTENT/)
  expect(() => f.pack(join(f.normal, 'shortcut/outbox'))).toThrow(/OWNER_ROOT_NOT_ISOLATED/)
  f.put(join(f.normal, f.plan.assets[0]!.sourceFile), png(6))
  expect(() => exportNormalSeedPack(f.normal, f.planFile, join(f.normal, 'seed-v002'))).toThrow(/NORMAL_SOURCE_CHANGED/)
})

it('retains exact published IDs and unpainted roster identities across standard universes', () => {
  const f = fixture()
  for (const universe of ['farm-life', 'cyberpunk', 'high-fantasy']) {
    const root = join(f.normal, 'authoring/character-universes', universe)
    f.put(join(root, 'cast/roster.json'), { characters: [{ name: 'Pilot One', record: '../characters/pilot-one/character.json' }, { name: 'Pilot Two', record: '../characters/pilot-two/character.json' }] })
    f.put(join(root, 'characters/pilot-one/character.json'), { id: 101 })
    f.put(join(root, 'characters/pilot-two/character.json'), { id: '102' })
    const entry = { id: 'look-one', character: 'Pilot One', outfit: 'street', image: 'normal.png', sha256: digest(png()), width: 20, height: 30, approval: { status: 'approved', by: 'owner' } }
    f.put(join(root, 'approved/manifest.json'), { assets: [entry] })
    f.put(join(root, 'approved/normal.png'), png())
    f.put(join(root, 'splash-art/manifest.json'), { assets: [{ ...entry, id: 'scene-one' }] })
    f.put(join(root, 'splash-art/normal.png'), png())
    const plan = preparePrivatePlan(f.normal, universe)
    expect(plan.actors).toEqual(['101', '102'])
    expect(plan.assets.map(a => [a.id, a.actorId, a.kind])).toEqual([['look-one', '101', 'base'], ['pilot-one-splash-scene-one', '101', 'splash']])
  }
})

it('refuses changed snapshots and uses its checked staging copy when the outbox changes later', () => {
  const f = fixture(); f.pack()
  const pkg = checkPrivatePackage(f.outbox), remote = memoryRemote(), list = remote.list.bind(remote)
  let calls = 0
  remote.list = () => { if (++calls === 1) f.put(join(f.outbox, pkg.assets[0]!.path), png(4)); return list() }
  expect(() => publishPrivatePackage(f.outbox, remote, join(f.root, 'receipt'), '2026-01-03')).toThrow(/PRIVATE_FILE_CHANGED/)
  expect(remote.files.size).toBe(0)
  const second = join(f.root, 'outbox-again'); f.pack(second)
  const again = checkPrivatePackage(second), other = memoryRemote(), upload = other.uploadFile.bind(other)
  other.uploadFile = (file, path, generation) => {
    if (path.endsWith('.private.png')) {
      expect(file.startsWith(second)).toBe(false)
      const asset = again.assets.find(a => a.path === path)!
      f.put(join(second, path), png(4))
      expect(digest(readFileSync(file))).toBe(asset.sha256)
    }
    return upload(file, path, generation)
  }
  expect(publishPrivatePackage(second, other, join(f.root, 'receipt'), '2026-01-03')).toMatchObject({ uploaded: 2, indexed: true })
})

it('blocks private gallery paths and private normal-source references, including directory links', () => {
  const f = fixture(), base = join(f.root, 'gallery')
  f.put(join(base, 'normal.png'), png())
  f.put(join(base, 'owner-private/private.png'), png(9))
  f.put(join(base, 'normal.private.png'), png(9))
  f.put(join(base, 'private-art-outbox/normal.png'), png(9))
  expect(fileFor(base, '/normal.png')).toBeTruthy()
  expect(fileFor(base, '/owner-private/private.png')).toBeNull()
  expect(fileFor(base, '/normal.private.png')).toBeNull()
  expect(fileFor(base, '/private-art-outbox/normal.png')).toBeNull()
  expect(mediaFile(base, ['normal.private.png'])).toBeNull()
  symlinkSync(join(base, 'owner-private'), join(base, 'shortcut'), process.platform === 'win32' ? 'junction' : 'dir')
  expect(fileFor(base, '/shortcut/private.png')).toBeNull()
  expect(mediaFile(base, ['shortcut', 'private.png'])).toBeNull()
  expect(() => normalSourceFile(base, 'shortcut/private.png')).toThrow(/OWNER_ONLY_DIRECTORY/)
})

it('keeps private PNGs out of the normal publisher even when a normal manifest references them', () => {
  const f = fixture(), approved = join(f.normal, 'authoring/character-universes/farm-life/approved')
  f.put(join(approved, 'normal.private.png'), png(9))
  f.put(join(approved, 'manifest.json'), { assets: [{ id: 'look-one', character: 'Pilot One', outfit: 'street', image: 'normal.private.png', sha256: digest(png(9)), width: 20, height: 30, approval: { status: 'approved', by: 'owner' } }] })
  const collection = readCollection('farm-life', approved)
  expect(collection.looks).toEqual([])
  expect(collection.refused).toHaveLength(1)
  expect(collection.refused[0]!.why).toContain('separate opaque publisher')
})
