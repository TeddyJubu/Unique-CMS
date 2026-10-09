import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { useCustomer } from "@/lib/customer-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetchOrdersByPhone, formatPrice } from "@/lib/shop"
import type { Order } from "@/lib/supabase"
import { Search, Package } from "lucide-react"

const statusColors: Record<Order["status"], string> = {
  pending: "border-muted-foreground text-muted-foreground",
  confirmed: "border-primary text-primary",
  shipped: "border-primary text-primary",
  delivered: "border-primary bg-primary/10 text-primary",
  cancelled: "border-destructive text-destructive",
}

const paymentColors: Record<Order["payment_status"], string> = {
  pending: "border-muted-foreground text-muted-foreground",
  paid: "border-primary text-primary",
  failed: "border-destructive text-destructive",
}

export function TrackOrderPage() {
  const { t, locale } = useI18n()
  const { customer } = useCustomer()
  const [phone, setPhone] = useState("")
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    if (customer && !searched) {
      setPhone(customer.phone)
      setLoading(true)
      setSearched(true)
      fetchOrdersByPhone(customer.phone)
        .then(setOrders)
        .catch(console.error)
        .finally(() => setLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const data = await fetchOrdersByPhone(phone.trim())
      setOrders(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const statusLabel = (status: Order["status"]) => {
    const map: Record<Order["status"], string> = {
      pending: t("statusPending"),
      confirmed: t("statusConfirmed"),
      shipped: t("statusShipped"),
      delivered: t("statusDelivered"),
      cancelled: t("statusCancelled"),
    }
    return map[status]
  }

  const paymentLabel = (status: Order["payment_status"]) => {
    const map: Record<Order["payment_status"], string> = {
      pending: t("paymentPending"),
      paid: t("paymentPaid"),
      failed: t("paymentPending"),
    }
    return map[status]
  }

  return (
    <div className="pt-16">
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
        <h1 className="mb-2 text-2xl font-extrabold uppercase tracking-tight md:text-3xl">
          {t("trackOrderTitle")}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">{t("enterPhoneToTrack")}</p>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            className="h-12 flex-1 border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <Button type="submit" size="lg" disabled={loading}>
            <Search className="size-4" /> {t("findOrders")}
          </Button>
        </form>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm uppercase text-muted-foreground">{t("loading")}</span>
          </div>
        )}

        {!loading && searched && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="size-12 text-muted-foreground" strokeWidth={1} />
            <p className="mt-4 text-sm uppercase text-muted-foreground">{t("noOrdersFound")}</p>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div className="mt-8 space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border border-border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t("orderNumber")}
                    </p>
                    <p className="text-lg font-extrabold text-primary">{order.order_number}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className={statusColors[order.status]}>
                      {statusLabel(order.status)}
                    </Badge>
                    <Badge variant="outline" className={paymentColors[order.payment_status]}>
                      {paymentLabel(order.payment_status)}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("orderDate")}: {new Date(order.created_at).toLocaleDateString()}
                  </p>
                  <div className="mt-2 space-y-1">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-foreground/80">
                          {item.product_name} {item.size && `(${item.size})`} x{item.quantity}
                        </span>
                        <span className="font-bold">{formatPrice(item.price * item.quantity, locale)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between border-t border-border pt-3">
                    <span className="text-sm font-bold uppercase">{t("total")}</span>
                    <span className="text-lg font-extrabold text-primary">
                      {formatPrice(order.total, locale)}
                    </span>
                  </div>
                </div>

                {order.payment_method === "cod" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("cashOnDelivery")}
                  </p>
                )}
                {order.payment_method === "bkash" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("bkash")} {order.bkash_trx_id && `• TrxID: ${order.bkash_trx_id}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
