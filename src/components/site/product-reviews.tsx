import { useEffect, useState } from "react"
import { Star, BadgeCheck, ImagePlus } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ProductReview } from "@/lib/supabase"
import {
  fetchReviews,
  summarizeReviews,
  submitReview,
  cleanPhotoUrls,
  type ReviewSummary,
} from "@/lib/reviews"
import { ImageLightbox } from "@/components/site/image-lightbox"

export function RatingStars({
  value,
  className,
  starClass = "size-4",
}: {
  value: number
  className?: string
  starClass?: string
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${value.toFixed(1)} / 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            starClass,
            i <= Math.round(value) ? "fill-primary text-primary" : "text-muted-foreground/50"
          )}
        />
      ))}
    </span>
  )
}

export function useReviewSummary(productId: string | undefined): ReviewSummary | null {
  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  useEffect(() => {
    if (!productId) return
    fetchReviews(productId)
      .then((r) => setSummary(summarizeReviews(r)))
      .catch(() => setSummary(null))
  }, [productId])
  return summary
}

export function ProductReviews({ productId }: { productId: string }) {
  const { t, locale } = useI18n()
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [photos, setPhotos] = useState("")

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ucp-customer")
      if (stored) {
        const c = JSON.parse(stored) as { name?: string; phone?: string }
        if (c.name) setName(c.name)
        if (c.phone) setPhone(c.phone)
      }
    } catch {
      // ignore
    }
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      setReviews(await fetchReviews(productId))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  const summary = summarizeReviews(reviews)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !body.trim() || submitting) return
    setSubmitting(true)
    try {
      await submitReview({
        product_id: productId,
        customer_name: name,
        customer_phone: phone.trim() || null,
        rating,
        title: title.trim() || null,
        body,
        photos: cleanPhotoUrls(photos),
      })
      setSubmitted(true)
      setFormOpen(false)
      setTitle("")
      setBody("")
      setPhotos("")
      setRating(5)
      load()
    } catch (err) {
      console.error(err)
      alert(t("error"))
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    "h-12 w-full border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"

  return (
    <section id="reviews" className="mt-12 border-t border-border pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold uppercase tracking-tight md:text-2xl">
            {t("reviews")}
          </h2>
          {summary.count > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <RatingStars value={summary.average} />
              <span className="text-sm font-bold">{summary.average.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">
                ({t("basedOnReviews", { n: summary.count })})
              </span>
            </div>
          )}
        </div>
        <Button variant="outline" onClick={() => setFormOpen(!formOpen)}>
          {t("writeReview")}
        </Button>
      </div>

      {submitted && (
        <div className="mt-4 border border-primary/40 bg-primary/5 p-4 text-sm font-medium text-primary">
          {t("reviewSubmitted")}
        </div>
      )}

      {formOpen && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-3 border border-border p-4">
          <div>
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("yourRating")} *
            </span>
            <div className="flex gap-1" role="radiogroup" aria-label={t("yourRating")}>
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={rating === i}
                  aria-label={`${i} / 5`}
                  onClick={() => setRating(i)}
                  className="p-1"
                >
                  <Star
                    className={cn(
                      "size-7",
                      i <= rating ? "fill-primary text-primary" : "text-muted-foreground/50"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("yourName")} *
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("phoneNumber")}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("reviewTitle")}
            </label>
            <input
              type="text"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("yourReview")} *
            </label>
            <textarea
              required
              maxLength={2000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("reviewPlaceholder")}
              className={cn(inputClass, "h-24 py-3")}
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <ImagePlus className="size-3.5" /> {t("reviewPhotos")}
            </label>
            <textarea
              value={photos}
              onChange={(e) => setPhotos(e.target.value)}
              placeholder="https://..."
              className={cn(inputClass, "h-20 py-3")}
            />
          </div>
          <Button type="submit" disabled={submitting} className="text-sm font-bold uppercase tracking-wider">
            {submitting ? t("saving") : t("submitReview")}
          </Button>
        </form>
      )}

      <div className="mt-6">
        {loading ? (
          <p className="py-6 text-center text-sm uppercase text-muted-foreground">{t("loading")}</p>
        ) : reviews.length === 0 ? (
          <div className="border border-dashed border-border p-8 text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {t("noReviewsYet")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t("beFirstToReview")}</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <RatingStars value={r.rating} starClass="size-3.5" />
                  {r.title && <span className="text-sm font-bold">{r.title}</span>}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">{r.body}</p>
                {r.photos.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {r.photos.map((p, i) => (
                      <button
                        key={`${r.id}-${i}`}
                        onClick={() => setLightbox({ photos: r.photos, index: i })}
                        className="size-20 shrink-0 overflow-hidden border border-border"
                      >
                        <img src={p} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground/70">{r.customer_name}</span>
                  {r.is_verified && (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <BadgeCheck className="size-3.5" /> {t("verifiedPurchase")}
                    </span>
                  )}
                  <span>•</span>
                  <span>{new Date(r.created_at).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-US")}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lightbox && (
        <ImageLightbox
          images={lightbox.photos}
          index={lightbox.index}
          alt={t("reviews")}
          onClose={() => setLightbox(null)}
          onIndexChange={(i) => setLightbox({ photos: lightbox.photos, index: i })}
        />
      )}
    </section>
  )
}
