import { describe, expect, it } from 'vitest'
import { portraitReview, recordedExpressions } from './portrait-review.mjs'

describe('per-outfit portrait reviews', () => {
  const base = { outfit: 'pajamas-2', neutralOwnerApproved: true, outputs: [{ expression: 'tender', ownerApproved: true }, { expression: 'loving', ownerApproved: false }] }
  it('offers recorded reviews in the collection order', () => {
    expect(recordedExpressions(base, ['neutral', 'happy', 'tender', 'flustered', 'loving'])).toEqual(['neutral', 'tender', 'loving'])
  })
  it('does not label an absent expression as an approved composition', () => {
    expect(portraitReview(base, 'angry')).toEqual({ requested: 'angry', expression: 'neutral', state: null, missing: true, ownerApproved: false })
    expect(portraitReview(base, 'neutral').ownerApproved).toBe(true)
  })
  it('uses overlay approval instead of inheriting approval from the neutral base', () => {
    expect(portraitReview(base, 'tender').ownerApproved).toBe(true)
    expect(portraitReview(base, 'loving').ownerApproved).toBe(false)
    expect(portraitReview(base, 'loving').missing).toBe(false)
  })
})
