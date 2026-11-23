# Original character collections

Original character collections are independent casts inside a universe. Their names, hierarchy, courts and design
bibles come from a private registry, not from the Ranker or an existing franchise. No baseline images are imported.
The universe landing shows one tile per registered collection, followed by its rank lists, court groups and character
albums. Existing character, enemy, ally and lieutenant collections retain their own identities and workspaces.

## Private registry

The collection root is `content/authoring/character-universes/<universe>/originals/<collection-key>/`:

- `collection.json`: `schemaVersion: 1`, `kind: "original-character-collection"`, safe `id`, `title`, optional subtitle
  and description, and the `ranks`, `courts` and `characters` arrays.
- `ranks`: safe `id`, `label`, `singular`, optional `expectedCount`, `parentRank`, `membersPerParent` and description.
- `courts`: safe `id`, `title`, optional description, design brief and ancestral marker.
- `characters`: safe `id`, `name`, `rank`, `court`, optional title, adult marker, private brief and `serves` parent ID.
- `handoff.md`, `bibles/race.md`, `bibles/casting.md` and `bibles/courts/<court-key>.md`: owner decisions and design context.
- `source/`: the supplied brief and other private source evidence, when present.

The registry retains any additional private design selections and metadata. Hierarchy checks require each serving
relationship to match the declared parent rank and court, reject cycles and duplicate IDs, and enforce declared
counts. An ancestral rank can remain outside the serving hierarchy. A legend does not imply an occupied enemy seat.

## Prepare without replacing work

From the Art checkout, substitute the private collection key:

```text
pnpm originals --universe cyberpunk --collection <collection-key> --dry-run
pnpm originals --universe cyberpunk --collection <collection-key>
pnpm originals --universe cyberpunk --collection <collection-key> --check
```

The registry must exist first. Preparation creates missing metadata, bibles and briefs without importing pictures or
replacing authored files. The check validates the registry, saved identities and preparation files without writing.
An identity mismatch needs review rather than an automatic rewrite.

Each character lives under `<rank-key>/<court-key>/<character-key>/` and has:

- `character.json`: original identity `original-<collection-key>-<character-key>`, rank, court, parent when applicable,
  and an initially empty `references` list. No master-character or franchise ID is assigned.
- `brief.md`: links to the collection handoff and race/court bibles, plus her private character brief.
- `references/README.md`: the reference policy. Approved original references can be added later.
- `active-study.json` and `v001/manifest.json`: the Character Art starter selection.
- The same versioned structure under `dialogue-portraits/`, `splash-art/`, `categories/weapons/` and
  `categories/combat-sprites/` for the remaining four album tabs.

Starter pointers select `v001` with `ownerApproved: false`; starter manifests contain no art or approval. Character
Art, Weapons and Combat Sprites use `fullBodyAssets`; Splash Art uses `assets`. Facial Expressions can use the existing
base/face composition recipe in `assets` and `faces`, or declared standalone `image` entries. Combat Sprites can also
use the existing versioned bundle player, with the original actor ID rather than a ranked or franchise identity.

## Review

Use the private owner-selected body plan, court traits, ranks and state variants. Do not activate alternatives from
the source proposal merely because they were preserved. Establish original likenesses through review. An empty
reference folder is intentional and must never trigger a fallback to another cast's art, even when names match.

Keep new attempts in fresh version folders. Retain prompts, ordered reference roles and hashes, native PNG hashes,
dimensions and exact owner verdicts beside each study. Register the relative `image` paths, IDs and titles in the
appropriate manifest. Images stay inside their original character's folder. Set per-image
`approval: { status: "approved", by: "owner", on: "YYYY-MM-DD" }` only after the exact verdict. Keep the active approved
selection while developing a correction; version pointers do not replace per-image approval evidence.

Gallery navigation is `/gallery/<universe>/originals/<collection-key>/<rank-key>/<character-key>`, with the same
`?view=expressions`, `?view=splash`, `?view=weapons` and `?view=combat-sprites` controls as other albums. Lists and collection
tiles prefer approved original artwork; individual albums can show declared draft images with their actual status.

This bootstrap prepares local authoring and review. The existing character/enemy publishing commands do not pick up
original collections. A later explicit publishing integration must retain the namespaced original identity and its
collection, rank and court; do not disguise original characters as ranked Umas or franchise units. No game story,
existing enemy mapping, renderer or release binding is changed by collection preparation.

All actual collection names, rosters, lore, source briefs, art, prompts and approval records stay under ignored
`content/`. Commit only generic tools, workflow documentation and synthetic test fixtures.
