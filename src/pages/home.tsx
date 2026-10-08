import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { navigate } from "@/lib/router"
import { Button } from "@/components/ui/button"
import { SectionHeading } from "@/components/site/section-heading"
import { ProductGrid } from "@/components/site/product-card"
import { ServicePromises } from "@/components/site/service-promises"
import { ArrowRight } from "lucide-react"
import { fetchProducts, fetchCategories, fetchShopSettings } from "@/lib/shop"
import { setSeo } from "@/lib/seo"
import type { Product, Category, ShopSettings } from "@/lib/supabase"

export function HomePage() {
  const { locale, t } = useI18n()
  const [featured, setFeatured] = useState<Product[]>([])
  const [newArrivals, setNewArrivals] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [latest, c, s] = await Promise.all([
          fetchProducts({ sort: "newest" }),
          fetchCategories(),
          fetchShopSettings(),
        ])
        setFeatured(latest.slice(0, 8))
        setNewArrivals(latest.slice(8, 16))
        setCategories(c)
        setSettings(s)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    setSeo({
      title: settings
        ? `${settings.shop_name} — Kids & Family Fashion`
        : "Unique Collection by Princess — Kids & Family Fashion",
      description: settings?.hero_subtitle ?? "Playful clothes for every little adventure",
      image: "/kids-hero.webp",
    })
  }, [settings])

  const heroTitle = locale === "bn" && settings?.hero_title_bn
    ? settings.hero_title_bn
    : settings?.hero_title || "New Season Drop"
  const heroSubtitle = locale === "bn" && settings?.hero_subtitle_bn
    ? settings.hero_subtitle_bn
    : settings?.hero_subtitle || "Premium clothing for every occasion"

  const heroImage = "/kids-hero.webp"

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative min-h-[60vh] overflow-hidden md:min-h-[80vh]">
        <img
          src={heroImage}
          alt="Unique Collection kids collection"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/20" />
        <div className="relative flex min-h-[60vh] flex-col justify-end p-6 md:min-h-[80vh] md:p-16">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-extrabold uppercase leading-none tracking-tight text-foreground md:text-7xl">
              {heroTitle}
            </h1>
            <p className="mt-4 text-sm text-foreground/70 md:text-lg">
              {heroSubtitle}
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                size="lg"
                className="text-sm font-bold uppercase tracking-wider"
                onClick={() => navigate("/shop")}
              >
                {t("shopNow")} <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-8 flex items-baseline justify-between">
            <SectionHeading serifWord="shop" monoWord={t("categories")} />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/category?id=${cat.id}`)}
                className="group relative aspect-square overflow-hidden border border-border bg-muted"
              >
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-secondary">
                    <span className="text-2xl font-extrabold uppercase text-muted-foreground">
                      {locale === "bn" && cat.name_bn ? cat.name_bn : cat.name}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 flex items-end justify-start bg-gradient-to-t from-background/80 to-transparent p-4">
                  <span className="text-sm font-bold uppercase tracking-wider text-foreground md:text-base">
                    {locale === "bn" && cat.name_bn ? cat.name_bn : cat.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      {!loading && featured.length > 0 && (
        <section className="py-12 md:py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="mb-8 flex items-baseline justify-between">
              <SectionHeading serifWord="latest" monoWord={t("latestUploads")} />
              <button
                className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-primary hover:underline"
                onClick={() => navigate("/shop")}
              >
                {t("viewAll")} <ArrowRight className="size-3" />
              </button>
            </div>
            <ProductGrid products={featured} />
          </div>
        </section>
      )}

      {/* Service Promises */}
      <ServicePromises />

      {/* New Arrivals */}
      {!loading && newArrivals.length > 0 && (
        <section className="py-12 md:py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="mb-8 flex items-baseline justify-between">
              <SectionHeading serifWord="new" monoWord={t("newArrivals")} />
              <button
                className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-primary hover:underline"
                onClick={() => navigate("/shop")}
              >
                {t("viewAll")} <ArrowRight className="size-3" />
              </button>
            </div>
            <ProductGrid products={newArrivals} />
          </div>
        </section>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <span className="text-sm uppercase text-muted-foreground">{t("loading")}</span>
        </div>
      )}
    </div>
  )
}
