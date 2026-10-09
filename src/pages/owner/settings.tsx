import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { useOwnerAuth } from "@/lib/owner-auth"
import { Button } from "@/components/ui/button"
import { updateShopSettings } from "@/lib/shop"
import { CmsLayout } from "@/components/site/cms-layout"
import { Save, Check, Bot } from "lucide-react"

export function OwnerSettingsPage() {
  const { t, locale } = useI18n()
  const { settings, credentials, refreshSettings } = useOwnerAuth()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    shop_name: settings?.shop_name || "",
    shop_name_bn: settings?.shop_name_bn || "",
    whatsapp_number: settings?.whatsapp_number || "",
    bkash_number: settings?.bkash_number || "",
    delivery_inside_dhaka: String(settings?.delivery_inside_dhaka ?? 60),
    delivery_outside_dhaka: String(settings?.delivery_outside_dhaka ?? 120),
    hero_title: settings?.hero_title || "",
    hero_title_bn: settings?.hero_title_bn || "",
    hero_subtitle: settings?.hero_subtitle || "",
    hero_subtitle_bn: settings?.hero_subtitle_bn || "",
    owner_pin: "",
    ai_api_url: settings?.ai_api_url || "",
    ai_api_key: "",
    ai_model: settings?.ai_model || "",
  })
  const [synced, setSynced] = useState(false)

  // Settings load async; without this a fresh reload shows an empty form and
  // saving would blank every field in the database. Sync once on arrival.
  useEffect(() => {
    if (settings && !synced) {
      setForm({
        shop_name: settings.shop_name || "",
        shop_name_bn: settings.shop_name_bn || "",
        whatsapp_number: settings.whatsapp_number || "",
        bkash_number: settings.bkash_number || "",
        delivery_inside_dhaka: String(settings.delivery_inside_dhaka ?? 60),
        delivery_outside_dhaka: String(settings.delivery_outside_dhaka ?? 120),
        hero_title: settings.hero_title || "",
        hero_title_bn: settings.hero_title_bn || "",
        hero_subtitle: settings.hero_subtitle || "",
        hero_subtitle_bn: settings.hero_subtitle_bn || "",
        owner_pin: "",
        ai_api_url: settings.ai_api_url || "",
        ai_api_key: "",
        ai_model: settings.ai_model || "",
      })
      setSynced(true)
    }
  }, [settings, synced])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings || !credentials) return
    setSaving(true)
    try {
      const updates: Record<string, string | number> = {
        shop_name: form.shop_name,
        shop_name_bn: form.shop_name_bn,
        whatsapp_number: form.whatsapp_number,
        bkash_number: form.bkash_number,
        delivery_inside_dhaka: parseFloat(form.delivery_inside_dhaka) || 60,
        delivery_outside_dhaka: parseFloat(form.delivery_outside_dhaka) || 120,
        hero_title: form.hero_title,
        hero_title_bn: form.hero_title_bn,
        hero_subtitle: form.hero_subtitle,
        hero_subtitle_bn: form.hero_subtitle_bn,
      }
      if (form.owner_pin.trim()) {
        if (form.owner_pin.trim().length < 6) {
          alert(locale === "bn" ? "পিন অন্তত ৬ অক্ষরের হতে হবে" : "PIN must be at least 6 characters")
          setSaving(false)
          return
        }
        updates.owner_pin = form.owner_pin.trim()
      }
      if (form.ai_api_url.trim()) updates.ai_api_url = form.ai_api_url.trim()
      else if (form.ai_api_url === "") updates.ai_api_url = ""
      if (form.ai_api_key.trim()) updates.ai_api_key = form.ai_api_key.trim()
      if (form.ai_model.trim()) updates.ai_model = form.ai_model.trim()
      else if (form.ai_model === "") updates.ai_model = ""
      await updateShopSettings(credentials, updates)
      await refreshSettings()
      setSaved(true)
      setForm((prev) => ({ ...prev, owner_pin: "", ai_api_key: "" }))
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
      alert(t("error"))
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"

  return (
    <CmsLayout title={t("shopSettings")}>
      {saved && (
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
          <Check className="size-4" /> {t("settingsSaved")}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Shop info */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground">{t("shopSettings")}</h3>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("shopSettings")} (EN)</label>
            <input
              type="text"
              value={form.shop_name}
              onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("shopSettings")} (বাংলা)</label>
            <input
              type="text"
              value={form.shop_name_bn}
              onChange={(e) => setForm({ ...form, shop_name_bn: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground">{t("contactUs")}</h3>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("whatsappNumber")}</label>
            <input
              type="text"
              value={form.whatsapp_number}
              onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
              className={inputClass}
              placeholder="+8801700000000"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("bkashNumberSetting")}</label>
            <input
              type="text"
              value={form.bkash_number}
              onChange={(e) => setForm({ ...form, bkash_number: e.target.value })}
              className={inputClass}
              placeholder="01XXXXXXXXX"
            />
          </div>
        </div>

        {/* Delivery */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground">{t("deliveryCharge")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("deliveryInside")}</label>
              <input
                type="number"
                min="0"
                value={form.delivery_inside_dhaka}
                onChange={(e) => setForm({ ...form, delivery_inside_dhaka: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("deliveryOutside")}</label>
              <input
                type="number"
                min="0"
                value={form.delivery_outside_dhaka}
                onChange={(e) => setForm({ ...form, delivery_outside_dhaka: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Homepage */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {locale === "bn" ? "হোমপেজ" : "Homepage"}
          </h3>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("heroTitleSetting")} (EN)</label>
            <input
              type="text"
              value={form.hero_title}
              onChange={(e) => setForm({ ...form, hero_title: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("heroTitleSetting")} (বাংলা)</label>
            <input
              type="text"
              value={form.hero_title_bn}
              onChange={(e) => setForm({ ...form, hero_title_bn: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("heroSubtitleSetting")} (EN)</label>
            <input
              type="text"
              value={form.hero_subtitle}
              onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("heroSubtitleSetting")} (বাংলা)</label>
            <input
              type="text"
              value={form.hero_subtitle_bn}
              onChange={(e) => setForm({ ...form, hero_subtitle_bn: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        {/* Security */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground">{t("changePin")}</h3>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("newPin")}</label>
            <input
              type="password"
              maxLength={32}
              minLength={6}
              value={form.owner_pin}
              onChange={(e) => setForm({ ...form, owner_pin: e.target.value })}
              className={inputClass}
              placeholder="••••••"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {locale === "bn"
                ? "কমপক্ষে ৬ অক্ষর। খালি রাখলে পিন পরিবর্তন হবে না"
                : "At least 6 characters. Leave blank to keep current PIN"}
            </p>
          </div>
        </div>

        {/* AI Assistant */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="size-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">
                {locale === "bn" ? "এআই সহকারী" : "AI Assistant"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {locale === "bn"
                  ? "আপনার OpenAI-compatible API সংযুক্ত করুন সহকারী চালু করতে"
                  : "Connect your OpenAI-compatible API to power the assistant"}
              </p>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {locale === "bn" ? "API URL" : "API URL"}
            </label>
            <input
              type="url"
              value={form.ai_api_url}
              onChange={(e) => setForm({ ...form, ai_api_url: e.target.value })}
              className={inputClass}
              placeholder="https://api.openai.com/v1"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {locale === "bn"
                ? "OpenAI-compatible endpoint (নিডিন /chat/completions ছাড়া)"
                : "Your OpenAI-compatible endpoint (without /chat/completions)"}
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {locale === "bn" ? "API Key" : "API Key"}
            </label>
            <input
              type="password"
              value={form.ai_api_key}
              onChange={(e) => setForm({ ...form, ai_api_key: e.target.value })}
              className={inputClass}
              placeholder={locale === "bn" ? "••••••••••••" : "sk-..."}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {locale === "bn"
                ? "কী সেভ করা হলে নিরাপদে সার্ভারে থাকবে। খালি রাখলে পুরনো কী বহাল থাকবে।"
                : "Key is stored securely on the server. Leave blank to keep the existing key."}
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {locale === "bn" ? "মডেল" : "Model"}
            </label>
            <input
              type="text"
              value={form.ai_model}
              onChange={(e) => setForm({ ...form, ai_model: e.target.value })}
              className={inputClass}
              placeholder="gpt-4o-mini"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {locale === "bn"
                ? "যেকোনো OpenAI-compatible মডেল নাম"
                : "Any OpenAI-compatible model name"}
            </p>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={saving || !settings}
          className="h-14 w-full rounded-xl text-base font-semibold"
        >
          {saving ? t("saving") : <><Save className="size-5" /> {t("saveSettings")}</>}
        </Button>
      </form>
    </CmsLayout>
  )
}
