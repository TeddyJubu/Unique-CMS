import { useEffect, useMemo, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { useRouter, navigate } from "@/lib/router"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProductGrid } from "@/components/site/product-card"
import { ImageLightbox } from "@/components/site/image-lightbox"
import { ProductReviews, RatingStars, useReviewSummary } from "@/components/site/product-reviews"
import { fetchProduct, fetchProducts, formatPrice, getWhatsAppOrderMessage } from "@/lib/shop"
import { setSeo } from "@/lib/seo"
import { useCart } from "@/lib/cart"
import { fetchShopSettings } from "@/lib/shop"
import type { Product, ShopSettings } from "@/lib/supabase"
import {
  getVariantStock,
  getSizeStock,
  getColorStock,
  getTotalStock,
  hasVariantStock,
} from "@/lib/variants"
import { ShoppingBag, MessageCircle, Minus, Plus, ArrowLeft, Check, ZoomIn } from "lucide-react"
import { cn } from "@/lib/utils"

export function ProductPage() {
  const { route } = useRouter()
  const { t, locale } = useI18n()
  const { addItem } = useCart()
  const productId = route.params.id
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState("")
  const [selectedColor, setSelectedColor] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [added, setAdded] = useState(false)
  const summary = useReviewSummary(productId)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [p, s] = await Promise.all([
          fetchProduct(productId),
          fetchShopSettings(),
        ])
        setProduct(p)
        setSettings(s)
        if (p) {
          setSelectedSize(p.sizes[0] || "")
          setSelectedColor(p.colors[0] || "")
          setQuantity(1)
          setActiveImage(0)
          const relatedProducts = await fetchProducts({ categoryId: p.category_id || undefined })
          setRelated(relatedProducts.filter((rp) => rp.id !== p.id).slice(0, 4))
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    if (productId) load()
  }, [productId])

  useEffect(() => {
    if (product) {
      setSeo({
        title: `${product.name} — Unique Collection by Princess`,
        description: product.description ?? undefined,
        image: product.product_images?.[0]?.image_url ?? null,
        type: "product",
      })
    }
  }, [product])

  const variant = useMemo(() => {
    if (!product) return null
    const tracked = hasVariantStock(product)
    const total = getTotalStock(product)
    const selectedStock = tracked
      ? getVariantStock(product, selectedSize || null, selectedColor || null)
      : total
    return { tracked, total, selectedStock }
  }, [product, selectedSize, selectedColor])

  useEffect(() => {
    if (variant) setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, variant.selectedStock)))
  }, [variant?.selectedStock])

  const handleAddToCart = () => {
    if (!product || !variant) return
    if (product.sizes.length > 0 && !selectedSize) return
    if (product.colors.length > 0 && !selectedColor) return
    if (variant.selectedStock <= 0) return
    addItem({
      product_id: product.id,
      name: product.name,
      name_bn: product.name_bn,
      price: product.price,
      image_url: product.product_images?.[0]?.image_url ?? null,
      size: selectedSize || "N/A",
      color: selectedColor || "N/A",
      quantity: Math.min(quantity, variant.selectedStock),
      stock: variant.selectedStock,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleWhatsApp = () => {
    if (!product || !settings) return
    const msg = getWhatsAppOrderMessage(
      locale === "bn" && product.name_bn ? product.name_bn : product.name,
      selectedSize || "N/A",
      selectedColor || "N/A",
      product.price,
      settings.shop_name
    )
    const phone = settings.whatsapp_number.replace(/[^0-9]/g, "")
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-32">
        <span className="text-sm uppercase text-muted-foreground">{t("loading")}</span>
      </div>
    )
  }

  if (!product || !variant) {
    return (
      <div className="flex flex-col items-center justify-center pt-32">
        <p className="text-sm uppercase text-muted-foreground">{t("noProducts")}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/shop")}>
          {t("continueShopping")}
        </Button>
      </div>
    )
  }

  const name = locale === "bn" && product.name_bn ? product.name_bn : product.name
  const description = locale === "bn" && product.description_bn ? product.description_bn : product.description
  const images = product.product_images || []
  const imageUrls = images.map((i) => i.image_url)
  const hasDiscount = product.compare_price && product.compare_price > product.price
  const inStock = variant.total > 0
  const comboAvailable = variant.selectedStock > 0

  return (
    <div className="pt-16">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <button
          className="mb-6 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-primary"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="size-4" /> {t("continueShopping")}
        </button>

        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          {/* Images */}
          <div className="flex flex-col gap-3">
            <button
              className="group relative block aspect-[3/4] w-full cursor-zoom-in overflow-hidden border border-border bg-muted text-left"
              onClick={() => images.length > 0 && setLightboxOpen(true)}
              aria-label={t("clickToZoom")}
            >
              {images.length > 0 ? (
                <img
                  src={images[activeImage]?.image_url}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <span className="text-xs uppercase text-muted-foreground">No image</span>
                </span>
              )}
              {images.length > 0 && (
                <span className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-background/85 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  <ZoomIn className="size-3.5" /> {t("clickToZoom")}
                </span>
              )}
              {hasDiscount && (
                <Badge className="absolute right-3 top-3 bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground">
                  -{Math.round(((product.compare_price! - product.price) / product.compare_price!) * 100)}% {t("off")}
                </Badge>
              )}
            </button>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(i)}
                    aria-label={`${name} ${i + 1}`}
                    className={cn(
                      "size-16 shrink-0 overflow-hidden border-2",
                      activeImage === i ? "border-primary" : "border-border"
                    )}
                  >
                    <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-xl font-extrabold uppercase tracking-tight text-foreground md:text-2xl">
                {name}
              </h1>
              {product.category && (
                <button
                  onClick={() => navigate(`/category?id=${product.category!.id}`)}
                  className="mt-1 text-xs uppercase tracking-wider text-primary hover:underline"
                >
                  {locale === "bn" && product.category.name_bn ? product.category.name_bn : product.category.name}
                </button>
              )}
              {summary && summary.count > 0 && (
                <button
                  onClick={() => document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" })}
                  className="mt-2 flex items-center gap-2"
                >
                  <RatingStars value={summary.average} />
                  <span className="text-sm text-muted-foreground underline-offset-2 hover:underline">
                    {summary.average.toFixed(1)} ({summary.count})
                  </span>
                </button>
              )}
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-extrabold text-foreground">
                {formatPrice(product.price, locale)}
              </span>
              {hasDiscount && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.compare_price!, locale)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {inStock ? (
                <>
                  <Badge variant="outline" className="border-primary text-primary">
                    <Check className="size-3" /> {t("inStock")}
                  </Badge>
                  {variant.total <= 5 && (
                    <span className="text-xs text-primary">{t("lowStock", { n: variant.total })}</span>
                  )}
                </>
              ) : (
                <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
                  {t("outOfStock")}
                </Badge>
              )}
            </div>

            {/* Sizes */}
            {product.sizes.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("selectSize")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => {
                    const sStock = getSizeStock(product, s)
                    const disabled = variant.tracked && sStock <= 0
                    return (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        disabled={disabled || !inStock}
                        aria-label={disabled ? `${s} — ${t("soldOut")}` : s}
                        className={cn(
                          "min-w-12 border px-4 py-2 text-sm uppercase transition-colors disabled:cursor-not-allowed",
                          selectedSize === s
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-foreground/70 hover:border-primary",
                          disabled && "bg-muted text-muted-foreground/60 line-through hover:border-border"
                        )}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Colors */}
            {product.colors.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("selectColor")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => {
                    const cStock = getColorStock(product, c)
                    const disabled = variant.tracked && cStock <= 0
                    return (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        disabled={disabled || !inStock}
                        aria-label={disabled ? `${c} — ${t("soldOut")}` : c}
                        className={cn(
                          "border px-4 py-2 text-sm uppercase transition-colors disabled:cursor-not-allowed",
                          selectedColor === c
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-foreground/70 hover:border-primary",
                          disabled && "bg-muted text-muted-foreground/60 line-through hover:border-border"
                        )}
                      >
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {variant.tracked && inStock && !comboAvailable && (
              <p className="text-sm font-medium text-destructive" role="status">
                {t("combinationOutOfStock")}
              </p>
            )}
            {variant.tracked && comboAvailable && variant.selectedStock <= 5 && (
              <p className="text-xs text-primary">
                {t("lowStock", { n: variant.selectedStock })}
              </p>
            )}

            {/* Quantity */}
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("quantity")}
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || !comboAvailable}
                  aria-label="Decrease quantity"
                  className="flex size-10 items-center justify-center border border-border text-foreground hover:border-primary disabled:opacity-50"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-12 text-center text-lg font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(variant.selectedStock, quantity + 1))}
                  disabled={quantity >= variant.selectedStock || !comboAvailable}
                  aria-label="Increase quantity"
                  className="flex size-10 items-center justify-center border border-border text-foreground hover:border-primary disabled:opacity-50"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button
                size="lg"
                className="flex-1 text-sm font-bold uppercase tracking-wider"
                onClick={handleAddToCart}
                disabled={!comboAvailable}
              >
                {added ? <><Check className="size-4" /> {t("addToCart")}</> : <><ShoppingBag className="size-4" /> {t("addToCart")}</>}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 text-sm font-bold uppercase tracking-wider"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="size-4" /> {t("askOnWhatsApp")}
              </Button>
            </div>

            {/* Description */}
            {description && (
              <div className="border-t border-border pt-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("description")}
                </h3>
                <p className="text-sm leading-relaxed text-foreground/80">{description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        <ProductReviews productId={product.id} />

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-xl font-extrabold uppercase tracking-tight md:text-2xl">
              {t("relatedProducts")}
            </h2>
            <ProductGrid products={related} />
          </section>
        )}
      </div>

      {lightboxOpen && images.length > 0 && (
        <ImageLightbox
          images={imageUrls}
          index={activeImage}
          alt={name}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setActiveImage}
        />
      )}
    </div>
  )
}
