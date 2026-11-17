import { composePortraitRGBA, decodePortraitPNG } from './portrait-pixels.mjs'

const byId = (id) => document.getElementById(id)
const search = byId('search')
if (search) {
  const entries = [...document.querySelectorAll('[data-entry]')]
  const tiers = [...document.querySelectorAll('[data-tier]')]
  search.addEventListener('input', () => {
    const words = search.value.toLowerCase().trim().split(/\s+/)
    let shown = 0
    for (const entry of entries) {
      entry.hidden = !words.every((word) => entry.dataset.search.toLowerCase().includes(word))
      if (!entry.hidden) shown++
    }
    for (const tier of tiers) tier.hidden = !tier.querySelector('[data-entry]:not([hidden])')
    byId('search-count').textContent = `${shown} ${shown === 1 ? 'result' : 'results'}`
    byId('no-results').hidden = shown > 0
  })
}

const data = byId('portrait-data')
if (data) {
  const outfits = JSON.parse(data.textContent)
  const outfit = byId('outfit')
  const expression = byId('expression')
  const neutral = byId('neutral')
  const picture = byId('expression-image')
  const canvas = byId('expression-canvas')
  const error = byId('expression-error')
  let generation = 0

  async function loadPixels(url) {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Portrait image unavailable')
    return decodePortraitPNG(new Uint8Array(await response.arrayBuffer()))
  }

  async function selectExpression() {
    const revision = ++generation
    const selected = outfits[Number(outfit.value)]
    const state = selected.states[Number(expression.value)]
    byId('expression-label').textContent = state.label
    error.hidden = true
    picture.hidden = false
    canvas.hidden = true
    picture.alt = state.label + ' expression'
    picture.src = state.image || selected.base
    if (state.image) return
    try {
      const [base, face] = await Promise.all([loadPixels(selected.base), loadPixels(state.face)])
      if (revision !== generation) return
      const pixels = composePortraitRGBA(base, face, state.at)
      canvas.width = base.width
      canvas.height = base.height
      canvas.getContext('2d').putImageData(new ImageData(pixels, base.width, base.height), 0, 0)
      canvas.setAttribute('aria-label', state.label + ' expression')
      picture.hidden = true
      canvas.hidden = false
    } catch {
      if (revision !== generation) return
      error.textContent = 'This expression could not be loaded.'
      error.hidden = false
    }
  }

  function selectOutfit() {
    const selected = outfits[Number(outfit.value)]
    neutral.src = selected.base
    expression.replaceChildren(...selected.states.map(({ label }, index) => new Option(label, String(index))))
    void selectExpression()
  }

  outfit.addEventListener('change', selectOutfit)
  expression.addEventListener('change', () => void selectExpression())
  selectOutfit()
}
