import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { useOwnerAuth } from "@/lib/owner-auth"
import { Button } from "@/components/ui/button"
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
import { navigate } from "@/lib/router"
import { fetchAllOrders, fetchProducts, updateOrderStatus, updateOrderPaymentStatus, formatPrice } from "@/lib/shop"
import type { Order, Product } from "@/lib/supabase"
import { CmsLayout } from "@/components/site/cms-layout"
import {
  Package, TrendingUp, Clock, Tag, ArrowRight,
  Phone, MessageCircle, Check, Truck, XCircle, DollarSign, ShoppingBag, Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"

const statusStyles: Record<Order["status"], string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  shipped: "bg-purple-50 text-purple-700 border-purple-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
}

export function OwnerDashboard() {
  const { t, locale } = useI18n()
  const { settings, credentials } = useOwnerAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productCount, setProductCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [confirmAction, setConfirmAction] = useState<{ type: string; orderId: string } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      if (!credentials) return
      const [o, p] = await Promise.all([fetchAllOrders(credentials, 10), fetchProducts()])
      setOrders(o)
      setProducts(p)
      setProductCount(p.length)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const today = new Date().toDateString()
  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today)
  const todayRevenue = todayOrders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + o.total, 0)
  const pendingCount = orders.filter((o) => o.status === "pending").length
  const lowStock = products.filter((p) => p.stock <= 5).sort((a, b) => a.stock - b.stock).slice(0, 5)
  const outOfStock = products.filter((p) => p.stock <= 0).length
  const topProducts = (() => {
    const counts = new Map<string, number>()
    for (const o of todayOrders) {
      if (o.status === "cancelled") continue
      for (const item of o.order_items ?? []) {
        counts.set(item.product_name, (counts.get(item.product_name) ?? 0) + item.quantity)
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  })()
  const districts = (() => {
    const counts = new Map<string, number>()
    for (const o of todayOrders) {
      if (o.status === "cancelled") continue
      counts.set(o.district, (counts.get(o.district) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  })()

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

  const stats = [
    { label: t("todayOrders"), value: String(todayOrders.length), icon: Clock },
    { label: t("todayRevenue"), value: todayRevenue === 0 ? "Tk 0" : formatPrice(todayRevenue, locale), icon: TrendingUp },
    { label: t("totalProducts"), value: String(productCount), icon: Tag },
  ]

  return (
    <CmsLayout title={settings?.shop_name}>
      {/* Welcome */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">{t("welcomeBack")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {pendingCount > 0 ? `${pendingCount} ${t("statusPending").toLowerCase()}` : t("noOrdersYet")}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
            <stat.icon className="size-5 text-primary" strokeWidth={1.8} />
            <p className="mt-2 text-lg font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Daily digest */}
      <div className="mb-8 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4.5 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-widest">
            {locale === "bn" ? "আজকের সারসংক্ষেপ" : "Today at a glance"}
          </h3>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Top sellers */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              {locale === "bn" ? "আজকের বেস্ট সেলার" : "Top sellers today"}
            </p>
            {topProducts.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{locale === "bn" ? "এখনো কিছু বিক্রি হয়নি" : "Nothing sold yet today"}</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {topProducts.map(([name, qty]) => (
                  <li key={name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-foreground/80">{name}</span>
                    <span className="shrink-0 font-bold text-primary">x{qty}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Where orders come from */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              {locale === "bn" ? "অর্ডার কোথা থেকে" : "Where orders came from"}
            </p>
            {districts.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{locale === "bn" ? "এখনো অর্ডার নেই" : "No orders yet today"}</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {districts.map(([district, count]) => (
                  <li key={district} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-foreground/80">{district}</span>
                    <span className="shrink-0 font-bold text-primary">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Low stock alerts */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              {locale === "bn" ? "স্টক কম" : "Low stock alerts"}
            </p>
            {lowStock.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{locale === "bn" ? "সব ঠিক আছে" : "All good"}</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-foreground/80">{p.name}</span>
                    <span className={cn("shrink-0 font-bold", p.stock <= 0 ? "text-destructive" : "text-amber-600")}>
                      {p.stock <= 0 ? (locale === "bn" ? "শেষ" : "Out") : `${p.stock} left`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {outOfStock > 0 && (
              <p className="mt-2 text-xs text-destructive">
                {locale === "bn" ? `${outOfStock} টি পণ্যের স্টক শেষ` : `${outOfStock} product(s) out of stock`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          onClick={() => navigate("/owner/post")}
          className="flex items-center gap-3 rounded-xl border border-border bg-primary p-4 text-left text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          <Package className="size-6 shrink-0" strokeWidth={1.5} />
          <div>
            <p className="font-semibold">{t("newPost")}</p>
            <p className="text-xs opacity-80">{t("postHelp")}</p>
          </div>
        </button>
        <button
          onClick={() => navigate("/owner/orders")}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary"
        >
          <Clock className="size-6 shrink-0 text-primary" strokeWidth={1.5} />
          <div>
            <p className="font-semibold">{t("newOrders")}</p>
            <p className="text-xs text-muted-foreground">{pendingCount} {t("statusPending").toLowerCase()}</p>
          </div>
        </button>
        <button
          onClick={() => navigate("/owner/products")}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary"
        >
          <Tag className="size-6 shrink-0 text-primary" strokeWidth={1.5} />
          <div>
            <p className="font-semibold">{t("myProducts")}</p>
            <p className="text-xs text-muted-foreground">{productCount} {t("items").toLowerCase()}</p>
          </div>
        </button>
      </div>

      {/* Recent orders */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight">{t("recentOrders")}</h3>
          {orders.length > 0 && (
            <button
              onClick={() => navigate("/owner/orders")}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {t("viewAllOrders")} <ArrowRight className="size-3.5" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-muted-foreground">{t("loading")}</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-12">
            <ShoppingBag className="size-10 text-muted-foreground" strokeWidth={1} />
            <p className="mt-3 text-sm text-muted-foreground">{t("noOrdersYet")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAction={(type) => setConfirmAction({ type, orderId: order.id })}
                locale={locale}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirm dialog */}
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

export function OrderCard({
  order,
  onAction,
  locale,
  t,
}: {
  order: Order
  onAction: (type: string) => void
  locale: "en" | "bn"
  t: (key: string) => string
}) {
  const phoneClean = order.customer_phone.replace(/[^0-9]/g, "")
  const statusLabel = ({
    pending: t("statusPending"),
    confirmed: t("statusConfirmed"),
    shipped: t("statusShipped"),
    delivered: t("statusDelivered"),
    cancelled: t("statusCancelled"),
  } as const)[order.status]

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-primary">{order.order_number}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", statusStyles[order.status])}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <p className="text-sm font-semibold">{order.customer_name}</p>
        <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
        <p className="text-xs text-muted-foreground">{order.customer_address}, {order.district}</p>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        {order.order_items?.map((item) => (
          <div key={item.id} className="flex justify-between py-0.5 text-sm">
            <span className="text-foreground/80">
              {item.product_name} {item.size && `(${item.size})`} x{item.quantity}
            </span>
            <span className="font-medium">{formatPrice(item.price * item.quantity, locale)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-border pt-2">
          <span className="text-sm font-bold">{t("total")}</span>
          <span className="text-lg font-bold text-primary">{formatPrice(order.total, locale)}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            {order.payment_method === "bkash" ? t("bkash") : t("cashOnDelivery")}
          </span>
          {order.payment_method === "bkash" && (
            <span className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              order.payment_status === "paid" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
            )}>
              {order.payment_status === "paid" ? t("paymentPaid") : t("paymentPending")}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {order.status === "pending" && (
          <Button size="sm" className="min-h-10 rounded-lg" onClick={() => onAction("confirm")}>
            <Check className="size-4" /> {t("confirm")}
          </Button>
        )}
        {order.status === "confirmed" && (
          <Button size="sm" className="min-h-10 rounded-lg" onClick={() => onAction("ship")}>
            <Truck className="size-4" /> {t("ship")}
          </Button>
        )}
        {order.status === "shipped" && (
          <Button size="sm" className="min-h-10 rounded-lg" onClick={() => onAction("deliver")}>
            <Check className="size-4" /> {t("deliver")}
          </Button>
        )}
        {(order.status === "pending" || order.status === "confirmed") && (
          <Button size="sm" variant="outline" className="min-h-10 rounded-lg text-destructive hover:text-destructive" onClick={() => onAction("cancel")}>
            <XCircle className="size-4" /> {t("cancel")}
          </Button>
        )}
        {order.payment_method === "bkash" && order.payment_status === "pending" && (
          <Button size="sm" variant="outline" className="min-h-10 rounded-lg" onClick={() => onAction("markPaid")}>
            <DollarSign className="size-4" /> {t("markPaid")}
          </Button>
        )}
        <Button size="sm" variant="outline" className="min-h-10 rounded-lg" asChild>
          <a href={`tel:${phoneClean}`}>
            <Phone className="size-4" /> {t("callCustomer")}
          </a>
        </Button>
        <Button size="sm" variant="outline" className="min-h-10 rounded-lg" asChild>
          <a href={`https://wa.me/${phoneClean}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4" /> {t("whatsappCustomer")}
          </a>
        </Button>
      </div>
    </div>
  )
}
