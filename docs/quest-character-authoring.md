# Quest character authoring

Quest has three cast sections: **Umas**, **Humans** and **Elves**. They retain the existing internal character,
boss and lieutenant IDs and URLs. Each Uma is linked to one Human and three Elves; every album links back to the
other members of that group. These are authoring relationships, not new story or gameplay rules.

## Prepare the local cast

The initial authoring cast carries over the current Cyberpunk Ranker groups for Quest's existing ranked roster.
The normal source images are the latest approved crew pilot looks and the curated Human/Elf combat-station bases.
No original-game reference fallback is used. The preparation validates the exact source PNG hashes and dimensions.

```text
pnpm quest:cast --dry-run
pnpm quest:cast
pnpm quest:cast --check
```

Once the cast exists, run `pnpm quest:albums` to prepare the separate Facial Expressions, Splash Art and Character
Sprites workspaces across Umas, Humans and Elves. Read the [album workflow](quest-art-albums.md). Their generated
inputs use approved Quest outfits as they become available; they do not treat the Cyberpunk starting references as
approved Quest designs.

`UMA_ART_CONTENT` or `UNIVERSES_DIR` select the existing ignored Art content; `UMA_PLATFORM_ROOT` or
`UMA_CONTENT_DIR` select the local Platform Ranker mirror. `--source` can select another normal source universe
with the same approved pilot/base and cast contracts. The default is Cyberpunk.

Preparation creates metadata and three starter album sections, Character Art, Facial Expressions and Splash Art.
It does not draw, resize, copy, move, approve or publish images. Every starting base is referenced in place within
the normal authoring library. Source revisions are pinned; a changed source fails rather than silently replacing
an established Quest reference. Missing or damaged source bases stop the preparation before files are written.

## Private file layout

All real names, identities, mappings, source links and new art remain in ignored `content/`:

- `high-fantasy/cast/roster.json`: the existing Uma roster and ordering, unchanged by preparation.
- `high-fantasy/cast/relationships.json`: the Uma/Human/Elf groups, with stable IDs and the source universe.
- `high-fantasy/characters/<key>/`: Uma records, base references and studies.
- `high-fantasy/enemies/cast/tier-<n>/<NN>-<uma>/<human>/`: Human records and studies.
- `high-fantasy/enemies/lieutenants/cast/tier-<n>/<NN>-<uma>/<elf>/`: Elf records and studies.
- Each enemy role's `cast/roster.json`: its gallery index. The Elf record also names her Human leader.

Each `character.json` carries its `authoringBase` identity/hash and primary `art` reference. An older Uma reference
is retained as `legacy-art`; its file is preserved but the new gallery uses the approved authoring base. Existing
studies and version pointers are preserved. Fresh sections start at `v001` with no art or owner approval.

## Review and delivery

Open [Quest](http://127.0.0.1:4323/gallery/high-fantasy), then Umas, Humans or Elves. Existing `/characters`,
`/bosses` and `/lieutenants` links continue to resolve. Lists use the starting base until Quest art is authored;
the album's base link remains available as an identity reference. Use related-cast links to move around a group.

The source's approval establishes the starting reference only. A newly drawn Quest outfit, expression or splash
still needs its own exact-image owner review and approval. Keep fresh revisions in new versions and retain hashes
and normal authoring records. Do not mark a Cyberpunk reference as approved Quest artwork or put it in an approved
Quest manifest merely to fill the gallery.

This bootstrap changes the local authoring gallery and private preparation only. It does not publish art, update
Platform's gallery, change a Ranker assignment, modify game releases or author story content. Owner-private variants
and their prompts remain off-limits under `AGENTS.md` and `CLAUDE.md`; they must never be used as starting references.

Commit generic tooling, documentation and invented fixtures only. No real cast identity, image, relationship file,
prompt or approval record belongs in git.
