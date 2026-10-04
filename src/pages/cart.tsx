import { useI18n } from "@/lib/i18n"
import { useCart } from "@/lib/cart"
import { navigate } from "@/lib/router"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/shop"
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react"

export function CartPage() {
  const { t, locale } = useI18n()
  const { items, removeItem, updateQuantity, subtotal } = useCart()

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center pt-16">
        <ShoppingBag className="size-12 text-muted-foreground" strokeWidth={1} />
        <p className="mt-4 text-sm uppercase text-muted-foreground">{t("emptyCart")}</p>
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
          {t("yourCart")}
        </h1>

        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div
              key={`${item.product_id}-${item.size}-${item.color}`}
              className="flex gap-4 border border-border p-4"
            >
              {/* Image */}
              <button
                onClick={() => navigate(`/product?id=${item.product_id}`)}
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

              {/* Details */}
              <div className="flex flex-1 flex-col gap-1">
                <button
                  onClick={() => navigate(`/product?id=${item.product_id}`)}
                  className="text-left text-sm font-bold uppercase tracking-tight text-foreground hover:text-primary"
                >
                  {locale === "bn" && item.name_bn ? item.name_bn : item.name}
                </button>
                <p className="text-xs text-muted-foreground">
                  {t("size")}: {item.size} | {t("color")}: {item.color}
                </p>
                <p className="text-base font-extrabold text-foreground">
                  {formatPrice(item.price, locale)}
                </p>

                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product_id, item.size, item.color, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="flex size-7 items-center justify-center border border-border text-foreground hover:border-primary disabled:opacity-50"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, item.size, item.color, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      className="flex size-7 items-center justify-center border border-border text-foreground hover:border-primary disabled:opacity-50"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.product_id, item.size, item.color)}
                    className="ml-auto text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              {/* Line total */}
              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-base font-extrabold text-foreground">
                  {formatPrice(item.price * item.quantity, locale)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-8 border border-border p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm uppercase text-muted-foreground">{t("subtotal")}</span>
            <span className="text-lg font-bold">{formatPrice(subtotal, locale)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("deliveryCharge")}: {locale === "bn" ? "চেকআউটে নির্ধারিত" : "Calculated at checkout"}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/shop")}
            >
              {t("continueShopping")}
            </Button>
            <Button
              className="flex-1 text-sm font-bold uppercase tracking-wider"
              onClick={() => navigate("/checkout")}
            >
              {t("checkout")} <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
