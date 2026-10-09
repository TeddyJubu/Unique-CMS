import { OrderConfirmation } from "@/components/site/order-confirmation"
import { OwnerError } from "@/components/site/owner-feedback"
import { ownerErrorMessage } from "@/lib/owner-errors"
import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { OrderCard } from "@/pages/owner/dashboard"
import { fetchAllOrders, updateOrderStatus, updateOrderPaymentStatus } from "@/lib/shop"
import { useOwnerAuth } from "@/lib/owner-auth"
import type { Order } from "@/lib/supabase"
import { CmsLayout } from "@/components/site/cms-layout"
import { Package } from "lucide-react"
import { cn } from "@/lib/utils"

export function OwnerOrdersPage() {
  const { t, locale } = useI18n()
  const { credentials } = useOwnerAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("all")
  const [confirmAction, setConfirmAction] = useState<{ type: string; orderId: string } | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!credentials) return
      const data = await fetchAllOrders(credentials)
      setOrders(data)
    } catch (e) {
      setError(ownerErrorMessage(e, t("ordersLoadError"), t("ownerSessionError")))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter)

  const handleStatusUpdate = async (orderId: string, status: Order["status"]) => {
    if (!credentials) throw new Error("owner_session")
    await updateOrderStatus(credentials, orderId, status)
    setConfirmAction(null)
    void load()
  }

  const handleMarkPaid = async (orderId: string) => {
    if (!credentials) throw new Error("owner_session")
    await updateOrderPaymentStatus(credentials, orderId, "paid")
    setConfirmAction(null)
    void load()
  }

  const filters = [
    { key: "all", label: t("allOrders") },
    { key: "pending", label: t("statusPending") },
    { key: "confirmed", label: t("statusConfirmed") },
    { key: "shipped", label: t("statusShipped") },
    { key: "delivered", label: t("statusDelivered") },
    { key: "cancelled", label: t("statusCancelled") },
  ]

  return (
    <CmsLayout title={t("allOrders")}>
      <OwnerError message={error} retry={() => void load()} />
      {/* Filter pills */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-foreground/70 hover:border-primary"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-muted-foreground">{t("loading")}</span>
        </div>
      ) : error ? null : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-12">
          <Package className="size-10 text-muted-foreground" strokeWidth={1} />
          <p className="mt-3 text-sm text-muted-foreground">{t("noOrdersYet")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAction={(type) => setConfirmAction({ type, orderId: order.id })}
              locale={locale}
              t={t as (key: string) => string}
            />
          ))}
        </div>
      )}

      <OrderConfirmation action={confirmAction?.type ?? null} order={orders.find((order) => order.id === confirmAction?.orderId)} onClose={() => setConfirmAction(null)} onConfirm={async () => {
        if (!confirmAction) return
        const { type, orderId } = confirmAction
        if (type === "markPaid") await handleMarkPaid(orderId)
        else {
          const statuses: Record<string, Order["status"]> = { confirm: "confirmed", ship: "shipped", deliver: "delivered", cancel: "cancelled" }
          if (statuses[type]) await handleStatusUpdate(orderId, statuses[type])
        }
      }} />
    </CmsLayout>
  )
}
