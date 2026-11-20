# Farm facial-expression workflow

Use the game's [expression packet](https://github.com/luismlorenzana/uma-farm/blob/main/docs/design/her-look.md#approved-expression-authoring-packet)
and [outfit matrix](https://github.com/luismlorenzana/uma-farm/blob/main/docs/design/her-look.md#minimum-facial-expressions-by-outfit).
The sibling checkout has them at `../uma-farm/docs/design/her-look.md`; numbered portrait keys are in
`../uma-farm/docs/story-pack.md`, under the household contract. Read those sources again when a scene changes.

The matrix sets the minimum review workload. Existing owner-approved expressions remain approved and available.
It does not prescribe clothing, hair, accessories, proportions, pose, expression strength or personality.
Use the owner's approved appearance and let the actual scene guide the acting. Additional expressions can be reviewed
when a scene needs their exact beat. Optional work already closed by the owner stays closed until reopened.

## Start from the current selection

Read the private Farm `README.md` and `handoff.md`, then the character's `active-study.json`, exact approvals and
composition recipe. Earlier versioned studies, pair runners and review boards are history, rather than a work queue.
For a numbered wardrobe also read `categories/married-life-handoff.md` and the category's active selection.

Generate one neutral base for each selected outfit and one reusable face layer per needed expression. Reuse approved
layers when the identity, head angle, hairline, jaw, skin tone and placement agree. A changed appearance can require
fresh layers. Keep established dimensions, literal native portrait crops, continuous facial masks, opaque old/new
feature coverage and one integer face placement per outfit. No scaling or rotation during composition.

## Plan the reviews

```powershell
# The twelve standard looks; JSON on stdout, without modifying art or approval records.
pnpm farm:expressions plan

# All 26 look slots, before any work is selected or generated.
pnpm farm:expressions plan --all-looks

# A new night-look batch, using the game's actual portrait keys. Quote commas in PowerShell.
pnpm farm:expressions plan --outfits 'pajamas-2,pajamas-3,wedding-anniversary-1'

# An existing character: carry every declared approval forward.
pnpm farm:expressions plan --manifest content/authoring/character-universes/farm-life/characters/orchard-runner/v002/manifest.json

# Save a new private plan without overwriting an earlier one.
pnpm farm:expressions plan --all-looks --out content/authoring/review-plans/farm/v001/plan.json
```

The invented character path illustrates the shape; select the real active version locally. The plan distinguishes
missing compositions, missing shared faces and reviews awaiting owner approval. Existing-approval counts report
manifest declarations; the saved-piece verifier and publication checks still validate the hashes. Planning grants
no approval and performs no pixel verification.

| Review scope | Minimum, including Neutral | Existing complete approvals |
|---|---:|---|
| Four seasonal outfits | 15 per outfit | Keep all 16 if already approved |
| Farm work, garden party, kimono, baseline pajamas | 10 per outfit | Keep accepted additions |
| Dinner | 9 | Keep accepted additions |
| Wedding and wedding night | 6 per outfit | Each uses its own expression list |
| Swimsuit | 5 | Keep accepted additions |
| Additional pajamas 2–10 | Neutral, Tender, Loving: 3 each | Keep accepted additions |
| Formal anniversary looks 1–5, also used on spouse birthdays | Neutral, Tender, Loving: 3 each | Keep accepted additions |

Exact expression IDs are in the game's matrix and `src/farm-expression-plan.ts`. Twelve standard looks need 126
minimum reviews; fourteen additional looks need 42, for 168 across 26 looks. These are review counts. One shared
face is still generated once per identity, and automatic composition remains inexpensive.

Pajama slot 1 uses `pajamas-playful`; the planner recognizes `pajamas-1` as a planning alias. Publish the canonical
key. Later bases use `pajamas-2` through `pajamas-10`. Formal bases use `wedding-anniversary-1` through
`wedding-anniversary-5`; birthday and anniversary dialogue share each formal base. Category image IDs are not
automatically portrait base keys.

Extend the character's existing complete portrait manifest with new numbered bases. Never publish a night-look-only
manifest in place of her full portrait family: a selected-character portrait upload replaces that character's family.
For a character with 192 existing approved states, the fourteen additional looks add 42 new reviews, retaining 234
reviews in total. The planner preserves the 66 earlier approved combinations beyond the new standard minimum.

For a scene needing more, supply a private JSON map using `--requirements <file>`. An invented example is
`{"orchard-visit":["happy","thinking"]}`. Expressions add to a standard outfit's minimum; an unfamiliar outfit
requires an explicit map. Record the actual scene, branch and reason in the character's private handoff. Retain
accepted expressions beyond the minimum. Do not reopen rejected optional work through a default map.

## Review and approve

1. Review the new neutral bases and reuse the existing approved faces. Author only the required missing faces.
2. Preview the planned base/expression combinations. Compare Happy/Tender/Loving, Shy/Flustered and Sad/Worried
   wherever those expressions are used. Keep intensity character-specific.
3. Run the existing pixel and mask verifier: literal crops, straight alpha, continuous skin, opaque feature guards,
   unchanged pixels outside the mask and exact composition hashes. Keep broad automatic checks where inexpensive;
   they do not expand the owner's visual-review workload.
4. Record the owner's verdict against the exact base, face, mask, placement and state hashes. Put selected reviews
   in each base's `outputs`. A new base needs an approved non-neutral state for packing. Keep existing approved
   output rows without regenerating images or discarding approvals.
5. Check the selected manifest using the coverage command and the existing pixel verifier:

   ```powershell
   pnpm farm:expressions check --manifest content/authoring/character-universes/farm-life/characters/orchard-runner/v002/manifest.json
   pnpm farm:expressions check --manifest content/authoring/character-universes/farm-life/characters/orchard-runner/v002/manifest.json --approved
   ```

   `check` checks coverage and shared-face presence; `--approved` also checks declared approval for each planned
   review. Neither substitutes for hash/pixel verification or the owner's verdict.
6. Rebuild selected albums. Selectors show recorded states for that base; an absent expression must not appear as
   an approved neutral portrait with the wrong label. The runtime can still reuse shared layers when a scene
   requests them, with the game's documented fallbacks.

For numbered night looks, review sitting in Neutral, the pajama bedside in Tender and the formal bedside in Loving,
then farewell and morning in Tender. Check solo, duo and Library replay at 844 × 390 and 667 × 375. The host wears
the formal look on a birthday/anniversary; a visiting spouse uses pajamas. Use the fifth visit to check Stay the night.
An authored beat can choose another approved expression. One look does not imply four new splash images.

Publish on the owner's instruction, using the [selected-character publishing runbook](farm-life-publishing.md).
Derive the expected reviewed state count from the selected manifest and approval records. A legacy 192-state set
and a scene-based set are both valid. Category publication alone does not prove game delivery: read the numbered
portrait and illustration mappings back through the game, including replay.

## Local cleanup

Keep one current entry point and one active selection per character/category. Mark historical briefs and completed
queues as history, linking the current manifest and publication receipt. Preserve approved art, native outputs,
raw edits, masks, exact prompts, hashes, decisions, recipes and receipts. Avoid moving linked source directories.
Scratch browser profiles and rebuildable caches may be removed after checking their targets and dependencies.
An inventory states what changed, what was retained and any unresolved integration work.
