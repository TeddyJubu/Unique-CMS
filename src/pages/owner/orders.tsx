import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { OrderCard } from "@/pages/owner/dashboard"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  const [filter, setFilter] = useState<string>("all")
  const [confirmAction, setConfirmAction] = useState<{ type: string; orderId: string } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      if (!credentials) return
      const data = await fetchAllOrders(credentials)
      setOrders(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter)

  const handleStatusUpdate = async (orderId: string, status: Order["status"]) => {
    if (!credentials) return
    await updateOrderStatus(credentials, orderId, status)
    setConfirmAction(null)
    load()
  }

  const handleMarkPaid = async (orderId: string) => {
    if (!credentials) return
    await updateOrderPaymentStatus(credentials, orderId, "paid")
    setConfirmAction(null)
    load()
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
      ) : filtered.length === 0 ? (
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

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">{t("areYouSure")}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {confirmAction?.type === "confirm" && t("confirm")}
              {confirmAction?.type === "ship" && t("ship")}
              {confirmAction?.type === "deliver" && t("deliver")}
              {confirmAction?.type === "cancel" && t("cancel")}
              {confirmAction?.type === "markPaid" && t("markPaid")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("no")}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl"
              onClick={() => {
                if (!confirmAction) return
                if (confirmAction.type === "confirm") handleStatusUpdate(confirmAction.orderId, "confirmed")
                else if (confirmAction.type === "ship") handleStatusUpdate(confirmAction.orderId, "shipped")
                else if (confirmAction.type === "deliver") handleStatusUpdate(confirmAction.orderId, "delivered")
                else if (confirmAction.type === "cancel") handleStatusUpdate(confirmAction.orderId, "cancelled")
                else if (confirmAction.type === "markPaid") handleMarkPaid(confirmAction.orderId)
              }}
            >
              {t("yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CmsLayout>
  )
}
