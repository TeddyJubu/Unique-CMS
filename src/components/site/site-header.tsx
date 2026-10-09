import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Menu, ShoppingBag, Globe, Search, Heart, User } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { useCart } from "@/lib/cart"
import { useWishlist } from "@/lib/wishlist"
import { useCustomer } from "@/lib/customer-auth"
import { navigate } from "@/lib/router"
import { cn } from "@/lib/utils"
import type { Category, ShopSettings } from "@/lib/supabase"

export function SiteHeader({
  categories,
  settings,
  topOffset = 0,
}: {
  categories: Category[]
  settings: ShopSettings | null
  topOffset?: number
}) {
  const { locale, setLocale, t } = useI18n()
  const { itemCount } = useCart()
  const { count: wishCount } = useWishlist()
  const { customer } = useCustomer()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handler)
    return () => window.removeEventListener("scroll", handler)
  }, [])

  const shopName = locale === "bn" && settings?.shop_name_bn
    ? settings.shop_name_bn
    : settings?.shop_name || "Unique Collection by Princess"

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setMobileOpen(false)
    }
  }

  const navLinks = [
    { label: t("home"), path: "/" },
    { label: t("shop"), path: "/shop" },
    ...categories.slice(0, 4).map((c) => ({
      label: locale === "bn" && c.name_bn ? c.name_bn : c.name,
      path: `/category?id=${c.id}`,
    })),
  ]

  return (
    <>
      <header
        style={{ top: topOffset }}
        className={cn(
          "fixed left-0 right-0 z-40 border-b border-border transition-all",
          scrolled ? "bg-background/95 backdrop-blur-sm" : "bg-background"
        )}
      >
        <div className="mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          {/* Mobile menu */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={locale === "bn" ? "মেনু খুলুন" : "Open menu"}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>

          {/* Logo */}
          <button
            className="flex-1 text-center md:flex-none md:text-left"
            onClick={() => navigate("/")}
          >
            <span className="text-xs font-extrabold uppercase tracking-widest text-foreground md:text-sm">
              {shopName}
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <button
                key={link.path}
                className="text-xs font-medium uppercase tracking-wider text-foreground/70 transition-colors hover:text-primary"
                onClick={() => navigate(link.path)}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 md:gap-2">
            <a href="#/owner" className="hidden min-h-11 items-center rounded-lg px-2 text-xs font-medium text-foreground/80 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring xl:inline-flex">{t("manageShop")}</a>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label={t("search")}
            >
              <Search className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocale(locale === "en" ? "bn" : "en")}
              aria-label="Switch language"
            >
              <Globe className="size-5" />
              <span className="ml-1 text-[10px] font-bold uppercase">
                {locale === "en" ? "বাং" : "EN"}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/wishlist")}
              aria-label={locale === "bn" ? "উইশলিস্ট" : "Wishlist"}
              className="relative hidden sm:flex"
            >
              <Heart className="size-5" />
              {wishCount > 0 && (
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center bg-primary text-[10px] font-bold text-primary-foreground">
                  {wishCount}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/account")}
              aria-label={t("myAccount")}
              className="relative hidden sm:flex"
            >
              {customer ? (
                <span className="flex size-6 items-center justify-center bg-primary text-xs font-bold uppercase text-primary-foreground">
                  {customer.name.charAt(0)}
                </span>
              ) : (
                <User className="size-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/cart")}
              aria-label={t("cart")}
              className="relative"
            >
              <ShoppingBag className="size-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center bg-primary text-[10px] font-bold text-primary-foreground">
                  {itemCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="border-t border-border bg-background px-4 py-3 md:px-8">
            <form onSubmit={handleSearch} className="mx-auto flex max-w-2xl gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-10 flex-1 border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                autoFocus
              />
              <Button type="submit" size="lg">
                {t("search")}
              </Button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile nav */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-80 border-r border-border bg-background">
          <SheetHeader>
            <SheetTitle className="text-sm font-extrabold uppercase tracking-widest">
              {shopName}
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-4">
            {navLinks.map((link) => (
              <button
                key={link.path}
                className="border-b border-border py-3 text-left text-sm font-medium uppercase tracking-wider text-foreground/80 transition-colors hover:text-primary"
                onClick={() => {
                  navigate(link.path)
                  setMobileOpen(false)
                }}
              >
                {link.label}
              </button>
            ))}
            <button
              className="border-b border-border py-3 text-left text-sm font-medium uppercase tracking-wider text-foreground/80 transition-colors hover:text-primary"
              onClick={() => {
                navigate("/wishlist")
                setMobileOpen(false)
              }}
            >
              {locale === "bn" ? "উইশলিস্ট" : "Wishlist"}
            </button>
            <button
              className="border-b border-border py-3 text-left text-sm font-medium uppercase tracking-wider text-foreground/80 transition-colors hover:text-primary"
              onClick={() => {
                navigate("/track-order")
                setMobileOpen(false)
              }}
            >
              {t("trackOrder")}
            </button>
            <button
              className="border-b border-border py-3 text-left text-sm font-medium uppercase tracking-wider text-foreground/80 transition-colors hover:text-primary"
              onClick={() => {
                navigate("/account")
                setMobileOpen(false)
              }}
            >
              {t("myAccount")}
            </button>
            <button
              className="border-b border-border py-3 text-left text-sm font-medium uppercase tracking-wider text-foreground/80 transition-colors hover:text-primary"
              onClick={() => {
                navigate("/owner")
                setMobileOpen(false)
              }}
            >
              {t("manageShop")}
            </button>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
