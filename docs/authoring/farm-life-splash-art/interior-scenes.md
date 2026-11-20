# Farm interiors: scene studies and character authoring

These original, character-free environments establish the shared look for married-life scenes. **The solo armchair and dual armchairs v002 are owner approved (2026-11-19)**, bound to the unchanged image hashes below. The bedroom remains in review for mattress-to-frame alignment and fit. Earlier room studies remain historical.

| Scene | Candidate | Native size | SHA-256 |
|---|---|---|---|
| Solo armchair · v002 · approved | [PNG](../../../assets/farm-life/scene-studies/v002/solo-armchair.png) | 1672 × 941 | `9f6f007fa8530902b660a63aa169cfad0ee56de6917cb14d9bf5552959c1de92` |
| Dual armchairs · v002 · approved | [PNG](../../../assets/farm-life/scene-studies/v002/dual-armchairs.png) | 1672 × 941 | `57bb9d044f251f691a1421ff260eca1848244585232a05ec671499acf9983645` |

![Solo armchair study](../../../assets/farm-life/scene-studies/v002/solo-armchair.png)

![Dual armchair study](../../../assets/farm-life/scene-studies/v002/dual-armchairs.png)

The current bedroom v004 is a private review candidate at `content/authoring/scene-studies/farm-life/married-life-interiors/v004/bedroom/image.png`; it is not an approved room reference yet. Both approved chair images already exist in the pushed repository and remain byte for byte unchanged.

## Visual direction

The existing Farm night illustrations supply the starting language: softly shaded 2D anime, warm timber and cream plaster, floral linen, aged brass lamps, small domestic details and a cool night window. The new rooms share restrained rust, ivory, walnut and sage, warm illumination from viewer-left and cool window fill from viewer-right. Wood, stone and textiles have readable detail without photographic rendering.

Room redesign is allowed, with continuity in furnishings and camera language from the existing splashes. The current direction specifically prefers one-person upholstered armchairs, separate solo and duo compositions, and an intimate character-scene view. Once a room reference is selected, use it consistently for its later character studies.

The solo scene places the familiar rust-red, rolled-arm single chair near the center, with little exposed floor and a partial hearth on the left. The duo scene uses two separate matching chairs at equal scale and depth, mostly facing the viewer. The bedroom direction preserves the familiar arched headboard, floral pillows, lamp, bedside cabinets and night window in a closer, gently elevated view. Winter night is the current lighting study; other seasons and story lighting can receive their own versions when requested.

### Bedroom construction: prompt the fit before the fabric

The owner clarified that the first mattress's soft fabric style was fine. The problem was an off-center mattress wider than its supporting frame. The v003 flattening edit addressed the wrong issue and is superseded.

For the next bedroom generation, construct one coherent wooden frame and fitted mattress together:

- Use one longitudinal centerline for the headboard, posts, mattress and pillows.
- Fit the rear mattress corners between the posts with equal side margins.
- Show two continuous wooden side rails just outside/below the mattress edges, with the mattress evenly inset throughout its visible length.
- Give the rails and mattress the same perspective and vanishing point. Foreground widening must apply to both together.
- Retain the first version's soft floral sheet, gentle folds and padded bedding style.

The current v004 prompt leads with these relationships and uses the first soft bedroom as a material/furniture reference, explicitly excluding its flawed geometry. Its full exact prompt and provenance are saved privately for review.

## Scene purpose and posing

| Reference | Intended use | Pose guidance |
|---|---|---|
| Solo armchair | One-character conversation with the POV | Seated for the sitting beat; a standing arrival or farewell can use the space beside the chair |
| Dual armchairs | Shared conversation with two characters | Two seated characters on separate chairs, with readable faces mainly toward the viewer; duo selection remains an owner/story decision |
| Bedroom | Quiet bedside/resting and waking-up beats | Pillow-supported rest or a bed-edge seated shot when requested; maintain the familiar furniture and credible mattress support |

The existing approved set already mixes poses: pajama-by-window references stand, bed-edge scenes sit, and bed-rest scenes recline. There is no permanent per-character sitting or standing rule. Choose acting for the story beat and adjust framing around the approved character while keeping the selected room recognizable.

## Map a selected scene to a character study

1. Record the owner's selected room version and image hash. Keep earlier versions and their verdicts. A request to save or commit a candidate is distinct from visual approval.
2. Use the character's current approved Spring identity and approved full-body outfit as the authorities for her face, proportions, palette, hair, ears, accessories and garments. Author and review a new numbered outfit before its scene when needed.
3. Compose only the outfit-specific expression portrait needed for this scene from her approved base/face recipe. Preserve the dialogue pipeline's existing crop, masks and integer placements.
4. For the full illustration, provide her own full-body outfit and expression portrait as identity references, and the selected empty room as the environment reference. Label these roles explicitly in the exact saved prompt. The room supplies architecture, furnishings, viewpoint and lighting; it does not prescribe the character's clothing, body or personality.
5. Pose her for the story beat: seated in a chair, standing beside it, seated at the bed edge, or resting on pillows. Check supported weight, cushion or pillow compression, hand contact, integrated lighting on face/hair/body, clear space above both ears, garment visibility and a naturally occluded tail attachment. Keep useful seat or mattress surfaces visible. Framing can adapt to the acting without losing the room's recognizable design.
6. Save the full native scene, exact prompt, ordered reference roles/hashes and provenance in a private numbered study. Review the new image on its own. Generative scene reuse does not guarantee pixel-identical backgrounds; these plates do not introduce runtime character compositing.
7. Bind approval to the exact selected character scene. Update only affected derivatives when an outfit or scene changes, preserving all other approvals. Use the existing album builder when inclusion is requested.

The common room design leaves character outfits, personal details, expression and gesture open to individual art direction. The empty duo reference establishes two-chair staging; it does not select characters, author a duo event or mandate identical poses.

## Married-life slots and delivery

Use the existing `pajama-outfits`, `wedding-anniversary-outfits`, `pajama-splash` and `wedding-anniversary-splash` categories. Keep each character's numeric ID, collection, look number, outfit asset ID, matching splash asset ID and intended illustration scene ID together in the private handoff. Pajamas has ten looks including its baseline; anniversary has five. The scene style does not change their established unlock schedule.

The sitting beat can use the solo or dual armchair setting; bedside and morning beats can use the bedroom. A numbered story slot currently names one illustration scene ID, so these settings do not imply a separate required image for every dialogue beat. The wedding-day scene remains its own event. Numbered portrait resolution and category illustration delivery still require their planned game-integration mapping; no runtime or gallery wiring is introduced by these studies.

## Complete prompt and provenance handoff

Ignored `content/authoring/scene-studies/farm-life/married-life-interiors/purpose-and-prompts.md` contains the full exact submitted prompts for the solo chair, duo chairs, original close bedroom, superseded flattening edit and fresh geometry-focused v004 generation. It also records each scene's purpose, input roles and SHA-256 values, image hash, prompt hash and version lineage. Individual `prompt.txt`, `inputs.json` and `generation.json` files remain beside every private image; `active-study.json` identifies the exact mixed-version selection and its approvals. `v002/scene-approvals.json` binds both owner-approved chair PNGs to the dated verdict. All earlier bedroom records remain as history.

The committed PNGs are byte-for-byte native built-in image-generation outputs with no transforms. The exact-path Git exceptions cover the current and historical original environment files. Private character art, references, full prompts and source records retain their existing ignored storage rules.

Historical studies: [v001 wide sofa](../../../assets/farm-life/scene-studies/v001/fireplace-sofa.png), [v001 whole-bed room](../../../assets/farm-life/scene-studies/v001/bedroom.png), and [v003 flattened mattress](../../../assets/farm-life/scene-studies/v003/bedroom.png). They are superseded, with their files and provenance retained.

Next: owner review of bedroom v004 geometry. The two approved chair references are ready for the first requested character/outfit pilot. Commit the selected new bedroom image when its review is complete.
