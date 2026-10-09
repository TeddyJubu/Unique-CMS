import type { Product } from "@/lib/supabase"

/** Canonical variant key. Must match the SQL convention: "size|color". */
export function variantKey(size: string | null | undefined, color: string | null | undefined): string {
  return `${(size ?? "").trim()}|${(color ?? "").trim()}`
}

export function hasVariantStock(product: Product): boolean {
  const vs = product.variant_stock
  return !!vs && Object.keys(vs).length > 0
}

/** Stock for one exact combination. Falls back to total stock in legacy mode. */
export function getVariantStock(product: Product, size: string | null, color: string | null): number {
  if (!hasVariantStock(product)) return product.stock
  const qty = product.variant_stock![variantKey(size, color)]
  return typeof qty === "number" && qty > 0 ? Math.floor(qty) : 0
}

/** Total available for a size across all colors (or the size-only key). */
export function getSizeStock(product: Product, size: string): number {
  if (!hasVariantStock(product)) return product.stock
  if (product.colors.length === 0) return getVariantStock(product, size, null)
  return product.colors.reduce((sum, c) => sum + getVariantStock(product, size, c), 0)
}

/** Total available for a color across all sizes (or the color-only key). */
export function getColorStock(product: Product, color: string): number {
  if (!hasVariantStock(product)) return product.stock
  if (product.sizes.length === 0) return getVariantStock(product, null, color)
  return product.sizes.reduce((sum, s) => sum + getVariantStock(product, s, color), 0)
}

/** Sum of all variant entries; falls back to total stock in legacy mode. */
export function getTotalStock(product: Product): number {
  if (!hasVariantStock(product)) return product.stock
  return Object.values(product.variant_stock!).reduce(
    (sum, q) => sum + (typeof q === "number" && q > 0 ? Math.floor(q) : 0),
    0
  )
}
