import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { useCart } from "@/lib/cart"
import { navigate } from "@/lib/router"
import { Button } from "@/components/ui/button"
import { createOrder, fetchShopSettings, formatPrice } from "@/lib/shop"
import type { ShopSettings } from "@/lib/supabase"
import { CheckCircle2, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function CheckoutPage() {
  const { t, locale } = useI18n()
  const { items, subtotal, clearCart } = useCart()
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<{ orderNumber: string } | null>(null)

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    district: "",
    area_type: "inside_dhaka" as "inside_dhaka" | "outside_dhaka",
    payment_method: "cod" as "cod" | "bkash",
    bkash_trx_id: "",
    notes: "",
  })

  useEffect(() => {
    fetchShopSettings().then(setSettings).catch(console.error)
  }, [])

  const deliveryCharge = form.area_type === "inside_dhaka"
    ? (settings?.delivery_inside_dhaka ?? 60)
    : (settings?.delivery_outside_dhaka ?? 120)
  const total = subtotal + deliveryCharge

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.customer_name || !form.customer_phone || !form.customer_address || !form.district) return
    if (form.payment_method === "bkash" && !form.bkash_trx_id) return

    setSubmitting(true)
    try {
      const order = await createOrder(
        {
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          customer_address: form.customer_address,
          district: form.district,
          area_type: form.area_type,
          payment_method: form.payment_method,
          bkash_trx_id: form.payment_method === "bkash" ? form.bkash_trx_id : null,
          subtotal,
          delivery_charge: deliveryCharge,
          total,
          notes: form.notes || null,
        },
        items.map((i) => ({
          product_id: i.product_id,
          product_name: i.name,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
          price: i.price,
        }))
      )
      setSuccess({ orderNumber: order.order_number })
      clearCart()
    } catch (err) {
      console.error(err)
      alert(t("error"))
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center pt-16">
        <CheckCircle2 className="size-16 text-primary" strokeWidth={1.5} />
        <h1 className="mt-6 text-2xl font-extrabold uppercase tracking-tight md:text-3xl">
          {t("orderPlaced")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("orderSuccessMsg")}</p>
        <div className="mt-6 border border-border p-6 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("orderNumber")}</p>
          <p className="mt-2 text-xl font-extrabold text-primary">{success.orderNumber}</p>
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => navigate("/track-order")}>
            {t("trackYourOrder")}
          </Button>
          <Button onClick={() => navigate("/shop")}>
            {t("continueShopping")}
          </Button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    navigate("/cart")
    return null
  }

  const inputClass = "h-12 w-full border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"

  return (
    <div className="pt-16">
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
        <h1 className="mb-6 text-2xl font-extrabold uppercase tracking-tight md:text-3xl">
          {t("checkoutTitle")}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer details */}
          <div className="space-y-3 border border-border p-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("fullName")} *
              </label>
              <input
                type="text"
                required
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                className={inputClass}
                placeholder={t("fullName")}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("phoneNumber")} *
              </label>
              <input
                type="tel"
                required
                value={form.customer_phone}
                onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                className={inputClass}
                placeholder="01XXXXXXXXX"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("address")} *
              </label>
              <textarea
                required
                value={form.customer_address}
                onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
                className={cn(inputClass, "h-20 py-3")}
                placeholder={t("address")}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("district")} *
              </label>
              <input
                type="text"
                required
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className={inputClass}
                placeholder={t("district")}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("deliveryArea")} *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, area_type: "inside_dhaka" })}
                  className={cn(
                    "flex-1 border py-3 text-sm font-medium uppercase transition-colors",
                    form.area_type === "inside_dhaka"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground/70 hover:border-primary"
                  )}
                >
                  {t("insideDhaka")} ({formatPrice(settings?.delivery_inside_dhaka ?? 60, locale)})
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, area_type: "outside_dhaka" })}
                  className={cn(
                    "flex-1 border py-3 text-sm font-medium uppercase transition-colors",
                    form.area_type === "outside_dhaka"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground/70 hover:border-primary"
                  )}
                >
                  {t("outsideDhaka")} ({formatPrice(settings?.delivery_outside_dhaka ?? 120, locale)})
                </button>
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-3 border border-border p-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("paymentMethod")} *
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, payment_method: "cod" })}
                className={cn(
                  "flex-1 border py-3 text-sm font-bold uppercase transition-colors",
                  form.payment_method === "cod"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground/70 hover:border-primary"
                )}
              >
                {t("cashOnDelivery")}
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, payment_method: "bkash" })}
                className={cn(
                  "flex-1 border py-3 text-sm font-bold uppercase transition-colors",
                  form.payment_method === "bkash"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground/70 hover:border-primary"
                )}
              >
                {t("bkash")}
              </button>
            </div>

            {form.payment_method === "bkash" && settings && (
              <div className="mt-3 border border-border bg-muted p-4">
                <p className="text-xs uppercase text-muted-foreground">{t("bkashInstructions")}</p>
                <p className="mt-2 text-lg font-extrabold text-primary">{settings.bkash_number}</p>
                <p className="mt-1 text-sm text-foreground">
                  {locale === "bn" ? "পরিমাণ" : "Amount"}: <span className="font-bold">{formatPrice(total, locale)}</span>
                </p>
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("bkashTrxId")} *
                  </label>
                  <input
                    type="text"
                    required={form.payment_method === "bkash"}
                    value={form.bkash_trx_id}
                    onChange={(e) => setForm({ ...form, bkash_trx_id: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. 9F3K2B7N"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("orderNotes")}
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={cn(inputClass, "h-20 py-3")}
            />
          </div>

          {/* Summary */}
          <div className="border border-border p-4">
            <div className="flex justify-between text-sm">
              <span className="uppercase text-muted-foreground">{t("subtotal")}</span>
              <span className="font-bold">{formatPrice(subtotal, locale)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="uppercase text-muted-foreground">{t("deliveryCharge")}</span>
              <span className="font-bold">{formatPrice(deliveryCharge, locale)}</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-border pt-3">
              <span className="text-base font-extrabold uppercase">{t("total")}</span>
              <span className="text-xl font-extrabold text-primary">{formatPrice(total, locale)}</span>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="w-full text-sm font-bold uppercase tracking-wider"
          >
            {submitting ? t("placingOrder") : <>{t("placeOrder")} <ArrowRight className="size-4" /></>}
          </Button>
        </form>
      </div>
    </div>
  )
}
