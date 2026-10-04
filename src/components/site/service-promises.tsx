import { useI18n } from "@/lib/i18n"
import { Truck, ShieldCheck, RotateCcw, Banknote } from "lucide-react"

export function ServicePromises() {
  const { t } = useI18n()

  const promises = [
    { icon: Banknote, title: t("codAvailable"), desc: t("codDesc") },
    { icon: ShieldCheck, title: t("bkashPayment"), desc: t("bkashDesc") },
    { icon: Truck, title: t("nationwideDelivery"), desc: t("nationwideDesc") },
    { icon: RotateCcw, title: t("easyReturns"), desc: t("returnsDesc") },
  ]

  return (
    <section className="border-y border-border bg-background py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
          {promises.map((p, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center md:border-r md:border-border md:last:border-r-0"
            >
              <p.icon className="size-8 text-primary" strokeWidth={1.5} />
              <h3 className="mt-3 text-xs font-bold uppercase tracking-wider text-foreground md:text-sm">
                {p.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
