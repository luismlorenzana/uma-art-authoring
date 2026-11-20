import { describe, expect, it } from 'vitest'
import { additionalFarmLooks, farmExpressions, planFarmExpressions, readReviewManifest, readSceneRequirements, standardExpressionReviews } from './farm-expression-plan.js'

describe('Farm scene-based expression reviews', () => {
  it('plans the game packet minimums for standard and numbered looks', () => {
    expect(planFarmExpressions({ outfits: Object.keys(standardExpressionReviews) }).minimumReviews).toBe(126)
    const added = planFarmExpressions({ outfits: additionalFarmLooks })
    expect(added.minimumReviews).toBe(42)
    expect(added.rows.every(r => r.expressions.join(',') === 'neutral,tender,loving')).toBe(true)
    expect(planFarmExpressions({ outfits: [...Object.keys(standardExpressionReviews), ...additionalFarmLooks] }).minimumReviews).toBe(168)
    expect(planFarmExpressions({ outfits: ['pajamas-1'] }).minimumReviews).toBe(10)
  })
  it('carries an existing complete approval forward without pruning images or expressions', () => {
    const manifest = { outfits: Object.keys(standardExpressionReviews), assets: Object.keys(standardExpressionReviews).map(outfit => ({ outfit, neutralOwnerApproved: true, outputs: farmExpressions.filter(e => e !== 'neutral').map(expression => ({ expression, ownerApproved: true })) })), faces: farmExpressions.filter(e => e !== 'neutral').map(expression => ({ expression })) }
    const before = structuredClone(manifest), plan = planFarmExpressions(manifest)
    expect(plan.minimumReviews).toBe(126)
    expect(plan.plannedReviews).toBe(192)
    expect(plan.carriedForwardAdditional).toBe(66)
    expect(plan.rows.every(r => !r.pendingOwnerApproval.length && !r.missingCompositions.length && !r.missingSharedFaces.length)).toBe(true)
    expect(manifest).toEqual(before)
    expect(plan.approvalGranted).toBe(false)
    expect(plan.pixelVerificationPerformed).toBe(false)
  })
  it('adds expressions for an actual scene and requires a mapping for an unfamiliar outfit', () => {
    expect(planFarmExpressions({ outfits: ['swimsuit'] }, { swimsuit: ['surprised'] }).minimumReviews).toBe(6)
    expect(() => planFarmExpressions({ outfits: ['orchard-visit'] })).toThrow(/explicit outfit mapping/)
    expect(planFarmExpressions({ outfits: ['orchard-visit'] }, { 'orchard-visit': ['happy'] }).rows[0]?.expressions).toEqual(['neutral', 'happy'])
    expect(() => planFarmExpressions({ outfits: ['pajamas-11'] })).toThrow()
    expect(() => planFarmExpressions({ outfits: ['swimsuit'] }, { winter: ['angry'] })).toThrow(/unselected outfit/)
    expect(() => planFarmExpressions({ outfits: ['constructor'] })).toThrow(/explicit outfit mapping/)
  })
  it('adds only 42 new reviews when extending an already approved standard family', () => {
    const manifest = { outfits: [...Object.keys(standardExpressionReviews), ...additionalFarmLooks], assets: Object.keys(standardExpressionReviews).map(outfit => ({ outfit, neutralOwnerApproved: true, outputs: farmExpressions.filter(e => e !== 'neutral').map(expression => ({ expression, ownerApproved: true })) })), faces: farmExpressions.filter(e => e !== 'neutral').map(expression => ({ expression })) }
    const plan = planFarmExpressions(manifest)
    expect(plan.plannedReviews).toBe(234)
    expect(plan.rows.flatMap(r => r.pendingOwnerApproval)).toHaveLength(42)
    expect(plan.rows.flatMap(r => r.missingSharedFaces)).toHaveLength(0)
  })
  it('distinguishes a missing review from a review still awaiting the owner', () => {
    const plan = planFarmExpressions(readReviewManifest({ outfits: ['pajamas-2'], assets: [{ outfit: 'pajamas-2', neutralOwnerApproved: true, outputs: [{ expression: 'tender', ownerApproved: false }] }], faces: [{ expression: 'tender' }] }))
    expect(plan.rows[0]?.missingCompositions).toEqual(['loving'])
    expect(plan.rows[0]?.pendingOwnerApproval).toEqual(['tender', 'loving'])
    expect(plan.rows[0]?.missingSharedFaces).toEqual(['loving'])
  })
  it('rejects duplicate and malformed inputs rather than guessing coverage', () => {
    expect(() => readReviewManifest({ outfits: ['spring'], assets: [{ outfit: 'winter' }] })).toThrow()
    expect(() => readReviewManifest({ outfits: ['spring'], assets: [{ outfit: 'spring' }, { outfit: 'spring' }] })).toThrow(/More than one base/)
    expect(() => readReviewManifest({ outfits: ['spring'], assets: [{ outfit: 'spring', outputs: [{ expression: 'neutral' }] }] })).toThrow(/non-neutral/)
    expect(() => readSceneRequirements({ spring: 'happy' })).toThrow()
  })
})
