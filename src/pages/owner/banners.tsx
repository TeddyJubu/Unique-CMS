import { useEffect, useRef, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { useOwnerAuth } from "@/lib/owner-auth"
import { CmsLayout } from "@/components/site/cms-layout"
import { fetchAllBannersForOwner, saveBanner, deleteBanner, fetchAnnouncementForOwner } from "@/lib/banners"
import { updateShopSettings } from "@/lib/shop"
import { invalidateCache } from "@/lib/cache"
import type { HomepageBanner } from "@/lib/supabase"
import { Image as ImageIcon, Edit, Trash2, Plus, ArrowUp, ArrowDown, Megaphone } from "lucide-react"
import { cn } from "@/lib/utils"

const emptyForm = {
  title: "",
  title_bn: "",
  subtitle: "",
  subtitle_bn: "",
  image_url: "",
  link_url: "",
  sort_order: "0",
  is_active: true,
}

export function OwnerBannersPage() {
  const { t, locale } = useI18n()
  const { credentials } = useOwnerAuth()
  const [banners, setBanners] = useState<HomepageBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const [ann, setAnn] = useState({ text: "", text_bn: "", enabled: false })
  const [annLoaded, setAnnLoaded] = useState(false)
  const [annSaving, setAnnSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setBanners(await fetchAllBannersForOwner())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Only the latest fetch may write the form: StrictMode double-mounts (and
  // slow networks reorder), and a stale response must not clobber user input.
  const annReq = useRef(0)
  useEffect(() => {
    load()
    const id = ++annReq.current
    fetchAnnouncementForOwner()
      .then((a) => {
        if (id === annReq.current) setAnn({ text: a.text, text_bn: a.text_bn, enabled: a.enabled })
      })
      .catch(() => {})
      .finally(() => {
        if (id === annReq.current) setAnnLoaded(true)
      })
  }, [])

  const openNew = () => {
    setEditingId(null)
    setForm({ ...emptyForm, sort_order: String(banners.length) })
    setFormOpen(true)
  }

  const openEdit = (b: HomepageBanner) => {
    setEditingId(b.id)
    setForm({
      title: b.title,
      title_bn: b.title_bn,
      subtitle: b.subtitle,
      subtitle_bn: b.subtitle_bn,
      image_url: b.image_url,
      link_url: b.link_url ?? "",
      sort_order: String(b.sort_order),
      is_active: b.is_active,
    })
    setFormOpen(true)
    window.scrollTo(0, 0)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!credentials) return
    setSaving(true)
    try {
      await saveBanner(credentials, {
        id: editingId ?? undefined,
        title: form.title,
        title_bn: form.title_bn,
        subtitle: form.subtitle,
        subtitle_bn: form.subtitle_bn,
        image_url: form.image_url,
        link_url: form.link_url || null,
        sort_order: parseInt(form.sort_order) || 0,
        is_active: form.is_active,
      })
      setFormOpen(false)
      setNotice(t("bannerSaved"))
      setTimeout(() => setNotice(null), 2500)
      load()
    } catch (err) {
      console.error(err)
      alert(t("error"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!credentials || !confirm(t("areYouSure"))) return
    try {
      await deleteBanner(credentials, id)
      setNotice(t("bannerDeleted"))
      setTimeout(() => setNotice(null), 2500)
      load()
    } catch (e) {
      console.error(e)
      alert(t("error"))
    }
  }

  const move = async (banner: HomepageBanner, dir: -1 | 1) => {
    if (!credentials) return
    const sorted = [...banners].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex((b) => b.id === banner.id)
    const other = sorted[idx + dir]
    if (!other) return
    try {
      await saveBanner(credentials, { ...banner, sort_order: other.sort_order })
      await saveBanner(credentials, { ...other, sort_order: banner.sort_order })
      load()
    } catch (e) {
      console.error(e)
      alert(t("error"))
    }
  }

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!credentials) return
    setAnnSaving(true)
    try {
      await updateShopSettings(credentials, {
        announcement_text: ann.text,
        announcement_text_bn: ann.text_bn,
        announcement_enabled: ann.enabled,
      })
      invalidateCache("announcement")
      setNotice(t("settingsSaved"))
      setTimeout(() => setNotice(null), 2500)
    } catch (err) {
      console.error(err)
      alert(t("error"))
    } finally {
      setAnnSaving(false)
    }
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"

  return (
    <CmsLayout title={t("manageBanners")}>
      {notice && (
        <div className="mb-4 rounded-xl bg-green-50 p-4 text-center text-sm font-medium text-green-700">
          {notice}
        </div>
      )}

      {/* Announcement */}
      <form onSubmit={handleSaveAnnouncement} className="mb-6 space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Megaphone className="size-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t("announcementBar")}</h3>
            <p className="text-xs text-muted-foreground">{t("announcementHelp")}</p>
          </div>
        </div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            disabled={!annLoaded}
            checked={ann.enabled}
            onChange={(e) => setAnn({ ...ann, enabled: e.target.checked })}
            className="size-5 rounded accent-primary disabled:opacity-50"
          />
          <span className="text-sm font-medium">{t("announcementEnabled")}</span>
        </label>
        <div>
          <label className="mb-1.5 block text-sm font-medium">{t("announcementBar")} (EN)</label>
          <input
            type="text"
            disabled={!annLoaded}
            value={ann.text}
            onChange={(e) => setAnn({ ...ann, text: e.target.value })}
            className={inputClass}
            placeholder={locale === "bn" ? "যেমন: ২৫০০ টাকার উপরে ফ্রি ডেলিভারি" : "e.g. Free delivery on orders over Tk 2,500"}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">{t("announcementBar")} (বাংলা)</label>
          <input
            type="text"
            disabled={!annLoaded}
            value={ann.text_bn}
            onChange={(e) => setAnn({ ...ann, text_bn: e.target.value })}
            className={inputClass}
          />
        </div>
        <Button type="submit" disabled={annSaving || !annLoaded} className="rounded-xl">
          {annSaving ? t("saving") : t("save")}
        </Button>
      </form>

      {/* Banner list */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {banners.length} {t("manageBanners").toLowerCase()}
        </p>
        <Button className="rounded-xl" onClick={openNew}>
          <Plus className="size-4" /> {t("addBanner")}
        </Button>
      </div>

      {formOpen && (
        <form onSubmit={handleSave} className="mb-6 space-y-4 rounded-xl border border-primary/40 bg-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {editingId ? t("editBanner") : t("addBanner")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("bannerTitle")} (EN)</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("bannerTitle")} (বাংলা)</label>
              <input
                type="text"
                value={form.title_bn}
                onChange={(e) => setForm({ ...form, title_bn: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("bannerSubtitle")} (EN)</label>
              <input
                type="text"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("bannerSubtitle")} (বাংলা)</label>
              <input
                type="text"
                value={form.subtitle_bn}
                onChange={(e) => setForm({ ...form, subtitle_bn: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("bannerImage")}</label>
            <input
              type="text"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              className={inputClass}
              placeholder="https://... or /kids-hero.webp"
            />
            {form.image_url && (
              <img src={form.image_url} alt="" className="mt-2 h-28 w-full rounded-lg border border-border object-cover" />
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("bannerLink")}</label>
            <input
              type="text"
              value={form.link_url}
              onChange={(e) => setForm({ ...form, link_url: e.target.value })}
              className={inputClass}
              placeholder="/shop"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">{t("bannerLinkHelp")}</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="size-5 rounded accent-primary"
              />
              {t("bannerActive")}
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="flex-1 rounded-xl">
              {saving ? t("saving") : t("save")}
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setFormOpen(false)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-muted-foreground">{t("loading")}</span>
        </div>
      ) : banners.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-12">
          <ImageIcon className="size-10 text-muted-foreground" strokeWidth={1} />
          <p className="mt-3 px-6 text-center text-sm text-muted-foreground">{t("noBanners")}</p>
          <Button className="mt-4 rounded-xl" onClick={openNew}>
            <Plus className="size-4" /> {t("addBanner")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {[...banners]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {b.image_url ? (
                    <img src={b.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="size-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {locale === "bn" && b.title_bn ? b.title_bn : b.title || "—"}
                  </p>
                  <p className={cn("text-xs", b.is_active ? "text-primary" : "text-muted-foreground")}>
                    {b.is_active ? t("bannerActive") : t("unapprove")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="rounded-lg" aria-label="Move up" onClick={() => move(b, -1)}>
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-lg" aria-label="Move down" onClick={() => move(b, 1)}>
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-lg" aria-label={t("edit")} onClick={() => openEdit(b)}>
                    <Edit className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg text-destructive hover:text-destructive"
                    aria-label={t("delete")}
                    onClick={() => handleDelete(b.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}
    </CmsLayout>
  )
}
