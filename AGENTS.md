# Agent boundaries

Work on code, generic documentation and invented fixtures. All real art, cast registries, approvals and generated
packages stay under ignored `content/`. No real character names, art, prompts or story text go in commits.

## Owner-private variants: mandatory for every agent

- Never open, view, render, describe, OCR, thumbnail, attach, search, scan or extract metadata/text from owner-private
  images, prompts, edit instructions, generation histories, owner approval documents or related creative material.
  Do not inspect the previous personal studio. Do not request private examples, screenshots or prompts.
- This applies across local files, archives, caches, cloud storage, URLs, browser views and other repositories.
  Reserved paths include `owner-private/`, `owner-only/`, `private-variants/`, `private-art-outbox/`, `art-private/`
  and files containing `.private.`. Never recursively search or index these paths, even when debugging.
- Only `pnpm private-art prepare`, `export`, `check` and `publish` are agent-safe. Prepare/export read normal approved
  references only. Check/publish may machine-parse strict technical IDs/paths/checksums and transfer approved files
  opaquely; never return their bytes, documents, previews or embedded metadata to an agent. Use count-only output.
  Publish only on the owner's instruction. Do not replace this with ad hoc inspection, scripts or folder uploads.
- Never run `private-art:owner` on actual owner data. The owner alone runs it on the Mac. Synthetic tests may use
  invented image bytes and approval documents; real private material must never be a fixture.
- The normal gallery, normal publisher, story sandbox, search and generated contact sheets must exclude private
  variants. Keep browser/game private mode off during agent work. Never open private asset URLs to verify delivery;
  verify only through the count-only publisher and normal storage object metadata.
- Prompts, editing notes and actual approvals remain owner-only on the Mac. Private output PNGs go only to their
  ignored outbox and separate cloud prefix. They never go in git, agent logs, chats, regular galleries or story files.

These are agent conduct rules, not OS access controls or encryption. Do not claim another same-user process is
technically prevented from reading files. The owner chose this simpler workflow without an unlock key.
Read `docs/private-art-variants.md` for commands and preserve normal IDs and approvals.
