import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { navigate } from "@/lib/router"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { HomepageBanner } from "@/lib/supabase"

const AUTOPLAY_MS = 6000

export function HeroCarousel({ banners }: { banners: HomepageBanner[] }) {
  const { locale, t } = useI18n()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<number | null>(null)

  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i + dir + banners.length) % banners.length),
    [banners.length]
  )

  useEffect(() => {
    if (paused || banners.length < 2) return
    timer.current = window.setTimeout(() => go(1), AUTOPLAY_MS)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [index, paused, banners.length, go])

  if (banners.length === 0) return null
  const banner = banners[index]
  const title = locale === "bn" && banner.title_bn ? banner.title_bn : banner.title
  const subtitle = locale === "bn" && banner.subtitle_bn ? banner.subtitle_bn : banner.subtitle

  const cta = () => {
    const link = banner.link_url?.trim()
    if (!link) {
      navigate("/shop")
      return
    }
    if (link.startsWith("http")) window.open(link, "_blank", "noopener,noreferrer")
    else navigate(link)
  }

  return (
    <section
      className="relative min-h-[60vh] overflow-hidden md:min-h-[80vh]"
      aria-roledescription="carousel"
      aria-label={t("manageBanners")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {banners.map((b, i) => (
        <div
          key={b.id}
          aria-hidden={i !== index}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            i === index ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          {b.image_url ? (
            <img
              src={b.image_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
          ) : (
            <div className="absolute inset-0 bg-secondary" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/20" />
        </div>
      ))}

      <div className="relative flex min-h-[60vh] flex-col justify-end p-6 md:min-h-[80vh] md:p-16">
        <div className="max-w-2xl" key={banner.id}>
          {title && (
            <h1 className="text-4xl font-extrabold uppercase leading-none tracking-tight text-foreground md:text-7xl">
              {title}
            </h1>
          )}
          {subtitle && <p className="mt-4 text-sm text-foreground/70 md:text-lg">{subtitle}</p>}
          <div className="mt-6 flex gap-3">
            <Button
              size="lg"
              className="text-sm font-bold uppercase tracking-wider"
              onClick={cta}
            >
              {t("shopNow")} <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <div className="absolute bottom-5 right-5 flex gap-2 md:bottom-8 md:right-16">
            <button
              onClick={() => go(-1)}
              aria-label={t("prevImage")}
              className="flex size-10 items-center justify-center border border-border bg-background/80 text-foreground transition-colors hover:border-primary"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label={t("nextImage")}
              className="flex size-10 items-center justify-center border border-border bg-background/80 text-foreground transition-colors hover:border-primary"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
          <div className="absolute bottom-6 left-6 flex gap-2 md:bottom-9 md:left-16" role="tablist" aria-label={t("manageBanners")}>
            {banners.map((b, i) => (
              <button
                key={b.id}
                role="tab"
                aria-selected={i === index}
                aria-label={`${i + 1} / ${banners.length}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 transition-all",
                  i === index ? "w-8 bg-primary" : "w-4 bg-foreground/30 hover:bg-foreground/60"
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
