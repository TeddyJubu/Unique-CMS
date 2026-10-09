import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { useCart } from "@/lib/cart"
import { useCustomer } from "@/lib/customer-auth"
import { navigate } from "@/lib/router"
import { Button } from "@/components/ui/button"
import { createOrder, fetchShopSettings, formatPrice, validateCoupon } from "@/lib/shop"
import type { ShopSettings } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"
import { CheckCircle2, ArrowRight, TicketPercent, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function CheckoutPage() {
  const { t, locale } = useI18n()
  const { items, subtotal, clearCart } = useCart()
  const { customer, saveProfile } = useCustomer()
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<{ orderNumber: string } | null>(null)
  const [couponInput, setCouponInput] = useState("")
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [couponMsg, setCouponMsg] = useState<string | null>(null)
  const [couponBusy, setCouponBusy] = useState(false)

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
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

  useEffect(() => {
    if (customer) {
      setForm((prev) => ({
        ...prev,
        customer_name: prev.customer_name || customer.name,
        customer_phone: prev.customer_phone || customer.phone,
        customer_address: prev.customer_address || customer.address || "",
        district: prev.district || customer.district || "",
        area_type: customer.area_type,
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer])

  const deliveryCharge = form.area_type === "inside_dhaka"
    ? (settings?.delivery_inside_dhaka ?? 60)
    : (settings?.delivery_outside_dhaka ?? 120)
  const total = subtotal - (coupon?.discount ?? 0) + deliveryCharge

  const applyCoupon = async () => {
    const code = couponInput.trim()
    if (!code || couponBusy) return
    setCouponBusy(true)
    setCouponMsg(null)
    try {
      const discount = await validateCoupon(code, subtotal)
      setCoupon({ code: code.toUpperCase(), discount })
      setCouponMsg(locale === "bn" ? "কুপন প্রয়োগ হয়েছে!" : "Coupon applied!")
    } catch (err) {
      setCoupon(null)
      const msg = err instanceof Error ? err.message : ""
      setCouponMsg(
        msg.includes("min_subtotal")
          ? (locale === "bn" ? "এই কুপনের জন্য ন্যূনতম অর্ডার প্রয়োজন" : "This coupon needs a higher order amount")
          : msg.includes("expired")
            ? (locale === "bn" ? "কুপনের মেয়াদ শেষ" : "This coupon has expired")
            : (locale === "bn" ? "কুপন সঠিক নয়" : "Invalid coupon code")
      )
    } finally {
      setCouponBusy(false)
    }
  }

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
          customer_email: form.customer_email.trim() || null,
          customer_address: form.customer_address,
          district: form.district,
          area_type: form.area_type,
          payment_method: form.payment_method,
          bkash_trx_id: form.payment_method === "bkash" ? form.bkash_trx_id : null,
          subtotal,
          delivery_charge: deliveryCharge,
          total,
          notes: form.notes || null,
          coupon_code: coupon?.code ?? null,
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
      saveProfile({
        phone: form.customer_phone,
        name: form.customer_name,
        address: form.customer_address,
        district: form.district,
        area_type: form.area_type,
      }).catch(() => {})
      // Fire-and-forget confirmation email; order is already placed.
      if (form.customer_email.trim()) {
        supabase.functions
          .invoke("order-confirmation", { body: { order_id: order.id } })
          .catch((e) => console.error("confirmation email failed", e))
      }
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
                {locale === "bn" ? "ইমেইল (ঐচ্ছিক)" : "Email (optional)"}
              </label>
              <input
                type="email"
                value={form.customer_email}
                onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                className={inputClass}
                placeholder={locale === "bn" ? "আপনার ইমেইল" : "you@example.com"}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {locale === "bn"
                  ? "অর্ডার কনফার্মেশন ইমেইল পেতে চাইলে দিন"
                  : "Get an order confirmation email"}
              </p>
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

          {/* Coupon */}
          <div className="border border-border p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {locale === "bn" ? "কুপন কোড" : "Coupon code"}
            </label>
            {coupon ? (
              <div className="flex items-center justify-between border border-primary/40 bg-primary/5 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm font-bold text-primary">
                  <TicketPercent className="size-4" /> {coupon.code}
                </span>
                <button
                  type="button"
                  onClick={() => { setCoupon(null); setCouponMsg(null); setCouponInput("") }}
                  aria-label="Remove coupon"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder={locale === "bn" ? "যেমন: EID10" : "e.g. EID10"}
                  className="h-11 flex-1 border border-border bg-background px-4 text-sm uppercase text-foreground placeholder:normal-case placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!couponInput.trim() || couponBusy}
                  onClick={applyCoupon}
                  className="min-h-11 text-xs font-bold uppercase tracking-wider"
                >
                  {locale === "bn" ? "প্রয়োগ" : "Apply"}
                </Button>
              </div>
            )}
            {couponMsg && (
              <p className={cn("mt-2 text-xs", coupon ? "text-primary" : "text-destructive")}>{couponMsg}</p>
            )}
          </div>

          {/* Summary */}
          <div className="border border-border p-4">
            <div className="flex justify-between text-sm">
              <span className="uppercase text-muted-foreground">{t("subtotal")}</span>
              <span className="font-bold">{formatPrice(subtotal, locale)}</span>
            </div>
            {coupon && (
              <div className="mt-2 flex justify-between text-sm">
                <span className="uppercase text-muted-foreground">
                  {locale === "bn" ? "ছাড়" : "Discount"} ({coupon.code})
                </span>
                <span className="font-bold text-primary">-{formatPrice(coupon.discount, locale)}</span>
              </div>
            )}
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
