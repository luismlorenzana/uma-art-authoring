# Farm Character Sprites

Character Sprites is a separate tab inside each Farm character album. It follows the existing ranked 50-character
cast and references each character's existing identity and approved Farm art. Preparation creates metadata only;
it does not copy baseline images, generate sprites or grant approval.

## Prepare and check

```text
pnpm farm:categories --category character-sprites --dry-run
pnpm farm:categories --category character-sprites
pnpm farm:categories --category character-sprites --check
```

The private workspace is `content/authoring/character-universes/farm-life/categories/character-sprites/`:

- `approved/manifest.json` holds promoted selections; it starts with an empty `assets` list.
- `characters/<key>/brief.md` links the existing character record and describes the sprite workflow.
- `characters/<key>/active-study.json` starts on `v001` with `ownerApproved: false`.
- `characters/<key>/v001/manifest.json` starts with the character-name mapping and an empty `fullBodyAssets` list.

Preparation requires all 50 cast entries and preserves every existing brief, active pointer and manifest. `--check`
reports missing preparation files without writing them. New attempts use `v002/`, `v003/` and subsequent versions.
Keep the active approved selection while developing a correction and preserve earlier studies and approval evidence.

## Author and review

Use the character's existing owner-approved Farm designs as references. Record the intended pose, direction, native
canvas size, transparency and any frame-grid layout before authoring. This category does not establish a particular
sprite style, animation list, direction count or frame size. The album reviews native PNG images and sheets; it does
not infer an animation from a sheet or convert it into a gameplay sprite pack.

Save each native PNG once in its character study. A `fullBodyAssets` entry uses the existing publisher contract:
`id`, `outfit` (the sprite variant key), `title`, relative PNG `image`, `width`, `height`, `sha256`, and, after the exact
owner verdict, `approval: { status: "approved", by: "owner", on: "YYYY-MM-DD" }`. Keep pose/frame details and exact
prompts, reference roles and hashes, output hashes and approval wording beside the study. Avoid duplicate IDs within
the same character. Keep sprite assets in this category, apart from wardrobe, expression and splash manifests.

After approval, set the exact version's active pointer to `ownerApproved: true`. Approval of the version does not
replace each asset's approval and hash checks. Existing unapproved or damaged assets cannot become published by
moving them into this folder.

## Publish into Uma Platform

```text
pnpm run publish farm-life --category character-sprites --only pilot-one --dry-run
pnpm run publish farm-life --category character-sprites --only pilot-one
```

Use real character keys in place of the invented example. Run the live command only on the owner's publishing
instruction. The publisher scopes the upload to the selected category and characters, verifies approved PNG bytes,
hashes and dimensions, uploads files first and updates the universe index last with its generation check. Other
categories and characters retain their published selections. Status records and the local publication mirror use
the existing publisher mechanics.

The private Platform universe index retains `category: "character-sprites"`. Character Art shows the approved
images under a separate **Character Sprites** section on the matching character/outfit page. Original characters
and alternate outfit identities keep their existing identity matching. Empty categories do not create a Platform
section until an approved image has been published.

The category command stops at Platform Character Art. It does not run Farm's automatic master-data release hook,
replace the existing master sprite families or change the game's renderer. Gameplay animation packing and release
bindings can be added when their format is established.
