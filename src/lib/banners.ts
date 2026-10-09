import { supabase, type HomepageBanner } from "@/lib/supabase"
import { cached, invalidateCache } from "@/lib/cache"
import { throwOwnerError } from "@/lib/owner-errors"
import type { OwnerCredentials } from "@/lib/shop"

const LOCAL_KEY = "ucp-banners"

export type Announcement = {
  text: string
  text_bn: string
  enabled: boolean
}

function readLocal(): HomepageBanner[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as HomepageBanner[]) : null
  } catch {
    return null
  }
}

function writeLocal(banners: HomepageBanner[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(banners))
}

const bySort = (a: HomepageBanner, b: HomepageBanner) => a.sort_order - b.sort_order

/** Active banners for the storefront. Empty = show the default hero. */
export async function fetchActiveBanners(): Promise<HomepageBanner[]> {
  return cached("banners:active", async () => {
    try {
      const { data, error } = await supabase
        .from("homepage_banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
      if (error) throw error
      return (data ?? []) as HomepageBanner[]
    } catch {
      return (readLocal() ?? []).filter((b) => b.is_active).sort(bySort)
    }
  })
}

export async function fetchAllBannersForOwner(): Promise<HomepageBanner[]> {
  const { data, error } = await supabase.from("homepage_banners").select("*").order("sort_order", { ascending: true })
  if (error) throwOwnerError(error, "banners_load_failed")
  return (data ?? []) as HomepageBanner[]
}

export async function saveBanner(
  creds: OwnerCredentials,
  banner: Partial<HomepageBanner> & { id?: string }
): Promise<void> {
  const payload = {
    id: banner.id ?? null,
    title: (banner.title ?? "").slice(0, 200),
    title_bn: (banner.title_bn ?? "").slice(0, 200),
    subtitle: (banner.subtitle ?? "").slice(0, 500),
    subtitle_bn: (banner.subtitle_bn ?? "").slice(0, 500),
    image_url: (banner.image_url ?? "").slice(0, 2000),
    link_url: banner.link_url?.trim() ? banner.link_url.trim().slice(0, 2000) : null,
    sort_order: Number.isFinite(banner.sort_order) ? banner.sort_order! : 0,
    is_active: banner.is_active ?? true,
  }
  const { error } = await supabase.rpc("admin_save_banner", { p_phone: creds.phone, p_pin: creds.pin, p_banner: payload })
  if (error) throwOwnerError(error, "save_failed")
  invalidateCache("banners:")
}

export async function deleteBanner(creds: OwnerCredentials, bannerId: string): Promise<void> {
  if (bannerId.startsWith("local-")) {
    writeLocal((readLocal() ?? []).filter((b) => b.id !== bannerId))
    invalidateCache("banners:")
    return
  }
  const { error } = await supabase.rpc("admin_delete_banner", { p_phone: creds.phone, p_pin: creds.pin, p_banner_id: bannerId })
  if (error) throwOwnerError(error, "delete_failed")
  invalidateCache("banners:")
}

/** Full announcement row for the owner form, including disabled/empty states.
 *  The shared settings object never carries these columns, so the admin UI
 *  must read them here — never from OwnerAuth settings. */
export async function fetchAnnouncementForOwner(): Promise<Announcement> {
  const { data, error } = await supabase.from("shop_settings")
    .select("announcement_text, announcement_text_bn, announcement_enabled").limit(1).maybeSingle()
  if (error || !data) throw new Error("announcement_load_failed")
  return { text: data.announcement_text ?? "", text_bn: data.announcement_text_bn ?? "", enabled: data.announcement_enabled ?? false }
}

/** Announcement bar content. Separate best-effort query so older DBs without
 *  the new columns keep working (the main settings fetch never selects them). */
export async function fetchAnnouncement(): Promise<Announcement | null> {
  return cached("announcement", async () => {
    try {
      const { data, error } = await supabase
        .from("shop_settings")
        .select("announcement_text, announcement_text_bn, announcement_enabled")
        .limit(1)
        .maybeSingle()
      if (error || !data) return null
      const row = data as unknown as {
        announcement_text: string
        announcement_text_bn: string
        announcement_enabled: boolean
      }
      if (!row.announcement_enabled) return null
      if (!row.announcement_text && !row.announcement_text_bn) return null
      return { text: row.announcement_text, text_bn: row.announcement_text_bn, enabled: true }
    } catch {
      return null
    }
  })
}
