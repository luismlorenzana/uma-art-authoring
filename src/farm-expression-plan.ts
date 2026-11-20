/** Farm review workload, independent of the runtime's shared expression library. */
export const farmExpressions = ['neutral', 'happy', 'laughing', 'surprised', 'thinking', 'sad', 'angry', 'worried', 'determined', 'pouting', 'shy', 'tender', 'flustered', 'loving', 'tearful-joy', 'sleepy'] as const
const seasonal = farmExpressions.filter(e => e !== 'sleepy')
export const standardExpressionReviews: Readonly<Record<string, readonly string[]>> = {
  spring: seasonal, summer: seasonal, fall: seasonal, winter: seasonal,
  'farm-work': ['neutral', 'happy', 'laughing', 'surprised', 'thinking', 'determined', 'shy', 'tender', 'loving', 'tearful-joy'],
  'garden-party': ['neutral', 'happy', 'laughing', 'surprised', 'thinking', 'determined', 'shy', 'tender', 'flustered', 'loving'],
  kimono: ['neutral', 'happy', 'laughing', 'thinking', 'determined', 'shy', 'tender', 'flustered', 'loving', 'tearful-joy'],
  dinner: ['neutral', 'happy', 'laughing', 'surprised', 'thinking', 'shy', 'tender', 'loving', 'tearful-joy'],
  wedding: ['neutral', 'happy', 'laughing', 'tender', 'loving', 'tearful-joy'],
  'wedding-night': ['neutral', 'shy', 'flustered', 'tender', 'loving', 'sleepy'],
  'pajamas-playful': ['neutral', 'happy', 'laughing', 'surprised', 'thinking', 'sad', 'tender', 'loving', 'tearful-joy', 'sleepy'],
  swimsuit: ['neutral', 'happy', 'laughing', 'tender', 'loving'],
}
export const additionalFarmLooks = [...Array.from({ length: 9 }, (_, i) => `pajamas-${i + 2}`), ...Array.from({ length: 5 }, (_, i) => `wedding-anniversary-${i + 1}`)]
export interface ReviewOutput { expression: string; ownerApproved?: boolean }
export interface ReviewBase { outfit: string; neutralOwnerApproved?: boolean; outputs?: ReviewOutput[] }
export interface ReviewManifest { outfits: string[]; assets?: ReviewBase[]; faces?: { expression: string }[] }
export type SceneRequirements = Record<string, string[]>
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const unique = (values: readonly string[]) => [...new Set(values)]
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
function strings(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some(v => typeof v !== 'string' || !slug.test(v))) throw Error(`${label} must be an array of expression/outfit IDs`)
  return unique(value as string[])
}
export function readSceneRequirements(value: unknown): SceneRequirements {
  if (!object(value)) throw Error('Scene requirements must map outfit keys to expression IDs')
  return Object.fromEntries(Object.entries(value).map(([key, expressions]) => {
    if (!slug.test(key)) throw Error(`Invalid outfit key: ${key}`)
    return [key, strings(expressions, key)]
  }))
}
export function readReviewManifest(value: unknown): ReviewManifest {
  if (!object(value)) throw Error('Expected a portrait manifest')
  const outfits = strings(value.outfits, 'outfits')
  const assets = value.assets === undefined ? [] : value.assets
  const faces = value.faces === undefined ? [] : value.faces
  if (!Array.isArray(assets) || !Array.isArray(faces)) throw Error('assets and faces must be arrays')
  const parsed = assets.map((base): ReviewBase => {
    if (!object(base) || typeof base.outfit !== 'string' || !outfits.includes(base.outfit)) throw Error('Every base must name a selected outfit')
    const outputs = base.outputs === undefined ? [] : base.outputs
    if (!Array.isArray(outputs)) throw Error('Base outputs must be an array')
    const mapped = outputs.map((output): ReviewOutput => {
      if (!object(output) || typeof output.expression !== 'string' || !slug.test(output.expression) || output.expression === 'neutral') throw Error('Each output must name a non-neutral expression')
      return { expression: output.expression, ownerApproved: output.ownerApproved === true }
    })
    if (new Set(mapped.map(o => o.expression)).size !== mapped.length) throw Error(`Repeated expression in ${base.outfit}`)
    return { outfit: base.outfit, neutralOwnerApproved: base.neutralOwnerApproved === true, outputs: mapped }
  })
  if (new Set(parsed.map(a => a.outfit)).size !== parsed.length) throw Error('More than one base for an outfit; plan one character at a time')
  return { outfits, assets: parsed, faces: faces.map(face => {
    if (!object(face) || typeof face.expression !== 'string' || !slug.test(face.expression)) throw Error('Every face needs an expression ID')
    return { expression: face.expression }
  }) }
}
function minimum(outfit: string, scenes: SceneRequirements): readonly string[] {
  const standard = Object.hasOwn(standardExpressionReviews, outfit) ? standardExpressionReviews[outfit] : undefined
  if (standard) return standard
  if (outfit === 'pajamas-1') return standardExpressionReviews['pajamas-playful']!
  if (/^pajamas-(?:[2-9]|10)$/.test(outfit) || /^wedding-anniversary-[1-5]$/.test(outfit)) return ['neutral', 'tender', 'loving']
  if (Object.hasOwn(scenes, outfit) && scenes[outfit]?.some(e => e !== 'neutral')) return ['neutral']
  throw Error(`No scene review requirements for ${outfit}; supply an explicit outfit mapping`)
}
/** Never removes approvals or changes the input. A plan grants no approval and performs no pixel verification. */
export function planFarmExpressions(manifest: ReviewManifest, scenes: SceneRequirements = {}) {
  for (const key of Object.keys(scenes)) if (!manifest.outfits.includes(key)) throw Error(`Scene requirements name an unselected outfit: ${key}`)
  const faces = new Set((manifest.faces ?? []).map(f => f.expression))
  const rows = manifest.outfits.map(outfit => {
    const base = manifest.assets?.find(a => a.outfit === outfit)
    const outputs = base?.outputs ?? []
    const declaredApproved = unique([...(base?.neutralOwnerApproved ? ['neutral'] : []), ...outputs.filter(o => o.ownerApproved).map(o => o.expression)])
    const minimumExpressions = unique([...minimum(outfit, scenes), ...(scenes[outfit] ?? [])])
    const expressions = unique([...minimumExpressions, ...declaredApproved])
    const recorded = new Set([...(base ? ['neutral'] : []), ...outputs.map(o => o.expression)])
    return { outfit, minimumExpressions, expressions, carriedForwardAdditional: declaredApproved.filter(e => !minimumExpressions.includes(e)),
      missingCompositions: expressions.filter(e => !recorded.has(e)), pendingOwnerApproval: expressions.filter(e => !declaredApproved.includes(e)),
      missingSharedFaces: expressions.filter(e => e !== 'neutral' && !faces.has(e)) }
  })
  return { schemaVersion: 1, kind: 'farm-expression-review-plan', approvalGranted: false, pixelVerificationPerformed: false,
    source: 'uma-farm/docs/design/her-look.md#minimum-facial-expressions-by-outfit',
    minimumReviews: rows.reduce((n, row) => n + row.minimumExpressions.length, 0),
    plannedReviews: rows.reduce((n, row) => n + row.expressions.length, 0),
    carriedForwardAdditional: rows.reduce((n, row) => n + row.carriedForwardAdditional.length, 0),
    requiredSharedExpressions: unique(rows.flatMap(row => row.expressions.filter(e => e !== 'neutral'))), rows }
}
