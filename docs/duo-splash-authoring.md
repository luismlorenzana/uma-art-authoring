# Duo Splash Art

The local Gallery uses the existing ranked cast and authored pair assignments. Run `pnpm duos --all` to prepare the
private workspace, or choose `farm-life` or `cyberpunk`. `--dry-run` lists the number of metadata changes; `--check`
validates that the saved roster and pairing records match their sources. The command never copies images or replaces
existing art manifests.

Farm reads the canonical Story Authoring `content/farm/story/household.json` assignments: 50 characters, three mutual
partners each, 75 unique pairs. `UMA_FARM_STORY_DIR` overrides the story directory. Cyberpunk reads the existing Boss
Ally cast records: each of the ranked 50 crew members has one distinct mapped ally. The pair registry records source
paths and hashes. Cast names, mappings, briefs and approval records remain private under ignored `content/`.

The Farm universe has a Duos menu with the 50 ranked characters. It references the existing local square profile
library, then the existing local Platform release's profile files when a mirror file is missing. Set
`UMA_PROFILE_RELEASE_DIR` to override that release folder. An approved authored look is the fallback when a profile is unavailable; a missing authored image remains
an empty slot. Character albums in both universes have a Duo Splash Art tab. Cyberpunk shows the pairing only in the
crew member's album. Existing Boss Ally, Boss Enemy and Lieutenant tabs retain their existing scope.

## Authoring one shared image

The workspace is `content/authoring/character-universes/<universe>/categories/duo-splash/`:

- `roster.json` holds members and canonical pairs. Farm pair keys follow the household's canonical two-ID key.
- `pairs/<pair-id>/pair.json` identifies the two participants and the character that carries the published record.
- `pairs/<pair-id>/manifest.json` starts with an empty `assets` list. It can hold a promoted selection.
- `pairs/<pair-id>/v001/`, subsequent versions, and `active-study.json` use the existing owner-approved study workflow.

Save the native duo PNG once under its pair folder. Both Farm participants' albums reference that same image.
The three cards in a Farm character's album are her three distinct partners. They do not require three copies of
each pair's image. Revisions use fresh version paths and preserve earlier files and approval evidence.

A version manifest has `assets`, each with a unique scene `id`, `title`, relative PNG `image`, `width`, `height`,
SHA-256 and `approval: { status: "approved", by: "owner", on: "YYYY-MM-DD" }` after the exact owner verdict.
Keep exact prompts, ordered input roles and hashes, native output hashes and approval wording beside the study.
Use each participant's own approved references. Profile cards supply navigation; they do not approve an image or
replace the established outfit, likeness, composition and review standards.

Set `active-study.json` to the exact approved `activeVersion` with `ownerApproved: true` to publish a version.
Keep that pointer on the approved selection while developing a correction. A promoted root manifest can also hold
the approved selection. Empty pair templates have no approval and contain no generated art.

## Publishing

Use the existing scoped publisher, for example:

```text
pnpm run publish farm-life --category duo-splash --only pilot-one --dry-run
pnpm run publish cyberpunk --category duo-splash --only pilot-one --dry-run
```

`--only` accepts a character key, cast ID, pair ID or published image ID. Selecting either Farm participant selects
the same canonical asset. A published record has `kind: "splash"`, `category: "duo-splash"`, and a `duo` object with
the pair ID and both participants. It has one hash-named PNG and one index record. Character Art projects the record
onto both Farm identities, including distinct outfit identities. A Cyberpunk ally is marked `boss-ally`; she does not
receive an Uma identity or a separate character splash record.

The publisher checks exact owner approval, date, PNG hash and dimensions. Damaged local files preserve a prior
published selection. Pairs held on another machine remain published. The private index and local mirror use the
existing files-first, generation-checked index update. Remove `--dry-run` only on the owner's publishing instruction.

This category publishes to private Platform Character Art. It has no automatic Farm master-scene or Cyberpunk
`looks` release hook: those game consumers have separate bindings. The pair and participant metadata is the stable
contract for game use. Authoring, approval and a successful Platform publish remain distinct states.
