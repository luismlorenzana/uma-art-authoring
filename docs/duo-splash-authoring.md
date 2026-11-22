# Duo Splash Art

The local Gallery uses the existing ranked cast and authored pair assignments. Run `pnpm duos --all` to prepare the
private workspace, or choose `farm-life` or `cyberpunk`. `--dry-run` lists the number of metadata changes; `--check`
validates that the saved roster and pairing records match their sources. The command never copies images or replaces
existing art manifests.

Farm reads the canonical Story Authoring `content/farm/story/household.json` assignments: 50 characters, three mutual
partners each, 75 unique pairs. `UMA_FARM_STORY_DIR` overrides the story directory. Cyberpunk reads the existing Boss
Ally cast records: each of the ranked 50 crew members has one distinct mapped ally. The pair registry records source
paths and hashes. The Farm pairing register below is the owner-authorized committed exception for pairing names
and cast IDs. Other cast metadata, briefs, approval records, artwork and story text remain private under ignored `content/`.

The Farm universe has a Duos menu with the 50 ranked characters. It references the existing local square profile
library, then the existing local Platform release's profile files when a mirror file is missing. Set
`UMA_PROFILE_RELEASE_DIR` to override that release folder. An approved authored look is the fallback when a profile is unavailable; a missing authored image remains
an empty slot. Character albums in both universes have a Duo Splash Art tab. Cyberpunk shows the pairing only in the
crew member's album. Existing Boss Ally, Boss Enemy and Lieutenant tabs retain their existing scope.

## Farm pairing register

These are the established Farm duo assignments, committed at the owner's request on 2026-11-22. Art sessions must
use this register and the corresponding private pair records. Change a pairing only on the owner's instruction;
update this register, Story Authoring's household assignments and the private Art roster together. A difference
between them needs reconciliation before authoring a new pairing.

There are **50 characters, three mutual partners each, and 75 unique pairs**. A pair appears under both participants
below but receives one shared splash workspace and image. Partner column order follows the cast order and does not
give one partner priority. Alternate outfit identities keep their own cast IDs and assignments.

Source: the authored `duos` list in Story Authoring's `content/farm/story/household.json`, cross-checked against the
private Art duo roster. This table includes pairing names and cast IDs only, with no story dialogue or art.

| Character | Cast ID | Partner 1 | Partner 2 | Partner 3 |
| --- | --- | --- | --- | --- |
| Almond Eye | `1129` | Curren Bouquetd'or | Lucky Lilac | Kiseki |
| Kitasan Black | `1068` | Satono Diamond | Espoir City | Kitasan Red |
| Gentildonna | `1116` | Orfevre | Epiphaneia | Verxina |
| Orfevre | `1115` | Gentildonna | Win Variation | Epiphaneia |
| Satono Diamond | `1067` | Kitasan Black | Satono Blue Diamond | Satono Crown |
| Phalaenopsis | `1149` | Admire Groove | Mejiro Ramonu | Seiun Sky |
| Buena Vista | `1114` | Victoire Pisa | Red Desire | Rose Kingdom |
| Curren Bouquetd'or | `1134` | Almond Eye | Lucky Lilac | Rose Kingdom |
| Admire Groove | `1118` | Phalaenopsis | Mejiro Ramonu | Neo Universe |
| Win Variation | `1117` | Orfevre | Epiphaneia | Hishi Miracle |
| Sakura Laurel | `1076` | Hishi Miracle | Kiseki | Narita Brian |
| Mejiro Ramonu | `1086` | Phalaenopsis | Admire Groove | Mejiro Palmer |
| Epiphaneia | `1141` | Gentildonna | Orfevre | Win Variation |
| Espoir City | `1081` | Kitasan Black | Verxina | Ines Fujin |
| Verxina | `1090` | Gentildonna | Espoir City | Red Desire |
| Hishi Miracle | `1106` | Win Variation | Sakura Laurel | Durandal |
| Victoire Pisa | `1143` | Buena Vista | Red Desire | Rose Kingdom |
| Jungle Pocket | `1094` | Air Messiah | Neo Universe | Dantsu Flame |
| Cesario | `1110` | Air Messiah | Narita Top Road | Daring Heart |
| Lucky Lilac | `1130` | Almond Eye | Curren Bouquetd'or | Kiseki |
| Kitasan White | `s106802` | Satono White Diamond | Kitasan Red | Satono Crown |
| Satono White Diamond | `s106702` | Kitasan White | Satono Blue Diamond | Satono Crown |
| Kiseki | `1137` | Almond Eye | Sakura Laurel | Lucky Lilac |
| Sakura Chiyono O | `1069` | Mejiro Ardan | Oguri Cap | Maruzensky |
| Mejiro Ardan | `1071` | Sakura Chiyono O | Oguri Cap | Mejiro Palmer |
| Oguri Cap | `1006` | Sakura Chiyono O | Mejiro Ardan | Daring Heart |
| Red Desire | `1136` | Buena Vista | Verxina | Victoire Pisa |
| Ines Fujin | `1031` | Espoir City | Mejiro Palmer | Ines Benten |
| Mejiro Palmer | `1064` | Mejiro Ramonu | Mejiro Ardan | Ines Fujin |
| Maruzensky | `1004` | Sakura Chiyono O | Mihono Bourbon | Ines Benten |
| Kitasan Red | `s106803` | Kitasan Black | Kitasan White | Satono Blue Diamond |
| Satono Blue Diamond | `s106703` | Satono Diamond | Satono White Diamond | Kitasan Red |
| Taiki Shuttle | `1010` | K.S.Miracle | Silence Suzuka | Narita Top Road |
| Narita Brian | `1016` | Sakura Laurel | Mihono Bourbon | Narita Top Road |
| Seiun Sky | `1020` | Phalaenopsis | Silence Suzuka | Aston Machan |
| Rose Kingdom | `1144` | Buena Vista | Curren Bouquetd'or | Victoire Pisa |
| Mihono Bourbon | `1026` | Maruzensky | Narita Brian | Mihono Chocolat Bourbon |
| Air Messiah | `1111` | Jungle Pocket | Cesario | Daring Heart |
| K.S.Miracle | `1093` | Taiki Shuttle | Neo Universe | North Flight |
| Satono Crown | `1088` | Satono Diamond | Kitasan White | Satono White Diamond |
| Mihono Chocolat Bourbon | `s102602` | Mihono Bourbon | Silence Suzuka | Aston Machan |
| Ines Benten | `s103102` | Ines Fujin | Maruzensky | Aston Machan |
| Silence Suzuka | `1002` | Taiki Shuttle | Seiun Sky | Mihono Chocolat Bourbon |
| Aston Machan | `1087` | Seiun Sky | Mihono Chocolat Bourbon | Ines Benten |
| Neo Universe | `1105` | Admire Groove | Jungle Pocket | K.S.Miracle |
| Narita Top Road | `1077` | Cesario | Taiki Shuttle | Narita Brian |
| Dantsu Flame | `1092` | Jungle Pocket | Durandal | North Flight |
| Durandal | `1121` | Hishi Miracle | Dantsu Flame | North Flight |
| North Flight | `1082` | K.S.Miracle | Dantsu Flame | Durandal |
| Daring Heart | `1112` | Cesario | Oguri Cap | Air Messiah |

Pair-set SHA-256: `eae2c4476e141cda3013c3caf6087c46ead0986c575ea49424e0a85e86cfd6e2`. The digest covers the sorted canonical two-ID keys, JSON-encoded as a compact array;
each key sorts its IDs using English numeric comparison and joins them with a colon.

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
