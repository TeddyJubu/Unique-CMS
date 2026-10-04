import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"
import { formatPrice } from "@/lib/shop"
import { navigate } from "@/lib/router"
import type { Product } from "@/lib/supabase"
import { getProductImageUrl } from "@/lib/shop"

export function ProductCard({ product }: { product: Product }) {
  const { locale, t } = useI18n()
  const imageUrl = getProductImageUrl(product)
  const hasDiscount = product.compare_price && product.compare_price > product.price
  const discountPct = hasDiscount
    ? Math.round(((product.compare_price! - product.price) / product.compare_price!) * 100)
    : 0

  const name = locale === "bn" && product.name_bn ? product.name_bn : product.name

  return (
    <Card
      className="group cursor-pointer border-border bg-card p-0 transition-all hover:border-primary/50"
      onClick={() => navigate(`/product?id=${product.id}`)}
    >
      <div className="relative aspect-[3/4] overflow-hidden border-b border-border bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-xs uppercase text-muted-foreground">No image</span>
          </div>
        )}
        <button
          className="absolute left-3 top-3 text-foreground/50 transition-colors hover:text-primary"
          onClick={(e) => e.stopPropagation()}
          aria-label="Add to wishlist"
        >
          <Heart className="size-5" />
        </button>
        {hasDiscount && (
          <Badge className="absolute right-3 top-3 bg-primary px-2 py-1 text-[10px] font-bold uppercase text-primary-foreground">
            -{discountPct}% {t("off")}
          </Badge>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="text-sm font-bold uppercase text-foreground">{t("outOfStock")}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h3 className="line-clamp-1 text-sm font-bold uppercase tracking-tight text-foreground">
          {name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-extrabold text-foreground">
            {formatPrice(product.price, locale)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.compare_price!, locale)}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

export function ProductGrid({
  products,
  className,
}: {
  products: Product[]
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4",
        className
      )}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
