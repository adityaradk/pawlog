export const LB_PER_KG = 2.20462

export function convert(value, from, to) {
  if (from === to) return value
  return from === 'kg' ? value * LB_PER_KG : value / LB_PER_KG
}

export function formatWeight(value, unit) {
  return `${(Math.round(value * 10) / 10).toFixed(1)} ${unit}`
}

// Upper bounds that catch typos (e.g. 46 instead of 4.6)
const MAX_KG = { cat: 15, dog: 100 }

export function maxWeight(species, unit) {
  const kg = MAX_KG[species] ?? 100
  return Math.round(unit === 'kg' ? kg : kg * LB_PER_KG)
}
