const data = document.querySelector('#combat-sprite-data')
if (data) mount(JSON.parse(data.textContent))

function mount({ bundle, urls }) {
  const canvas = document.querySelector('#combat-sprite-canvas')
  const context = canvas.getContext('2d')
  const fittingInput = document.querySelector('#combat-sprite-fitting')
  const facingInput = document.querySelector('#combat-sprite-facing')
  const clipInput = document.querySelector('#combat-sprite-clip')
  const heightInput = document.querySelector('#combat-sprite-height')
  const speedInput = document.querySelector('#combat-sprite-speed')
  const frameInput = document.querySelector('#combat-sprite-frame')
  const play = document.querySelector('#combat-sprite-play')
  const previous = document.querySelector('#combat-sprite-prev')
  const next = document.querySelector('#combat-sprite-next')
  const anchorsInput = document.querySelector('#combat-sprite-anchors')
  const status = document.querySelector('#combat-sprite-status')
  const note = document.querySelector('#combat-sprite-note')
  const caption = document.querySelector('#combat-sprite-caption')
  const pictures = new Map()

  const [width, height] = bundle.cell
  canvas.width = width
  canvas.height = height
  context.imageSmoothingEnabled = false

  let track, fitting, clip, frameIndex = 0, currentLoad = 0
  let ends = [], total = 0, elapsed = 0, loaded = false, playing = false, handle = 0, started = 0, initialElapsed = 0
  let bitmaps = new Map()

  function layerApplies(layer) {
    return !layer.when || fitting.rig[layer.when.slot] === layer.when.part
  }

  function texture(key) {
    if (!pictures.has(key)) {
      const image = new Image()
      image.src = urls[key]
      pictures.set(key, image.decode().then(() => {
        const page = bundle.pages[key]
        if (image.naturalWidth !== page.width || image.naturalHeight !== page.height) throw new Error('Texture dimensions changed')
        return image
      }).catch(error => {
        pictures.delete(key)
        throw error
      }))
    }
    return pictures.get(key)
  }

  function resize() {
    canvas.style.width = (width / bundle.figureHeight * Number(heightInput.value)) + 'px'
  }

  function draw(index) {
    const frame = track.frames[clip.frames[index].frame]
    context.clearRect(0, 0, width, height)
    if (!loaded) return
    for (const layer of frame.layers.filter(layerApplies)) {
      const [sx, sy, w, h] = layer.rect
      const [x, y] = layer.at
      context.drawImage(bitmaps.get(layer.page), sx, sy, w, h, x, y, w, h)
    }
    if (anchorsInput.checked) {
      for (const [name, [x, y]] of Object.entries({ foot: bundle.foot, ...frame.anchors })) {
        context.fillStyle = name === 'foot' ? '#62e8ff' : '#fbc678'
        context.fillRect(x - 4, y, 9, 1)
        context.fillRect(x, y - 4, 1, 9)
      }
    }
    frameInput.value = String(index)
    const [start, end] = [index === 0 ? 0 : ends[index - 1], ends[index]]
    const events = clip.events.filter(event => event.frame === index).map(event => event.cue).join(', ')
    caption.textContent = 'Frame ' + (index + 1) + ' / ' + clip.frames.length + ' · ' + Math.round(start) + '–' + Math.round(end) + ' ms' + (events ? ' · ' + events : '')
  }

  function stop() {
    cancelAnimationFrame(handle)
    playing = false
    play.textContent = 'Play'
  }

  function step(time) {
    elapsed = initialElapsed + (time - started) * Number(speedInput.value)
    const finished = !clip.loop && elapsed >= total
    const position = clip.loop ? elapsed % total : Math.min(elapsed, total - 0.001)
    const index = ends.findIndex(end => end > position)
    if (index !== frameIndex) {
      frameIndex = index
      draw(index)
    }
    if (finished) stop()
    else handle = requestAnimationFrame(step)
  }

  function seek(index) {
    stop()
    frameIndex = Math.min(clip.frames.length - 1, Math.max(0, index))
    elapsed = frameIndex ? ends[frameIndex - 1] : 0
    draw(frameIndex)
  }

  function showControls(enabled) {
    play.disabled = !enabled || clip.frames.length < 2
    frameInput.disabled = play.disabled
    previous.disabled = play.disabled
    next.disabled = play.disabled
  }

  async function select() {
    stop()
    const request = ++currentLoad
    fitting = bundle.fittings[Number(fittingInput.value)]
    track = bundle.motions[fitting.motion][facingInput.value]
    const action = clipInput.value
    clipInput.replaceChildren(...Object.keys(track.clips).map(name => {
      const label = name.replace(/-/g, ' ').replace(/^./, letter => letter.toUpperCase())
      return new Option(label, name)
    }))
    clipInput.value = Object.hasOwn(track.clips, action) ? action : 'idle'
    clip = track.clips[clipInput.value]
    frameIndex = 0
    elapsed = 0
    total = 0
    ends = clip.frames.map(frame => total += frame.ms)
    frameInput.max = String(clip.frames.length - 1)
    frameInput.value = '0'
    caption.textContent = ''
    note.textContent = fitting.note ?? ''
    note.hidden = !fitting.note
    loaded = false
    showControls(false)
    context.clearRect(0, 0, width, height)
    status.textContent = 'Loading frames…'
    try {
      const pages = new Set(clip.frames.flatMap(({ frame }) => track.frames[frame].layers.filter(layerApplies).map(layer => layer.page)))
      const ready = await Promise.all([...pages].map(async key => [key, await texture(key)]))
      if (request !== currentLoad) return
      bitmaps = new Map(ready)
      loaded = true
      status.textContent = ''
      showControls(true)
      draw(0)
    } catch {
      if (request === currentLoad) status.textContent = 'The sprite textures could not be loaded.'
    }
  }

  for (const input of [fittingInput, facingInput, clipInput]) input.addEventListener('change', select)
  heightInput.addEventListener('change', resize)
  speedInput.addEventListener('change', () => {
    if (playing) {
      started = performance.now()
      initialElapsed = elapsed
    }
  })
  anchorsInput.addEventListener('change', () => { if (loaded) draw(frameIndex) })
  frameInput.addEventListener('input', () => seek(Number(frameInput.value)))
  previous.addEventListener('click', () => seek(frameIndex - 1))
  next.addEventListener('click', () => seek(frameIndex + 1))
  play.addEventListener('click', () => {
    if (playing) return stop()
    if (!clip.loop && elapsed >= total) seek(0)
    initialElapsed = elapsed
    started = performance.now()
    playing = true
    play.textContent = 'Pause'
    handle = requestAnimationFrame(step)
  })
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop() })
  resize()
  void select()
}
