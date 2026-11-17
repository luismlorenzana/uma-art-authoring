import { existsSync, realpathSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'

const TYPES: Readonly<Record<string, string>> = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8',
  md: 'text/plain; charset=utf-8', txt: 'text/plain; charset=utf-8', png: 'image/png', webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml',
}
export const typeOf = (path: string): string => TYPES[path.slice(path.lastIndexOf('.') + 1).toLowerCase()] ?? 'application/octet-stream'

/** The file a request path names under the gallery's root, or null: no traversal, no hidden files, files only. */
export function fileFor(base: string, urlPath: string): string | null {
  let path: string
  try { path = decodeURIComponent(urlPath.split('?')[0]!.split('#')[0]!) } catch { return null }
  const parts = path.split('/').filter((p) => p !== '')
  if (parts.length === 0 || parts.some((p) => p === '..' || p.startsWith('.') || p.includes('\\') || p.includes(':'))) return null
  const root = resolve(base), file = resolve(root, ...parts)
  if (!file.startsWith(root + sep) || !existsSync(file)) return null
  try {
    const actual = realpathSync(file)
    return actual.startsWith(realpathSync(root) + sep) && statSync(actual).isFile() ? actual : null
  } catch { return null }
}
