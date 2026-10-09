import { throwOwnerError } from "@/lib/owner-errors"
import { supabase, type ProductReview } from "@/lib/supabase"
import { cached, invalidateCache } from "@/lib/cache"
import type { OwnerCredentials } from "@/lib/shop"

const LOCAL_KEY = "ucp-reviews"
// Never SELECT * : customer_phone is revoked from anon.
const REVIEW_COLUMNS =
  "id, product_id, customer_name, rating, title, body, photos, is_approved, is_verified, created_at"

function readLocal(): ProductReview[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as ProductReview[]
  } catch {
    return []
  }
}

function writeLocal(reviews: ProductReview[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(reviews))
}

export function cleanPhotoUrls(raw: string): string[] {
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s !== "" && (s.startsWith("https://") || s.startsWith("http://") || s.startsWith("/")))
    .slice(0, 5)
}

export async function fetchReviews(productId: string): Promise<ProductReview[]> {
  return cached(`reviews:${productId}`, async () => {
    try {
      const { data, error } = await supabase
        .from("product_reviews")
        .select(REVIEW_COLUMNS)
        .eq("product_id", productId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as ProductReview[]
    } catch {
      return readLocal().filter((r) => r.product_id === productId)
    }
  })
}

export type ReviewSummary = {
  count: number
  average: number
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
}

export function summarizeReviews(reviews: ProductReview[]): ReviewSummary {
  const distribution: ReviewSummary["distribution"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of reviews) {
    if (r.rating >= 1 && r.rating <= 5) distribution[r.rating as 1 | 2 | 3 | 4 | 5] += 1
  }
  const count = reviews.length
  const average = count === 0 ? 0 : reviews.reduce((s, r) => s + r.rating, 0) / count
  return { count, average, distribution }
}

export async function submitReview(input: {
  product_id: string
  customer_name: string
  customer_phone: string | null
  rating: number
  title: string | null
  body: string
  photos: string[]
}): Promise<{ pending: boolean }> {
  const name = input.customer_name.trim().slice(0, 60)
  const body = input.body.trim().slice(0, 2000)
  if (!name || !body || input.rating < 1 || input.rating > 5) {
    throw new Error("invalid_review")
  }
  try {
    const { error } = await supabase.from("product_reviews").insert({
      product_id: input.product_id,
      customer_name: name,
      customer_phone: input.customer_phone?.trim() || null,
      rating: input.rating,
      title: input.title?.trim().slice(0, 120) || null,
      body,
      photos: input.photos.slice(0, 5),
    })
    if (error) throw error
    invalidateCache(`reviews:${input.product_id}`)
    return { pending: true }
  } catch {
    const local: ProductReview = {
      id: `local-${crypto.randomUUID()}`,
      product_id: input.product_id,
      customer_name: name,
      rating: input.rating,
      title: input.title?.trim() || null,
      body,
      photos: input.photos.slice(0, 5),
      is_approved: true,
      is_verified: false,
      created_at: new Date().toISOString(),
    }
    writeLocal([local, ...readLocal()])
    invalidateCache(`reviews:${input.product_id}`)
    return { pending: false }
  }
}

export async function fetchAllReviewsForOwner(
  creds: OwnerCredentials,
  pendingOnly: boolean
): Promise<ProductReview[]> {
  const { data, error } = await supabase.rpc("admin_list_reviews", { p_phone: creds.phone, p_pin: creds.pin, p_pending_only: pendingOnly })
  if (error) throwOwnerError(error, "reviews_load_failed")
  return (data ?? []) as ProductReview[]
}

export async function setReviewStatus(
  creds: OwnerCredentials,
  reviewId: string,
  approved: boolean,
  verified: boolean
): Promise<void> {
  if (reviewId.startsWith("local-")) {
    writeLocal(
      readLocal().map((r) =>
        r.id === reviewId ? { ...r, is_approved: approved, is_verified: verified } : r
      )
    )
    invalidateCache("reviews:")
    return
  }
  const { error } = await supabase.rpc("admin_set_review_status", {
    p_phone: creds.phone,
    p_pin: creds.pin,
    p_review_id: reviewId,
    p_approved: approved,
    p_verified: verified,
  })
  if (error) throwOwnerError(error, "update_failed")
  invalidateCache("reviews:")
}

export async function deleteReview(creds: OwnerCredentials, reviewId: string): Promise<void> {
  if (reviewId.startsWith("local-")) {
    writeLocal(readLocal().filter((r) => r.id !== reviewId))
    invalidateCache("reviews:")
    return
  }
  const { error } = await supabase.rpc("admin_delete_review", {
    p_phone: creds.phone,
    p_pin: creds.pin,
    p_review_id: reviewId,
  })
  if (error) throwOwnerError(error, "delete_failed")
  invalidateCache("reviews:")
}
