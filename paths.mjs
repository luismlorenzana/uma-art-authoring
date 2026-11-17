import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const platform = resolve(process.env.UMA_PLATFORM_ROOT ?? join(here, '../uma-platform'))
export const authoring = resolve(process.env.UNIVERSES_DIR ?? join(process.env.UMA_CONTENT_DIR ?? join(platform, 'content'), 'authoring/character-universes'))
export const SITE = 'https://uma-platform.web.app/art'
