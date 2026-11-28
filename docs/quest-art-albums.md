# Quest expressions, splash art and character sprites

Every Uma, Human and Elf album has four tabs: Character Art, Facial Expressions, Splash Art and Character Sprites.
The three additional sections are separate versioned workspaces. They use each actor's approved **Quest** outfit
base, rather than assuming the imported Cyberpunk identity reference is a finished Quest outfit.

## Prepare and validate

```text
pnpm quest:albums --dry-run
pnpm quest:albums
pnpm quest:albums --check
```

Set `UMA_ART_CONTENT` or `UNIVERSES_DIR` when using another checkout. Preparation covers all three cast sections,
creates missing files only, and refreshes generated input references. It preserves existing manifests, version
pointers, native images and owner approvals. It does not draw, copy, crop, approve or publish art.

The command validates approved assets from each actor's selected Character Art study. `inputs.json` in each section
records the actor identity, exact source IDs/hashes/dimensions and relative image paths. An actor without an approved
Quest base stays `awaiting-approved-quest-base`, with no fabricated input or Cyberpunk fallback. The album displays
reference links separately from the section's outputs. A reference is not an authored expression, splash or sprite.

After a new base is approved, rerun preparation to refresh the generated input records. Keep an attempt's exact input
IDs/hashes with that attempt; refreshing current inputs never renews an old output's approval.

## Folders

For each actor's existing character folder:

- Facial Expressions: `dialogue-portraits/active-study.json` and `dialogue-portraits/vNNN/manifest.json`.
- Splash Art: `splash-art/active-study.json` and `splash-art/vNNN/manifest.json`.

Character Sprites follows the existing category layout:

- Umas: `high-fantasy/categories/character-sprites/characters/<key>/`.
- Humans: `high-fantasy/enemies/categories/character-sprites/characters/<unit-id>/`.
- Elves: `high-fantasy/enemies/lieutenants/categories/character-sprites/characters/<unit-id>/`.

Each section has a normal authoring `brief.md`, generated `inputs.json`, and a selected version. Fresh manifests have
empty output lists and `ownerApproved: false`. Keep new attempts in fresh versions; preparation never overwrites an
authored version or changes a selected pointer.

## Facial Expressions

The gallery reads the expression section's own active version, independently of Character Art. Use the existing
portrait recipe format: `assets` contains an outfit's set, with `outfit`, `base` pointing to its actual neutral PNG,
and `outputs` containing each `expression` and relative `image`. For example, invented technical values:

```json
{
  "assets": [{
    "id": "village-dialogue",
    "outfit": "village",
    "base": "neutral.png",
    "outputs": [{ "expression": "happy", "image": "happy.png" }]
  }],
  "faces": []
}
```

This shows the recipe shape only, not approval. Record native dimensions, exact source/output hashes and owner
verdicts alongside the real study. Existing base/face composition recipes remain supported. Choose Quest's actual
expression coverage with the owner; preparation does not impose Farm's emotion lists or relationship mechanics.

## Splash Art

Save native images in the selected splash version. Use `assets`, with a distinct `id`, optional scene/title,
relative `image`, dimensions, SHA-256 and dated per-image approval after review. The gallery reads this dedicated
version first and retains support for existing nested/shared splash manifests. Never put splash output in the
Character Art or sprite manifest.

## Character Sprites

Use the sprite version's `fullBodyAssets`. Record `id`, `outfit` as the sprite variant key, optional title, relative
PNG `image`, width, height and SHA-256. Add `approval: { status: "approved", by: "owner", on: "YYYY-MM-DD" }` only
after exact-image review. Save native PNGs/sheets and preserve their transparency. Keep pose, direction, canvas and
frame-grid details with the attempt. IDs and paths remain scoped to the actor and role, even when names match.

This tab reviews native images and sheets. No sprite style, direction count, animation set, frame size, gameplay
packing or game-release binding is established by creating the tab.

## Privacy and delivery

Only normal authorized Quest art is used here. Owner-private variants, prompts and related material remain forbidden
under `AGENTS.md` and `CLAUDE.md`. All real identities, input records, prompts, images and approvals remain ignored.
Commit generic source/docs and invented fixtures only. Publishing is separate and requires the owner's instruction;
preparation does not upload art, update a game release or change the story.
