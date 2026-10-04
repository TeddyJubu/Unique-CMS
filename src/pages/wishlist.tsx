import { useI18n } from "@/lib/i18n"
import { useWishlist } from "@/lib/wishlist"
import { navigate } from "@/lib/router"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/shop"
import { Heart, Trash2, ShoppingBag } from "lucide-react"

export function WishlistPage() {
  const { t, locale } = useI18n()
  const { items, remove } = useWishlist()

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center pt-16">
        <Heart className="size-12 text-muted-foreground" strokeWidth={1} />
        <p className="mt-4 text-sm uppercase text-muted-foreground">
          {locale === "bn" ? "আপনার উইশলিস্ট খালি" : "Your wishlist is empty"}
        </p>
        <Button variant="outline" className="mt-6" onClick={() => navigate("/shop")}>
          {t("continueShopping")}
        </Button>
      </div>
    )
  }

  return (
    <div className="pt-16">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <h1 className="mb-6 text-2xl font-extrabold uppercase tracking-tight md:text-3xl">
          {locale === "bn" ? "উইশলিস্ট" : "Wishlist"}
        </h1>

        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 border border-border p-4">
              <button
                onClick={() => navigate(`/product?id=${item.id}`)}
                className="size-24 shrink-0 overflow-hidden border border-border bg-muted"
              >
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ShoppingBag className="size-6 text-muted-foreground" />
                  </div>
                )}
              </button>

              <div className="flex flex-1 flex-col justify-center gap-1">
                <button
                  onClick={() => navigate(`/product?id=${item.id}`)}
                  className="text-left text-sm font-bold uppercase tracking-tight text-foreground hover:text-primary"
                >
                  {locale === "bn" && item.name_bn ? item.name_bn : item.name}
                </button>
                <p className="text-base font-extrabold text-foreground">
                  {formatPrice(item.price, locale)}
                </p>
              </div>

              <button
                onClick={() => remove(item.id)}
                aria-label="Remove from wishlist"
                className="ml-auto self-center text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
