import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = dirname(fileURLToPath(import.meta.url))
export const platform = resolve(process.env.UMA_PLATFORM_ROOT ?? join(root, '../uma-platform'))
export const content = resolve(process.env.UMA_ART_CONTENT ?? join(root, 'content'))
export const authoring = resolve(process.env.UNIVERSES_DIR ?? join(content, 'authoring/character-universes'))
export const platformContent = resolve(process.env.UMA_CONTENT_DIR ?? join(platform, 'content'))
export const SITE = 'https://uma-platform.web.app/art'
