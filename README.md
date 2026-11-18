# Uma Art Authoring

Run `pnpm install` and `pnpm gallery` for the [Local Art Gallery](http://127.0.0.1:4323).
Choose Uma Quest, Uma Farm, or Uma Cyberpunk, then choose an art type and open an album.
Characters follow the first five Ranker tiers. The first authored look takes the card image
when available. Albums use Character Art, Facial Expressions, and Splash Art in every universe.
Cyberpunk also has Boss Enemy, Boss Ally, and Lieutenant albums. Boss Ally shows the
existing off-duty looks and the shared pilot suits.

Every Cyberpunk crew character album also has Weapons and Combat Sprites tabs.
Run `pnpm cyberpunk:categories` to prepare their character folders. Save versioned
studies under `content/authoring/character-universes/cyberpunk/categories/<category>/characters/<key>/`,
using `weapons` or `combat-sprites`. They use the same approval manifest and
`active-study.json` format as the additional Farm collections below.
Publish an approved selection with `pnpm run publish cyberpunk --category weapons --only <character-key> --dry-run`,
or select `combat-sprites`. The published Character Art page groups these categories separately.

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

## Farm Life publishing

Use the [selected-character publishing runbook](docs/farm-life-publishing.md) to publish approved outfits,
splash art, and dialogue portraits, then verify and promote the scoped Farm master-data release. The runbook
includes the Windows launcher workaround.

Commit source code and synthetic fixtures only. Keep originals, drafts, exact approvals, manifests, references and generated files under the ignored `content/`. CI validates the Git index.
