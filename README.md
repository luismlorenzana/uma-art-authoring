# Uma Art Authoring

Run `pnpm install` and `pnpm gallery` for the [Local Art Gallery](http://127.0.0.1:4323).
`pnpm albums --check` compares generated pages with the saved albums. `pnpm albums` rebuilds the albums in place.

Private work lives in `content/authoring/`, including `character-universes/` and `splash-art/`.
Set `UMA_ART_CONTENT` for an alternate private directory or `UNIVERSES_DIR` for a universe collection directory.
The Ranker stays in the sibling `uma-platform` checkout. Set `UMA_PLATFORM_ROOT` or `RANKER_DIR` to use it elsewhere.

Run `pnpm cast cyberpunk --dry-run` to preview a cast-folder sync.
On the owner's publishing instruction, run `pnpm publish <universe> [--enemies | --portraits] [--only <ids>]`.
`--dry-run` plans a publish using existing bucket metadata. The publisher uses the existing scoped Google Cloud CLI configuration and bucket.
Farm Life publishing runs the Platform master-data release command using this repo's local publication mirror.
`pnpm status` refreshes the publication records without uploading art.

Commit source code and synthetic fixtures only. Keep originals, drafts, exact approvals, manifests, references and generated files under the ignored `content/`. CI validates the Git index.
