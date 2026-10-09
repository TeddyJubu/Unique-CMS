import { useI18n } from "@/lib/i18n"
import { navigate } from "@/lib/router"
import type { Category, ShopSettings } from "@/lib/supabase"
import { Phone, MessageCircle, Send, Camera } from "lucide-react"

export function SiteFooter({
  categories,
  settings,
}: {
  categories: Category[]
  settings: ShopSettings | null
}) {
  const { locale, t } = useI18n()

  const shopName = locale === "bn" && settings?.shop_name_bn
    ? settings.shop_name_bn
    : settings?.shop_name || "Unique Collection by Princess"

  const quickLinks = [
    { label: t("home"), path: "/" },
    { label: t("shop"), path: "/shop" },
    { label: t("trackOrder"), path: "/track-order" },
    ...categories.slice(0, 3).map((c) => ({
      label: locale === "bn" && c.name_bn ? c.name_bn : c.name,
      path: `/category?id=${c.id}`,
    })),
  ]

  return (
    <footer className="border-t border-border bg-background">
      {/* Newsletter */}
      <div className="border-b border-border px-4 py-12 md:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h3 className="text-2xl font-extrabold uppercase tracking-tight text-foreground md:text-3xl">
            {t("newsletterTitle")}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("newsletterDesc")}
          </p>
          <form
            className="mx-auto mt-6 flex max-w-md gap-2"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder={t("emailPlaceholder")}
              className="h-12 flex-1 border-b-2 border-border bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="h-12 bg-primary px-6 text-sm font-bold uppercase text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("subscribe")}
            </button>
          </form>
        </div>
      </div>

      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-foreground">
              {shopName}
            </h4>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("poweredBy")}
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("quickLinks")}
            </h5>
            <ul className="mt-3 space-y-2">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <button
                    className="text-sm text-foreground/70 transition-colors hover:text-primary"
                    onClick={() => navigate(link.path)}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("contactUs")}
            </h5>
            <ul className="mt-3 space-y-3">
              {settings?.whatsapp_number && (
                <li>
                  <a
                    href={`https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-primary"
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </a>
                </li>
              )}
              {settings?.whatsapp_number && (
                <li>
                  <a
                    href={`tel:${settings.whatsapp_number}`}
                    className="flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-primary"
                  >
                    <Phone className="size-4" />
                    {settings.whatsapp_number}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("followUs")}
            </h5>
            <div className="mt-3 flex gap-3">
              <a
                href="#"
                className="text-foreground/70 transition-colors hover:text-primary"
                aria-label="Facebook"
              >
                <Send className="size-5" />
              </a>
              <a
                href="#"
                className="text-foreground/70 transition-colors hover:text-primary"
                aria-label="Instagram"
              >
                <Camera className="size-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center">
          <a href="#/owner" className="mb-3 inline-flex min-h-11 items-center text-sm font-medium text-foreground/80 underline underline-offset-4 hover:text-primary">{t("manageShop")}</a>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {shopName}. {t("allRights")}
          </p>
        </div>
      </div>
    </footer>
  )
}
