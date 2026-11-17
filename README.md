# Uma Art Authoring

The local gallery and album builders for reviewing Uma character and enemy art. The gallery listens on loopback on port 4323.

Clone this repo alongside `uma-platform`, then run `pnpm install` and `pnpm gallery`. Open [Local Art Gallery](http://127.0.0.1:4323). `pnpm albums --check` compares the album builders with the current local pages in memory. `pnpm albums` regenerates the pages in their existing private authoring directory.

The default directory is the sibling checkout's `content/authoring/character-universes`. Set `UMA_PLATFORM_ROOT` for another platform checkout, `UMA_CONTENT_DIR` for another private content root, or `UNIVERSES_DIR` for the authoring directory itself. `PORT` overrides the gallery port.

This repo tracks source code and synthetic tests. Keep all authored images, references, manifests, generated pages and review data in their existing private directories. The gallery reads approval and publication records in place. Run publishing and master-data releases from `uma-platform` using its established commands and owner approval.

The initial gallery and album code came from the Uma Platform character art tools.
