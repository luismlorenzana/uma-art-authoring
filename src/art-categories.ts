/** Additional Farm collections, independent of the standard wardrobe and story scene set. */
export const farmCategories = {
  'pajama-outfits': { label: 'Pajama Outfits', kind: 'look' },
  'wedding-anniversary-outfits': { label: 'Wedding Anniversary Outfits', kind: 'look' },
  'pajama-splash': { label: 'Pajama Splash', kind: 'splash' },
  'wedding-anniversary-splash': { label: 'Wedding Anniversary Splash', kind: 'splash' },
} as const

export const cyberpunkCategories = {
  weapons: { label: 'Weapons', kind: 'look' },
  'combat-sprites': { label: 'Combat Sprites', kind: 'look' },
} as const

export const artCategories = { ...farmCategories, ...cyberpunkCategories }
export type ArtCategory = keyof typeof artCategories
export function categoriesFor(universe: string): Partial<typeof artCategories> {
  if (universe === 'farm-life') return farmCategories
  if (universe === 'cyberpunk') return cyberpunkCategories
  return {}
}
export function supportsCategory(universe: string, category: ArtCategory) {
  return Object.hasOwn(categoriesFor(universe), category)
}
export function isArtCategory(value: unknown): value is ArtCategory {
  return typeof value === 'string' && Object.hasOwn(artCategories, value)
}
export const categoryFolder = (category: ArtCategory) => 'categories/' + category
