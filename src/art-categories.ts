/** Additional Farm collections, independent of the standard wardrobe and story scene set. */
export const farmCategories = {
  'pajama-outfits': { label: 'Pajama Outfits', kind: 'look' },
  'wedding-anniversary-outfits': { label: 'Wedding Anniversary Outfits', kind: 'look' },
  'pajama-splash': { label: 'Pajama Splash', kind: 'splash' },
  'wedding-anniversary-splash': { label: 'Wedding Anniversary Splash', kind: 'splash' },
} as const

export type ArtCategory = keyof typeof farmCategories
export function isArtCategory(value: unknown): value is ArtCategory {
  return typeof value === 'string' && Object.hasOwn(farmCategories, value)
}
export const categoryFolder = (category: ArtCategory) => 'categories/' + category
