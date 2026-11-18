import { artTypes, categories, entries, library, universes, type ArtType, type Entry, type Mounts, type Universe, type Work } from './gallery-data.js'
import { farmCategories, isArtCategory } from './art-categories.js'

const html = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const urlFor = (universe: Universe, type?: ArtType, id?: string) =>
  '/gallery/' + [universe.slug, type, id].filter(Boolean).map((part) => encodeURIComponent(part!)).join('/')
const cover = (url: string, name: string) => url
  ? `<img src="${html(url)}" alt="${html(name)}" loading="lazy" decoding="async">`
  : '<span class="missing">No image yet</span>'
const chevron = '<span class="arrow" aria-hidden="true">↗</span>'

interface Crumb { label: string; href?: string }

function frame(title: string, crumbs: Crumb[], body: string, accent: string = '', script?: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${html(title)} · Art Gallery</title><link rel="stylesheet" href="/_gallery/style.css">${script ? `<script type="module" src="/_gallery/${script}"></script>` : ''}</head>
<body class="${accent}"><a class="skip" href="#main">Skip to content</a><header class="top"><div class="top-inner"><a class="wordmark" href="/">Art Gallery</a><nav aria-label="Breadcrumb"><ol>${crumbs.map(({ label, href }) =>
    `<li>${href ? `<a href="${href}">${html(label)}</a>` : `<span aria-current="page">${html(label)}</span>`}</li>`).join('')}</ol></nav></div></header><main id="main">${body}</main></body></html>`
}

function headline(title: string, count?: string) {
  return `<div class="heading"><h1>${html(title)}</h1>${count ? `<p>${html(count)}</p>` : ''}</div>`
}

function tile({ label, detail, to, image, accent }: { label: string; detail: string; to: string; image: string; accent: string }) {
  return `<a class="tile ${accent}" href="${to}"><div class="tile-image">${cover(image, '')}</div><div class="tile-text"><div><h2>${html(label)}</h2><p>${html(detail)}</p></div>${chevron}</div></a>`
}

function artGrid(files: Work[]) {
  return `<div class="work-grid">${files.map((file) => `<figure class="work"><a class="work-image" href="${html(file.url)}" target="_blank" rel="noopener">${cover(file.url, file.label)}</a><figcaption><strong>${html(file.label)}</strong><span>${html(file.status)}</span></figcaption></figure>`).join('')}</div>`
}

function pairing(entry: Entry, type: ArtType) {
  if (!entry.opponent) return ''
  return (type === 'boss-allies' ? 'Paired with ' : 'Opposes ') + entry.opponent
}

export function homePage(mounts: Mounts) {
  const tiles = universes.map((u) => {
    const roster = entries(mounts, u, 'characters')
    const lib = library(mounts, u, 'characters')
    const first = roster[0]
    return tile({ label: u.title, detail: `${roster.length} characters`, to: urlFor(u), accent: u.accent,
      image: first ? lib.files(first)[0]?.url ?? lib.baseline(first) : '' })
  })
  return frame('Universes', [], headline('Universes') + `<div class="tiles">${tiles.join('')}</div>`)
}

function universePage(mounts: Mounts, u: Universe) {
  const tiles = categories(mounts, u).map((kind) => {
    const people = entries(mounts, u, kind)
    const lib = library(mounts, u, kind)
    const first = people[0]
    return tile({ label: artTypes[kind].label, detail: `${people.length} in the cast`, to: urlFor(u, kind), accent: u.accent,
      image: first ? lib.files(first)[0]?.url ?? lib.baseline(first) : '' })
  })
  return frame(u.title, [{ label: u.title }], headline(u.title) + `<div class="tiles">${tiles.join('')}</div>`, u.accent)
}

function listPage(mounts: Mounts, u: Universe, type: ArtType, roster: Entry[]) {
  const lib = library(mounts, u, type)
  const tiers = [...new Set(roster.map((entry) => entry.tier))]
  const sections = tiers.map((tier) => `<section class="tier" data-tier><h2>${html(tier || 'Cast')}</h2><div class="cast-grid">${roster.filter((item) => item.tier === tier).map((item) => {
    const first = lib.files(item)[0]
    const image = first?.url ?? lib.baseline(item)
    const paired = pairing(item, type)
    return `<a class="entry" href="${urlFor(u, type, item.id)}" data-entry data-search="${html([item.name, item.opponent ?? '', item.tier].join(' '))}"><div class="entry-image">${cover(image, '')}</div><div class="entry-text"><strong>${html(item.name)}</strong>${paired ? `<span>${html(paired)}</span>` : ''}<span>${first?.status ?? (image ? 'Baseline' : 'No image yet')}</span></div></a>`
  }).join('')}</div></section>`).join('')
  const label = artTypes[type].label
  const search = roster.length ? `<div class="list-tools"><label for="search">Find a ${artTypes[type].singular.toLowerCase()}</label><input id="search" type="search" autocomplete="off"><span id="search-count" role="status">${roster.length} results</span></div>` : ''
  const heading = type === 'bosses' || type === 'boss-allies' ? `Cyberpunk ${label} Art` : label
  return frame(heading, [{ label: u.title, href: urlFor(u) }, { label }], headline(heading, `${roster.length} in the cast`) +
    search + (sections || '<p class="empty">No cast entries yet.</p>') + '<p class="empty" id="no-results" hidden>No matching entries.</p>',
    u.accent, 'gallery.mjs')
}

const tabs = { art: 'Character Art', expressions: 'Facial Expressions', splash: 'Splash Art' } as const
type Tab = keyof typeof tabs

function portraitPanel(mounts: Mounts, u: Universe, type: ArtType, entry: Entry) {
  const sets = library(mounts, u, type).portraits(entry)
  if (!sets.length) return '<p class="empty">No facial expressions yet.</p>'
  return `<div class="portrait-controls"><label>Outfit<select id="outfit">${sets.map(({ label }, index) => `<option value="${index}">${html(label)}</option>`).join('')}</select></label><label>Expression<select id="expression"></select></label></div>
<div class="portrait-grid"><figure class="work"><div class="work-image"><img id="neutral" alt="Neutral expression" src="${html(sets[0]!.base)}"></div><figcaption><strong>Neutral</strong></figcaption></figure>
<figure class="work"><div class="work-image"><img id="expression-image" alt="Selected expression"><canvas id="expression-canvas" role="img" aria-label="Selected expression" hidden></canvas></div><figcaption><strong id="expression-label">Selected expression</strong></figcaption></figure></div>
<p id="expression-error" class="empty" role="status" hidden></p><script id="portrait-data" type="application/json">${JSON.stringify(sets).replace(/</g, '\\u003c')}</script>`
}

function memberPage(mounts: Mounts, u: Universe, type: ArtType, entry: Entry, tab: Tab) {
  const lib = library(mounts, u, type)
  const label = artTypes[type].label
  if (isArtCategory(type)) {
    const files = lib.files(entry)
    const baseline = lib.baseline(entry)
    const reference = baseline ? `<a class="baseline-link" href="${html(baseline)}" target="_blank" rel="noopener">Open full-body baseline ${chevron}</a>` : ''
    const panel = files.length ? artGrid(files) : '<p class="empty">No art in this collection yet.</p>'
    return frame(entry.name, [{ label: u.title, href: urlFor(u) }, { label, href: urlFor(u, type) }, { label: entry.name }],
      headline(entry.name, label + ' · ' + entry.tier) + `<section class="${farmCategories[type].kind === 'splash' ? 'splash' : 'album'}" aria-label="${html(label)}">${panel}${reference}</section>`, u.accent)
  }
  const base = urlFor(u, type, entry.id)
  const nav = `<nav class="tabs" aria-label="Album sections">${Object.entries(tabs).map(([value, name]) =>
    `<a href="${base}${value === 'art' ? '' : '?view=' + value}"${tab === value ? ' aria-current="page"' : ''}>${name}</a>`).join('')}</nav>`
  const files = tab === 'expressions' ? [] : lib.files(entry, tab === 'splash')
  const baseline = tab === 'art' ? lib.baseline(entry) : ''
  let panel = files.length ? artGrid(files) : '<p class="empty">No splash art yet.</p>'
  if (tab === 'expressions') panel = portraitPanel(mounts, u, type, entry)
  if (tab === 'art') {
    const reference = baseline ? `<a class="baseline-link" href="${html(baseline)}" target="_blank" rel="noopener">Open full-body baseline ${chevron}</a>` : ''
    panel = files.length ? panel + reference : baseline
      ? `<figure class="work single"><a class="work-image" href="${html(baseline)}" target="_blank" rel="noopener">${cover(baseline, entry.name + ' baseline')}</a><figcaption><strong>Full-body baseline</strong></figcaption></figure>`
      : '<p class="empty">No character art yet.</p>'
  }
  const context = [entry.tier, pairing(entry, type)].filter(Boolean).join(' · ')
  return frame(entry.name, [{ label: u.title, href: urlFor(u) }, { label, href: urlFor(u, type) }, { label: entry.name }],
    headline(entry.name, context) + nav + `<section class="${tab === 'splash' ? 'splash' : 'album'}" aria-label="${tabs[tab]}">${panel}</section>`,
    u.accent, tab === 'expressions' ? 'gallery.mjs' : undefined)
}

export function galleryPage(mounts: Mounts, pathname: string, search: URLSearchParams) {
  if (pathname === '/' || pathname === '/index.html') return homePage(mounts)
  const [, prefix, slug, list, id, extra] = pathname.replace(/\/$/, '').split('/')
  if (prefix !== 'gallery' || extra !== undefined) return null
  const universe = universes.find((item) => item.slug === slug)
  if (!universe) return null
  if (!list) return universePage(mounts, universe)
  const type = categories(mounts, universe).find((key) => key === list)
  if (!type) return null
  const roster = entries(mounts, universe, type)
  if (!id) return listPage(mounts, universe, type, roster)
  const character = roster.find((item) => item.id === id)
  if (!character) return null
  const view = search.get('view')
  const tab = view === 'expressions' || view === 'splash' ? view : 'art'
  return memberPage(mounts, universe, type, character, tab)
}
