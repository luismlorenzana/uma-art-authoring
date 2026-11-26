# Owner-private base and splash alternatives

One optional private alternative can accompany an existing approved base or splash, preserving its exact universe,
collection, actor identity and published image ID. Standard character collections in every universe and independent
original casts use the same contract. Approved additional outfit/splash categories and duo splashes retain their
published IDs. Expressions, weapons and sprites are outside this workflow.

There is no unlock key, encryption setup, model installation or game-setting change. Private PNGs use a separate
outbox and cloud feed. The owner edits and approves them privately on the Mac; an agent may run the dedicated
publisher as an opaque transfer. No generation prompts or refusal fallback are implemented here.

## Agent restrictions

`AGENTS.md` and `CLAUDE.md` prohibit viewing private images and related prompts, histories, editing notes or actual
approvals across local storage, archives, cloud, browsers and caches. Do not search private directories, inspect
embedded PNG metadata, generate contact sheets or request private screenshots. Keep private game views off during
agent work. Never preview cloud asset URLs as a publication check.

The only allowed private operations are the documented `check` and `publish` commands. They parse a strict technical
manifest and check file sizes/checksums or copy files without image decoding, text extraction or thumbnails. They
return counters or fixed error codes; private image bytes and documents never enter the agent's conversation.
Do not replace these commands with ad hoc scripts, raw manifest dumps or recursive folder uploads.

These are agent-conduct restrictions. They do not establish OS access control, cloud authentication or encryption.
The normal gallery rejects reserved private directories and `.private.` filenames, including resolved links. The
normal publishing feed stays separate. A future private-mode switch must be understood as a display preference,
not an access-security guarantee. Existing bucket permissions remain unchanged by this bootstrap.

## Agent: prepare normal references

Run from the Art checkout. Set `UMA_ART_CONTENT` to its existing ignored content root when using a worktree.
Substitute a universe key and either `characters` or the private original collection key:

```text
pnpm private-art prepare --universe <universe> --collection <collection>
pnpm private-art prepare --universe <universe> --collection <collection> --check
```

The plan is `content/private-art-control/<universe>/<collection>/plan.json`. It contains only normal reference paths,
source hashes/dimensions, actor/image IDs and deterministic slots. All registered original identities are retained,
including those with no approved art. Missing pointers and unapproved assets remain pending. Stale rank counts are
a separate registry concern; preparation does not rewrite identities or approve anything.

A changed plan fails rather than overwriting a previous revision. Use `--out` with a new `.json` path under ignored
content for a new source revision. `--check` validates current metadata and compares an existing saved plan without
writing. The owner command later verifies the normal source's actual hash before accepting its private alternative.

Export a portable normal seed pack for the Mac:

```text
pnpm private-art export --plan <plan.json> --out <content/private-art-control/seed-pack-v001>
```

The new directory contains normal approved PNGs in `sources/`, a portable `plan.json`, and a blank
`owner-approval-template.json`. Only pinned normal sources are copied. All output stays ignored. Transfer this pack
and the repository's code to the Mac. Do not place private outputs or editing prompts inside the normal seed pack.

## Owner only: Draw Things handoff

These steps are for the owner, never for an agent to execute against actual private material.

1. Keep the normal seed pack outside the private authoring directory. Create a separate unsynced owner directory
   outside the repository. Retain the existing Draw Things installation and owner-operated editing process.
2. For each accepted normal source, the plan's `privateFile` specifies the private output **relative to the owner
   directory**: `<actor-id>/<base-or-splash>/<image-id>.private.png`. Preserve dimensions and IDs. Prompts, histories
   and editing notes stay owner-only; no agent should read or help author them.
3. Copy the blank approval template into that owner directory. For each exact image accepted, set `ownerApproved`
   true, `approvedOn` to `YYYY-MM-DD`, and `sha256` to the private PNG's SHA-256. Preserve `slot` and `sourceSha256`.
   Leave unfinished entries false. The owner can obtain hashes locally with `shasum -a 256`; do not send actual
   approval records, filenames or hash-command output to an agent.
4. Run the owner-only Mac command below. Choose a new outbox directory, preferably named `private-art-outbox`.

```text
pnpm private-art:owner --owner-run --plan <seed-pack/plan.json> --source-root <seed-pack> --owner-root <owner-private-directory> --approvals <owner-private-directory/approvals.json> --out <exchange/private-art-outbox/v001>
```

This command refuses non-macOS execution. It checks the exact owner-approved image's hash, PNG dimensions, source
revision and containment. It exports only the selected PNGs and a strict technical `package.json`, with no separate
prompts, histories or actual approval documents. It does not inspect or remove embedded PNG metadata; any embedded
generation information remains owner-private and must never be extracted by an agent. Outboxes inside the repo
must be under ignored `content/`. Transfer only this designated outbox back for opaque publishing. Do not transfer
the entire owner workspace. There is no key to create or enter.

## Agent: publish separately

Accept an outbox only from the owner's packaging command. Never browse it or open its images. Point the CLI at its
known directory and read only its counters:

```text
pnpm private-art check --package <private-art-outbox/v001>
pnpm private-art publish --package <private-art-outbox/v001> --dry-run
pnpm private-art publish --package <private-art-outbox/v001>
```

Publish on the owner's instruction. The existing scoped Cloud CLI identity and bucket are reused. Only exact
manifest-selected files are copied. Private PNGs go to `art-private/<universe>/<collection>/images/` with `.private.png`
suffixes and a separate `index.json`. Files are uploaded and verified through storage checksums before a guarded
index update. Partial packages preserve unrelated slots, unchanged packages are idempotent, and concurrent index
changes fail safely. Temporary copies are outside galleries and removed on completion. Receipts stay in ignored
`content/private-art-control/`. Error output never includes payloads or raw external-tool diagnostics.

The normal art index, master data and game publisher are not invoked. For original casts, this separate feed does
not fill in their missing normal Platform publishing integration or disguise them as ranked character IDs. No actual
private image is uploaded by preparing a plan or running synthetic tests.

## IDs and later game support

The private feed contains the same `actorId`, `id` and `kind` (`base` or `splash`) as the normal selection, plus its
normal `sourceSha256`. Its `slot` is SHA-256 of JSON `[universe, collection, actorId, kind, id]`. The separate image
path includes the slot and file hash so uploads never overwrite a current image before the index is updated.
Select a private image only when the current normal source hash still matches; otherwise use normal art. Missing
variants likewise use normal art. Game settings/readers remain separate work for the game sessions.

Real identities, plans, seed packs, outboxes, receipts and art remain ignored. Commit only generic source,
documentation and small invented fixtures. Do not add private previews to the normal gallery or story sandbox.
