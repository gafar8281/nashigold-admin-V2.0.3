export interface InventorySection {
  id: string
  label: string
  labelAr: string
  /** Normalized (see `normalize`) word prefixes, English or Arabic. */
  keywords: string[]
}

/**
 * Sections in match priority — the first section with a matching keyword wins,
 * so more specific groupings (sets, bullion) come before the pieces they contain.
 */
export const INVENTORY_SECTIONS: InventorySection[] = [
  { id: "set", label: "Set", labelAr: "طقم", keywords: ["set", "طقم"] },
  {
    id: "bar-coin",
    label: "Bar & Coin",
    labelAr: "سبائك وليرات",
    keywords: ["bar", "coin", "ingot", "سبيك", "ليره", "جنيه"],
  },
  { id: "muznat", label: "Muznat", labelAr: "مزنط", keywords: ["muznat", "مزنط", "مرتعش"] },
  {
    id: "bangle",
    label: "Bangle",
    labelAr: "معضد",
    keywords: ["bangle", "معضد", "معاضد", "غوايش"],
  },
  {
    id: "bracelet",
    label: "Bracelet",
    labelAr: "سوار",
    keywords: ["bracelet", "سوار", "اسوار"],
  },
  { id: "belt", label: "Belt", labelAr: "حزام", keywords: ["belt", "حزام"] },
  { id: "anklet", label: "Anklet", labelAr: "خلخال", keywords: ["anklet", "خلخال"] },
  { id: "necklace", label: "Necklace", labelAr: "عقد", keywords: ["necklace", "عقد", "قلاده"] },
  { id: "chain", label: "Chain", labelAr: "سلسلة", keywords: ["chain", "سلسل"] },
  { id: "earring", label: "Earring", labelAr: "حلق", keywords: ["earring", "حلق"] },
  { id: "ring", label: "Ring", labelAr: "خاتم", keywords: ["ring", "خاتم", "دبله"] },
  { id: "pendant", label: "Pendant", labelAr: "تعليقة", keywords: ["pendant", "تعليق", "دلايه"] },
  { id: "hand", label: "Hand", labelAr: "كف", keywords: ["hand", "كف"] },
]

export const OTHER_SECTION: InventorySection = {
  id: "other",
  label: "Other",
  labelAr: "أخرى",
  keywords: [],
}

/** Lowercase, drop Arabic diacritics/tatweel, and fold common letter variants. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
}

/**
 * Section id for an item description. Matches keywords against the start of
 * each word (with a leading Arabic "ال" also stripped), so plurals and
 * suffixes match but "ring" doesn't hit inside "earring".
 */
export function sectionOf(description: string): string {
  const words = normalize(description)
    .split(/[^\p{L}]+/u)
    .filter(Boolean)
    .flatMap((word) => (word.startsWith("ال") && word.length > 3 ? [word, word.slice(2)] : [word]))

  const match = INVENTORY_SECTIONS.find((section) =>
    section.keywords.some((keyword) => words.some((word) => word.startsWith(keyword)))
  )
  return match?.id ?? OTHER_SECTION.id
}

export function sectionById(id: string): InventorySection {
  return INVENTORY_SECTIONS.find((section) => section.id === id) ?? OTHER_SECTION
}
