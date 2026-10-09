import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { useOwnerAuth } from "@/lib/owner-auth"
import { CmsLayout } from "@/components/site/cms-layout"
import { RatingStars } from "@/components/site/product-reviews"
import { fetchAllReviewsForOwner, setReviewStatus, deleteReview } from "@/lib/reviews"
import type { ProductReview } from "@/lib/supabase"
import { Star, Trash2, BadgeCheck, Check, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

export function OwnerReviewsPage() {
  const { t, locale } = useI18n()
  const { credentials } = useOwnerAuth()
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingOnly, setPendingOnly] = useState(true)

  const load = async () => {
    if (!credentials) return
    setLoading(true)
    try {
      setReviews(await fetchAllReviewsForOwner(credentials, pendingOnly))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOnly])

  const handleStatus = async (r: ProductReview, approved: boolean, verified: boolean) => {
    if (!credentials) return
    try {
      await setReviewStatus(credentials, r.id, approved, verified)
      load()
    } catch (e) {
      console.error(e)
      alert(t("error"))
    }
  }

  const handleDelete = async (id: string) => {
    if (!credentials || !confirm(t("areYouSure"))) return
    try {
      await deleteReview(credentials, id)
      load()
    } catch (e) {
      console.error(e)
      alert(t("error"))
    }
  }

  return (
    <CmsLayout title={t("manageReviews")}>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {reviews.length} {t("reviews").toLowerCase()}
        </p>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(e) => setPendingOnly(e.target.checked)}
            className="size-4 rounded accent-primary"
          />
          {t("pendingOnly")}
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-muted-foreground">{t("loading")}</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-12">
          <Star className="size-10 text-muted-foreground" strokeWidth={1} />
          <p className="mt-3 text-sm text-muted-foreground">{t("noPendingReviews")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RatingStars value={r.rating} starClass="size-3.5" />
                  {!r.is_approved && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {t("pendingApproval")}
                    </span>
                  )}
                  {r.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <BadgeCheck className="size-3" /> {t("markVerified")}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  aria-label={t("delete")}
                  className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {r.product_name && (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-primary">
                  {r.product_name}
                </p>
              )}
              {r.title && <p className="mt-2 text-sm font-bold">{r.title}</p>}
              <p className="mt-1 text-sm leading-relaxed text-foreground/80">{r.body}</p>

              {r.photos.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {r.photos.map((p, i) => (
                    <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="size-16 shrink-0 overflow-hidden rounded-lg border border-border">
                      <img src={p} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              )}

              <p className="mt-2 text-xs text-muted-foreground">
                {r.customer_name}
                {r.customer_phone ? ` • ${r.customer_phone}` : ""} •{" "}
                {new Date(r.created_at).toLocaleString(locale === "bn" ? "bn-BD" : "en-US")}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {r.is_approved ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-10 rounded-lg"
                    onClick={() => handleStatus(r, false, r.is_verified)}
                  >
                    <EyeOff className="size-4" /> {t("unapprove")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="min-h-10 rounded-lg"
                    onClick={() => handleStatus(r, true, r.is_verified)}
                  >
                    <Check className="size-4" /> {t("approve")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className={cn("min-h-10 rounded-lg", r.is_verified && "border-primary text-primary")}
                  onClick={() => handleStatus(r, r.is_approved, !r.is_verified)}
                >
                  <BadgeCheck className="size-4" /> {t("markVerified")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CmsLayout>
  )
}
