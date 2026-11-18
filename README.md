# Uma Art Authoring

Run `pnpm install` and `pnpm gallery` for the [Local Art Gallery](http://127.0.0.1:4323).
Choose Uma Quest, Uma Farm, or Uma Cyberpunk, then choose an art type and open an album.
Characters follow the first five Ranker tiers. The first authored look takes the card image
when available. Albums use Character Art, Facial Expressions, and Splash Art in every universe.
Cyberpunk also has Boss Enemy, Boss Ally, and Lieutenant albums. Boss Ally shows the
existing off-duty looks and the shared pilot suits.

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
