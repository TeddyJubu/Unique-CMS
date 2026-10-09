import { useState } from "react"
import { useI18n } from "@/lib/i18n"
import { useOwnerAuth } from "@/lib/owner-auth"
import { Button } from "@/components/ui/button"
import { navigate } from "@/lib/router"
import { Lock, Phone, ArrowLeft, Store } from "lucide-react"
import { OwnerError } from "@/components/site/owner-feedback"

export function OwnerLoginPage() {
  const { t, locale, setLocale } = useI18n()
  const { login, settings } = useOwnerAuth()
  const [phone, setPhone] = useState("")
  const [pin, setPin] = useState("")
  const [error, setError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (await login(phone.trim(), pin)) {
        setError(null)
        navigate("/owner/dashboard")
      } else {
        setError(t("loginError"))
      }
    } catch {
      setError(t("loginConnectionError"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="cms-light flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <button
        className="mb-8 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="size-4" /> {t("backToShop")}
      </button>
      <button onClick={() => setLocale(locale === "en" ? "bn" : "en")} aria-label="Switch language" className="mb-4 min-h-11 rounded-lg px-3 text-sm text-primary">{locale === "en" ? "বাংলা" : "English"}</button>

      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <Store className="size-7 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
            {settings?.shop_name || t("ownerPanel")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("loginHelp")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="owner-phone" className="mb-2 block text-sm font-medium text-foreground/80">
              {t("ownerPhone")}
            </label>
            <div className="flex items-center gap-2.5 rounded-xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
              <Phone className="size-5 text-muted-foreground" />
              <input
                id="owner-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-14 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                placeholder="+8801700000000"
              />
            </div>
          </div>

          <div>
            <label htmlFor="owner-pin" className="mb-2 block text-sm font-medium text-foreground/80">
              {t("ownerPin")}
            </label>
            <div className="flex items-center gap-2.5 rounded-xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
              <Lock className="size-5 text-muted-foreground" />
              <input
                id="owner-pin"
                type="password"
                required
                maxLength={32}
                value={pin}
                onChange={(e) => { setPin(e.target.value); setError(null) }}
                className="h-14 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                placeholder="••••••"
              />
            </div>
          </div>

          <OwnerError message={error} />

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="h-14 w-full rounded-xl text-base font-semibold"
          >
            {t("login")}
          </Button>
        </form>
      </div>
    </div>
  )
}
