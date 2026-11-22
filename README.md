# Uma Art Authoring

## Duo Splash Art

Run `pnpm duos --all` to prepare Farm's 75 shared pairs and Cyberpunk's 50 crew/Boss Ally pairs from their existing
private metadata. `pnpm duos --all --check` validates the preparation. The Farm Duos menu and character album tabs
reference the existing authored profiles and save each pair's splash once. Cyberpunk's Duo Splash Art tab belongs
to the crew character. Read the [authoring and publishing workflow](docs/duo-splash-authoring.md) before starting.
Farm art sessions must follow the committed [Farm pairing register](docs/duo-splash-authoring.md#farm-pairing-register).

Run `pnpm install` and `pnpm gallery` for the [Local Art Gallery](http://127.0.0.1:4323).
Choose Uma Quest, Uma Farm, or Uma Cyberpunk, then choose an art type and open an album.
Characters follow the first five Ranker tiers. The first authored look takes the card image
when available. Albums use Character Art, Facial Expressions, and Splash Art in every universe.
Cyberpunk also has Boss Enemy, Boss Ally, and Lieutenant albums. Boss Ally shows the
existing off-duty looks and the shared pilot suits.

Every Cyberpunk crew, Boss Enemy, Boss Ally, and Lieutenant album also has Weapons and Combat Sprites tabs.
Run `pnpm cyberpunk:categories` to prepare their character folders. Save crew
studies under `content/authoring/character-universes/cyberpunk/categories/<category>/characters/<key>/`,
using `weapons` or `combat-sprites`. They use the same approval manifest and
`active-study.json` format as the additional Farm collections below.
Publish an approved crew selection with `pnpm run publish cyberpunk --category weapons --only <character-key> --dry-run`,
or select `combat-sprites`. The published Character Art page groups these categories separately.

The Cyberpunk Combat Sprites tab also plays versioned bundles for local review. Point an
`active-bundle.json` containing `{"schemaVersion":1,"version":"v001"}` at a version's
`bundle.json` and texture pages. The player checks the bundle, lets you select the fitting,
direction and action, and shows frame timings and anchors. Check a version from this checkout
with `node --import tsx src/check-combat-sprites.ts <version-folder>`. The local draft selection
is independent of the still-image publishing command and its approval records.

Enemy album studies use `cyberpunk/<role>/categories/<category>/characters/<unit-id>/vNNN/`,
where `<role>` is `enemies`, `enemies/casual`, or `enemies/lieutenants`.
Each version uses `fullBodyAssets` in its manifest. Curated selections can instead use
`categories/<category>/approved/manifest.json` under the same role, matched by `unitId`.
The folder command prepares each role from its existing cast records.

Every Farm character album has four additional tabs, Pajama Outfits, Wedding Anniversary Outfits,
Pajama Splash, and Wedding Anniversary Splash. Run `pnpm farm:categories` once to prepare
their 50 character folders. `--dry-run` previews missing files.

Work in `content/authoring/character-universes/farm-life/categories/<category>/characters/<key>/vNNN/`.
An approved `active-study.json` beside the versions selects a manifest with `fullBodyAssets`
for outfits or `assets` for splash art. Each asset needs its character, id, outfit, image,
dimensions, SHA-256, and dated owner approval. Category-wide approved selections can instead
live in `categories/<category>/approved/manifest.json`. Give each selection a unique id
within that character's category. The ranked roster and baseline references are reused.

Publish a category with `pnpm run publish farm-life --category pajama-outfits --only <character-key> --dry-run`.
Use `pajama-outfits`, `wedding-anniversary-outfits`, `pajama-splash`, or
`wedding-anniversary-splash`. Remove `--dry-run` on the owner's publishing instruction.
The index carries the category to Character Art, where it has its own heading on the
character's page. These extra collections have their own approval and publication records.
Category publishing updates Character Art. The standard game scene set continues to use
the standard splash collection.

`pnpm rosters --dry-run` checks the three rosters and their full-body baselines against the existing
ranked baseline library. `pnpm rosters` fills missing character folders, references, and briefs,
then updates the ordered lists. It preserves existing authoring files.

`pnpm albums --check` compares generated pages with the saved albums. `pnpm albums` rebuilds the albums in place.

Private work lives in `content/authoring/`, including `character-universes/` and `splash-art/`.
Set `UMA_ART_CONTENT` for an alternate private directory or `UNIVERSES_DIR` for a universe collection directory.
The Ranker stays in the sibling `uma-platform` checkout. Set `UMA_PLATFORM_ROOT` or `RANKER_DIR` to use it elsewhere.

Run `pnpm cast cyberpunk --dry-run` to preview a cast-folder sync.
On the owner's publishing instruction, run `pnpm run publish <universe> [--enemies | --portraits] [--only <ids>]`.
`--dry-run` plans a publish using existing bucket metadata. The publisher uses the existing scoped Google Cloud CLI configuration and bucket.
`pnpm status` refreshes the publication records without uploading art.

## Farm Life facial expressions

Use the [Farm expression workflow](docs/farm-life-expressions.md) and the game's scene-based approval matrix.
Run `pnpm farm:expressions plan` before a new expression pass, or use `--all-looks` to include numbered pajamas
and formal anniversary looks. Existing approved sets are carried forward. New numbered night looks start with
Neutral, Tender and Loving; actual story beats can add reviews. This changes the technical review workload while
leaving character and outfit design free-form. The private Farm `README.md` and `handoff.md` identify current work;
older pilot studies and pair runners remain historical records.

`pnpm farm:expressions check --manifest <selected-manifest> --approved` checks planned review coverage and declared
approvals. Continue running the saved-piece pixel/mask verifier and recording the owner's exact-image verdict.

## Farm Life publishing

Use the [selected-character publishing runbook](docs/farm-life-publishing.md) to publish approved outfits,
splash art, and dialogue portraits, then verify and promote the scoped Farm master-data release. The runbook
includes the Windows launcher workaround.

Commit source code and synthetic fixtures only. Keep originals, drafts, exact approvals, manifests, references and generated files under the ignored `content/`. CI validates the Git index.

## Cyberpunk four-pillar packets

Start with the [canonical Cyberpunk packet queue](https://github.com/luismlorenzana/uma-cyberpunk/blob/main/docs/handoff/README.md#four-pillar-art-and-story-queue) and [shared delivery contract](https://github.com/luismlorenzana/uma-cyberpunk/blob/main/docs/design/campaign-art-delivery.md). The art work begins with Pillar 1's four splash scenes.

The local full handoff is at `content/cyberpunk-four-pillars/README.md`. Its source revision and hashes identify the canonical snapshot. `content/cyberpunk-four-pillars-handoff.json` identifies the game checkout and one shared private progress register. These local files stay ignored with other authoring material; cast, scripts, pictures and verdicts remain private. Refresh the handoff from the canonical queue when its contracts change.

## Cyberpunk game publishing

An approved Cyberpunk publish now updates Platform first, then runs the game’s scoped art-only publisher. Looks, portrait recipes, enemies and the Weapons/Combat Sprites category events pass their exact `--only` selection to the game. `--no-release` stops at Platform; `--dry-run` assesses currently published game sources without uploading. Farm retains its existing master-data release path.

Set `UMA_CYBERPUNK_ROOT` to the game checkout, or use the existing ignored handoff’s `canonicalGameCheckout`. The game registry is `content/campaign-art-plan/art-publish.json` (`CYBER_ART_CONFIG` overrides it). See the [game publishing runbook](https://github.com/luismlorenzana/uma-cyberpunk/blob/main/docs/technical/campaign-art-publishing.md) for candidates, private receipts, missing bindings and recovery. A game-stage failure exits nonzero after Platform may already have received the art; repair through the game’s `pnpm art:publish` command. Publishing a category does not implement an unfinished game renderer.
