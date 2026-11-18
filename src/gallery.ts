// Loopback-only gallery. Existing study files can still be opened through their private paths.
import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { authoring } from '../paths.mjs'
import { enemyMirror } from './enemies.js'
import { mirror } from './lib.js'
import { fileFor, typeOf } from './gallery-lib.js'
import { artTypes, mediaFile, universes, type Mounts } from './gallery-data.js'
import { galleryPage } from './gallery-pages.js'
import { isArtCategory } from './art-categories.js'

const mounts: Mounts = { work: authoring, art: mirror, enemy: enemyMirror }
const assets: Readonly<Record<string, string>> = {
  '/_gallery/style.css': fileURLToPath(new URL('./gallery.css', import.meta.url)),
  '/_gallery/gallery.mjs': fileURLToPath(new URL('./gallery.mjs', import.meta.url)),
  '/_gallery/portrait-pixels.mjs': fileURLToPath(new URL('../albums/portrait-pixels.mjs', import.meta.url)),
}
const oldLists = new Map<string, string>([['/index.html', '/']])
for (const { slug } of universes) {
  for (const [type, { folder }] of Object.entries(artTypes)) {
    const base = '/' + [slug, ...(type === 'characters' ? [] : folder)].join('/')
    for (const tail of ['cast', 'cast/', 'cast/review.html', 'approved/review.html']) {
      oldLists.set(base + '/' + tail, `/gallery/${slug}/${type}`)
    }
  }
}
const port = Number(process.env.PORT ?? 4323)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid gallery port.')

createServer((req, res) => {
  function send(status: number, type: string, body: string) {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    res.end(req.method === 'HEAD' ? undefined : body)
  }
  function serve(file: string) {
    if (req.method === 'HEAD') return send(200, typeOf(file), '')
    const stream = createReadStream(file)
    stream.once('open', () => {
      res.writeHead(200, { 'Content-Type': typeOf(file), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
      stream.pipe(res)
    })
    stream.once('error', () => {
      if (!res.headersSent) send(404, 'text/plain; charset=utf-8', 'Not found')
      else res.destroy()
    })
  }
  if (req.headers.host !== `127.0.0.1:${port}` && req.headers.host !== `localhost:${port}`) {
    return send(403, 'text/plain; charset=utf-8', 'Use the local gallery URL')
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'text/plain; charset=utf-8', 'Read only')

  try {
    const { pathname, searchParams } = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
    const previous = /^\/gallery\/farm-life\/([^/]+)(?:\/([^/]+))?\/?$/.exec(pathname)
    if (previous && isArtCategory(previous[1])) {
      const target = '/gallery/farm-life/characters' + (previous[2] ? '/' + previous[2] + '?view=' + previous[1] : '')
      res.writeHead(302, { Location: target, 'Cache-Control': 'no-store' })
      return res.end()
    }
    // Quest's approved comparison has outfit anchors used by its existing review links.
    if (pathname === '/high-fantasy/approved/review.html') {
      const review = fileFor(authoring, pathname)
      if (review) return serve(review)
    }
    const next = oldLists.get(pathname)
    if (next) {
      res.writeHead(302, { Location: next, 'Cache-Control': 'no-store' })
      return res.end()
    }
    if (Object.hasOwn(assets, pathname)) return serve(assets[pathname]!)
    if (pathname.startsWith('/_gallery/media/')) {
      const [, , , mount, ...parts] = pathname.split('/').map(decodeURIComponent)
      const file = mount && Object.hasOwn(mounts, mount) ? mediaFile(mounts[mount as keyof Mounts], parts) : null
      return file ? serve(file) : send(404, 'text/plain; charset=utf-8', 'Image not found')
    }
    const page = galleryPage(mounts, pathname, searchParams)
    if (page !== null) {
      res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self'; object-src 'none'; frame-ancestors 'none'")
      return send(200, 'text/html; charset=utf-8', page)
    }
    const local = fileFor(authoring, pathname)
    return local ? serve(local) : send(404, 'text/plain; charset=utf-8', 'Not found')
  } catch {
    return send(400, 'text/plain; charset=utf-8', 'The page could not be loaded')
  }
}).listen(port, '127.0.0.1', () => console.log(`Art Gallery: http://127.0.0.1:${port}`))
