# Publish selected Farm Life characters

Run from `uma-art-authoring` with the sibling `uma-platform` checkout and the existing scoped Google Cloud CLI configuration. Keep plans, staged releases, and readback evidence under ignored `content/`. Replace the example character keys and numeric master-data IDs with the approved selections.

## Publish to Character Art

Check each character's `active-study.json`, wardrobe approval hashes, dialogue recipe and approval record, and splash study before pushing. The active portrait manifest needs collection-level `approval.status: approved` and `approval.by: owner`, even when `ownerApproved` and every state flag are already true. Set this metadata from the recorded owner approval and link the existing approval record. Keep all approved PNG, face, and crop hashes intact.

```powershell
$keys = 'harbor-runner,orchard-scout'

pnpm run publish farm-life "--only=$keys" --no-release --dry-run
pnpm run publish farm-life "--only=$keys" --portraits --no-release --dry-run
```

Review both plans. The first matches the normalized Character Art character name or look ID and includes outfits and splash PNGs. The portrait pass matches the character IDs in the portrait recipe, normally the local character folder keys. Verify the keys in each plan if their spellings differ. The standard wardrobe has 12 outfit PNGs, 9 splash PNGs and 12 portrait bases. Use the [expression workflow](farm-life-expressions.md) and `pnpm farm:expressions check --manifest <selected-manifest> --approved` to check the selected reviews. The scene-based minimum is 126 reviews across the standard wardrobe, using up to 15 shared non-neutral faces. Existing complete 192-state approvals remain intact. Numbered looks add their own bases and scene requirements. Derive expected state counts from the selected manifest and approval records rather than requiring sixteen approved combinations for every new base. Keep exact hash/pixel verification and investigate missing or refused assets before publishing.

```powershell
pnpm run publish farm-life "--only=$keys" --no-release
pnpm run publish farm-life "--only=$keys" --portraits --no-release
```

Save the live `art/universes/farm-life/index.json` and `art/universes/farm-life/portraits/index.json` from the Character Art bucket before the upload. Run the passes in order and stop on a nonzero exit. Each checks the uploaded bytes and updates its index last. Read both indexes back and verify the selected entries against their approved SHA-256 values and expected counts. Compare the unselected entries with the saved indexes.

Keep `--no-release` on both passes for a selected-character release. `--only` scopes the Character Art upload. The automatic Farm master-data release repacks the full published roster, which can produce different profile encodings even when the original PNG and crop are unchanged.

## Windows launcher for Platform commands

The art repo's publisher already launches `gcloud.cmd` on Windows. If the sibling release tools call `execFile('gcloud', …)` and report `ENOENT`, use a per-session Node preload until those tools support Windows directly. A second Windows issue is `cmd.exe`'s command-line limit on large multi-file copies. The preload below batches the Platform tools' `storage cp` calls to a directory and keeps conditional writes and single-object copies intact.

Save this as `content/farm-gcloud-windows.cjs`. It passes through the release tools' account, project, and other subprocess options.

```js
const cp = require('node:child_process');
const { syncBuiltinESMExports } = require('node:module');
const { statSync } = require('node:fs');
const { promisify } = require('node:util');
const { execFile, execFileSync } = cp;
const execute = promisify(execFile);

function quoted(args) {
  return args.map(arg => {
    if (/["\r\n%!]/.test(arg)) throw new Error('Unsupported Windows gcloud argument');
    return '"' + arg + '"';
  });
}

function copyBatches(args) {
  const length = values => values.reduce((n, v) => n + v.length + 3, 0);
  if (length(args) < 7000 || args[0] !== 'storage' || args[1] !== 'cp') return [args];

  const destination = args.at(-1);
  const isDirectory = destination.startsWith('gs://')
    ? destination.endsWith('/')
    : statSync(destination, { throwIfNoEntry: false })?.isDirectory();
  const options = args.slice(2, -1).filter(v => v.startsWith('--'));
  const sources = args.slice(2, -1).filter(v => !v.startsWith('--'));
  if (!isDirectory || sources.length < 2 || options.some(v => v.startsWith('--if-generation-match'))) {
    return [args];
  }

  // Platform's multi-copy flags are standalone switches or --flag=value.
  const prefix = ['storage', 'cp', ...options];
  const result = [];
  let batch = [];
  for (const source of sources) {
    if (batch.length && length([...prefix, ...batch, source, destination]) >= 7000) {
      result.push([...prefix, ...batch, destination]);
      batch = [];
    }
    batch.push(source);
  }
  result.push([...prefix, ...batch, destination]);
  return result;
}

function launch(file, args, options, ...rest) {
  if (file !== 'gcloud') return execFile(file, args, options, ...rest);
  return execFile('gcloud.cmd', quoted(args), { ...options, shell: true }, ...rest);
}

launch[promisify.custom] = async (file, args, options) => {
  if (file !== 'gcloud') return execute(file, args, options);
  let result;
  for (const batch of copyBatches(args)) {
    result = await execute('gcloud.cmd', quoted(batch), { ...options, shell: true });
  }
  return result;
};

cp.execFile = launch;
cp.execFileSync = (file, args, options) => {
  if (file !== 'gcloud') return execFileSync(file, args, options);
  let result;
  for (const batch of copyBatches(args)) {
    result = execFileSync('gcloud.cmd', quoted(batch), { ...options, shell: true });
  }
  return result;
};
syncBuiltinESMExports();
```

Enable it in the PowerShell session that runs the Platform commands. Use forward slashes in the quoted `NODE_OPTIONS` path so Node preserves the separators. Confirm the launcher with a read-only SDK version check. Close that shell or restore its previous environment when finished.

```powershell
$shim = (Resolve-Path 'content/farm-gcloud-windows.cjs').Path.Replace([char]92, '/')
$env:NODE_OPTIONS = ("$env:NODE_OPTIONS --require=" + '"' + $shim + '"').Trim()
node -e "const {execFileSync}=require('node:child_process'); console.log(execFileSync('gcloud',['--version'],{encoding:'utf8'}))"
```

## Pack and stage only the selected character families

In the art repo shell, point the Platform packers at the art repo's mirror. Both packers read from the published Character Art indexes and write to the Platform checkout's private release folder.

```powershell
$platform = (Resolve-Path '../uma-platform').Path
$env:ART_DIR = Join-Path (Get-Location).Path 'content/published/art'

pnpm --dir $platform portraits:pack farm-life
pnpm --dir $platform illustrations:pack farm-life
```

The illustration packer expects `uma-platform/content/authoring/illustrations/farm-life.json`. If it is missing, compare the Farm brief's `scene-set.json` defaults with the existing `latest` illustration manifests. The scene ID takes precedence, with the next unused slot for its outfit as the fallback. Restore explicit overrides for any live scene whose moment differs from that default. If all live moments match the defaults, use `{"universe":"farm-life","moments":{}}`. Keep an existing map and its overrides.

Stage a fresh release input whose `dialoguePortraits` and `illustrations` maps contain only the selected numeric master-data IDs from their `character.json` files. Keep each character manifest and every picture it references. The families-only publisher will merge those maps into the live `latest` art index. The example below uses the existing release helpers to bind the staged files to their hashes. The staging manifest retains set metadata for schema validation. The live release supplies the actual master sets.

```powershell
$stage = Join-Path (Get-Location).Path 'content/farm-release-selection'
$ids = @('1234', '5678')

@'
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { CHARACTER_FAMILIES } from '../uma-platform/scripts/data/src/character-families-only.ts';
import {
  readLocalManifest, readVerifiedFile, writeLocalManifest, writeReleaseFile,
} from '../uma-platform/scripts/data/src/release-dir.ts';

const [, , stage, ...ids] = process.argv;
const source = '../uma-platform/content/release';
const packed = await readLocalManifest(source);
assert(packed?.art && ids.length > 0 && new Set(ids).size === ids.length);
const entries = new Map(packed.files.map(file => [file.path, file]));
async function verified(name) {
  const entry = entries.get(name);
  assert(entry, 'Missing packed file ' + name);
  return readVerifiedFile(source, entry);
}

const art = JSON.parse(await verified(packed.art));
const selected = { ...art };
const wanted = new Set();
for (const key of ['dialoguePortraits', 'illustrations']) {
  selected[key] = {};
  for (const id of ids) {
    const name = art[key]?.[id];
    assert(name, 'Missing ' + key + ' for ' + id);
    const family = CHARACTER_FAMILIES[key].read(JSON.parse(await verified(name)), name);
    assert.equal(String(family.characterId), id);
    selected[key][id] = name;
    wanted.add(name);
    for (const picture of family.pictures) wanted.add(picture);
  }
}

await fs.mkdir(stage);
const files = Object.values(packed.sets).filter(Boolean).map(name => entries.get(name));
for (const name of wanted) {
  const destination = path.join(stage, name);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, await verified(name), { flag: 'wx' });
  files.push(entries.get(name));
}
const artFile = await writeReleaseFile(stage, 'data', 'art', 'json', JSON.stringify(selected));
await writeLocalManifest(stage, {
  sources: packed.sources, sets: packed.sets, art: artFile.path, files: [...files, artFile],
});
'@ | node --import tsx --input-type=module - $stage @ids
```

Use a new staging directory for a fresh run. Inspect its art index for the intended IDs in both maps. Keep the full packed release separate.

## Check the candidate and promote

Read `latest` before publishing the candidate. The scope check below verifies that the candidate has every existing unselected family path and exactly the intended selected paths. The paths include content hashes, so this also catches a changed thumbnail inside a previously published portrait manifest.

```powershell
function Read-FarmReleaseJson([string]$ObjectPath) {
  $lines = gcloud storage cat "gs://uma-platform-master-data/$ObjectPath" --configuration=default --project=uma-platform-lm
  if ($LASTEXITCODE -ne 0) { throw "Cannot read $ObjectPath" }
  ($lines -join [Environment]::NewLine) | ConvertFrom-Json -AsHashtable
}

function Read-FarmArt($Pointer) {
  $manifest = Read-FarmReleaseJson $Pointer.manifest
  Read-FarmReleaseJson "files/$($manifest.art)"
}

$before = Read-FarmReleaseJson 'channels/v1/latest.json'
$previous = Read-FarmArt $before
$stagedManifest = Get-Content -Raw -LiteralPath (Join-Path $stage 'manifest.json') | ConvertFrom-Json -AsHashtable
$selected = Get-Content -Raw -LiteralPath (Join-Path $stage $stagedManifest.art) | ConvertFrom-Json -AsHashtable

pnpm --dir $platform release:publish -- --portraits-only --illustrations-only --channel candidate --release-dir $stage |
  Tee-Object -Variable publishedOutput
if ($LASTEXITCODE -ne 0) { throw 'Candidate publish failed' }

$versionLines = @($publishedOutput | Select-String '^Version: ([a-f0-9]+)$')
if ($versionLines.Count -ne 1) { throw 'Candidate publish did not report one version' }
$version = $versionLines[0].Matches[0].Groups[1].Value
$candidate = Read-FarmReleaseJson 'channels/v1/candidate.json'
if ($candidate.version -ne $version) { throw 'Candidate moved' }
$proposed = Read-FarmArt $candidate
foreach ($family in 'dialoguePortraits', 'illustrations') {
  foreach ($id in $ids) {
    if (!$selected[$family][$id] -or $proposed[$family][$id] -cne $selected[$family][$id]) {
      throw "Selected $family entry does not match the stage for $id"
    }
  }
  foreach ($id in $previous[$family].Keys) {
    if ($id -notin $ids -and $proposed[$family][$id] -cne $previous[$family][$id]) {
      throw "Previously published $family entry changed for $id"
    }
  }
  foreach ($id in $proposed[$family].Keys) {
    if ($id -notin $ids -and !$previous[$family].Contains($id)) {
      throw "Unexpected $family entry for $id"
    }
  }
}

pnpm --dir $platform release:check -- --channel candidate --against latest
if ($LASTEXITCODE -ne 0) { throw 'Candidate readback failed' }

if ((Read-FarmReleaseJson 'channels/v1/latest.json').version -ne $before.version -or
    (Read-FarmReleaseJson 'channels/v1/candidate.json').version -ne $version) {
  throw 'A release pointer moved. Rebuild the candidate on the current latest and check again.'
}

pnpm --dir $platform release:publish -- --promote $version
if ($LASTEXITCODE -ne 0) { throw 'Promotion failed' }

pnpm --dir $platform profiles:push farm-life
if ($LASTEXITCODE -ne 0) { throw 'Profile publication failed' }
```

The game-client readback downloads and validates the release's images and can take several minutes. After promotion, read `latest` again and verify each selected character's dialogue manifest, nine splash moments, and profile thumbnails. The profiles command rebuilds the Character Art profile index from the promoted release, so the other characters keep their existing thumbnail hashes. Record the new and previous release versions and the selected character IDs in the private handoff.
