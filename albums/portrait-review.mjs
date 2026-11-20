/** Recorded reviews for this base, in collection order. Never invent a Cartesian product. */
export function recordedExpressions(asset, order) {
  const recorded = new Set(['neutral', ...(asset.outputs ?? []).map(o => o.expression)])
  return order.filter(expression => recorded.has(expression))
}

/** An absent expression is a labelled neutral fallback, without approval of the requested state. */
export function portraitReview(asset, requested) {
  const state = requested === 'neutral' ? null : (asset.outputs ?? []).find(o => o.expression === requested) ?? null
  const missing = requested !== 'neutral' && state === null
  return { requested, expression: missing ? 'neutral' : requested, state, missing,
    ownerApproved: !missing && (state ? state.ownerApproved === true : asset.neutralOwnerApproved === true) }
}
