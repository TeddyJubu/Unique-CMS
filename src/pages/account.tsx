import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCustomer } from "@/lib/customer-auth"
import { useCart } from "@/lib/cart"
import { navigate } from "@/lib/router"
import { fetchOrdersByPhone, fetchProducts, formatPrice } from "@/lib/shop"
import type { Order } from "@/lib/supabase"
import { User, Package, LogOut, ShoppingBag } from "lucide-react"
import { cn } from "@/lib/utils"

const statusColors: Record<Order["status"], string> = {
  pending: "border-muted-foreground text-muted-foreground",
  confirmed: "border-primary text-primary",
  shipped: "border-primary text-primary",
  delivered: "border-primary bg-primary/10 text-primary",
  cancelled: "border-destructive text-destructive",
}

export function AccountPage() {
  const { t, locale } = useI18n()
  const { customer, login, logout, saveProfile } = useCustomer()
  const { addItem } = useCart()

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [loginBusy, setLoginBusy] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const [profile, setProfile] = useState({
    name: "",
    address: "",
    district: "",
    area_type: "inside_dhaka" as "inside_dhaka" | "outside_dhaka",
  })
  const [saved, setSaved] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [reorderMsg, setReorderMsg] = useState<string | null>(null)

  useEffect(() => {
    if (customer) {
      setProfile({
        name: customer.name,
        address: customer.address ?? "",
        district: customer.district ?? "",
        area_type: customer.area_type,
      })
      setOrdersLoading(true)
      fetchOrdersByPhone(customer.phone)
        .then(setOrders)
        .catch(console.error)
        .finally(() => setOrdersLoading(false))
    }
  }, [customer])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setLoginBusy(true)
    try {
      await login(name, phone)
    } catch {
      setLoginError(t("error"))
    } finally {
      setLoginBusy(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer || !profile.name.trim()) return
    await saveProfile({
      phone: customer.phone,
      name: profile.name,
      address: profile.address || null,
      district: profile.district || null,
      area_type: profile.area_type,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleReorder = async (order: Order) => {
    setReorderMsg(null)
    try {
      const products = await fetchProducts()
      let added = 0
      let skipped = 0
      for (const item of order.order_items ?? []) {
        const match = products.find(
          (p) => p.name.toLowerCase() === item.product_name.toLowerCase()
        )
        if (!match || match.stock <= 0) {
          skipped += 1
          continue
        }
        addItem({
          product_id: match.id,
          name: match.name,
          name_bn: match.name_bn,
          price: match.price,
          image_url: match.product_images?.[0]?.image_url ?? null,
          size: item.size ?? "N/A",
          color: item.color ?? "N/A",
          quantity: Math.min(item.quantity, match.stock),
          stock: match.stock,
        })
        added += 1
      }
      if (added > 0) {
        navigate("/cart")
      } else {
        setReorderMsg(t("reorderPartial"))
      }
      if (added > 0 && skipped > 0) setReorderMsg(t("reorderPartial"))
    } catch (e) {
      console.error(e)
      setReorderMsg(t("error"))
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

  const inputClass =
    "h-12 w-full border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"

  if (!customer) {
    return (
      <div className="pt-16">
        <div className="mx-auto max-w-md px-4 py-12 md:px-8">
          <div className="flex flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center bg-primary/10 text-primary">
              <User className="size-7" strokeWidth={1.5} />
            </span>
            <h1 className="mt-4 text-2xl font-extrabold uppercase tracking-tight">
              {t("myAccount")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("accountLoginDesc")}</p>
          </div>
          <form onSubmit={handleLogin} className="mt-6 space-y-3 border border-border p-5">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("fullName")} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="01XXXXXXXXX"
              />
            </div>
            {loginError && <p className="text-sm text-destructive">{loginError}</p>}
            <Button type="submit" size="lg" disabled={loginBusy} className="w-full text-sm font-bold uppercase tracking-wider">
              {loginBusy ? t("loading") : t("login")}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-16">
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold uppercase tracking-tight md:text-3xl">
              {t("myAccount")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {customer.name} • {customer.phone}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="size-4" /> {t("logout")}
          </Button>
        </div>

        {/* Profile */}
        <form onSubmit={handleSaveProfile} className="mt-6 space-y-3 border border-border p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("defaultAddress")}
          </h2>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("fullName")} *
            </label>
            <input
              type="text"
              required
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("address")}
            </label>
            <textarea
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              className={cn(inputClass, "h-20 py-3")}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("district")}
            </label>
            <input
              type="text"
              value={profile.district}
              onChange={(e) => setProfile({ ...profile, district: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("deliveryArea")}
            </label>
            <div className="flex gap-2">
              {(["inside_dhaka", "outside_dhaka"] as const).map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => setProfile({ ...profile, area_type: area })}
                  className={cn(
                    "flex-1 border py-3 text-sm font-medium uppercase transition-colors",
                    profile.area_type === area
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground/70 hover:border-primary"
                  )}
                >
                  {area === "inside_dhaka" ? t("insideDhaka") : t("outsideDhaka")}
                </button>
              ))}
            </div>
          </div>
          {saved && <p className="text-sm font-medium text-primary">{t("accountSaved")}</p>}
          <Button type="submit" className="text-sm font-bold uppercase tracking-wider">
            {t("save")}
          </Button>
        </form>

        {/* Orders */}
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-extrabold uppercase tracking-tight">{t("myOrders")}</h2>
          {ordersLoading ? (
            <p className="py-8 text-center text-sm uppercase text-muted-foreground">{t("loading")}</p>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center border border-dashed border-border py-10">
              <Package className="size-10 text-muted-foreground" strokeWidth={1} />
              <p className="mt-3 text-sm text-muted-foreground">{t("noAccountOrders")}</p>
              <Button className="mt-4" onClick={() => navigate("/shop")}>
                <ShoppingBag className="size-4" /> {t("shopNow")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {reorderMsg && (
                <p className="border border-border p-3 text-sm text-muted-foreground">{reorderMsg}</p>
              )}
              {orders.map((order) => (
                <div key={order.id} className="border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-extrabold text-primary">{order.order_number}</p>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()} •{" "}
                        {formatPrice(order.total, locale)}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusColors[order.status]}>
                      {statusLabel(order.status)}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 border-t border-border pt-3">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-foreground/80">
                          {item.product_name} {item.size && `(${item.size})`} x{item.quantity}
                        </span>
                        <span className="font-bold">{formatPrice(item.price * item.quantity, locale)}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 text-xs font-bold uppercase tracking-wider"
                    onClick={() => handleReorder(order)}
                  >
                    <ShoppingBag className="size-3.5" /> {t("reorder")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
