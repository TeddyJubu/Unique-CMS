import { useId, useRef, useState } from "react"
import { Camera, LoaderCircle, X, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"
import { useOwnerAuth } from "@/lib/owner-auth"
import { uploadPhoto } from "@/lib/photos"
import { OwnerError } from "@/components/site/owner-feedback"

export function PhotoPicker({ value, onChange, onBusyChange, max = 8, label, help }: {
  value: string[]; onChange: (photos: string[]) => void; onBusyChange?: (busy: boolean) => void; max?: number; label?: string; help?: string;
}) {
  const { t } = useI18n()
  const { credentials } = useOwnerAuth()
  const id = useId()
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState("")
  const selectPhotos = async (files: File[]) => {
    if (!files.length || busyRef.current || !credentials) return
    if (files.length + value.length > max) { setError(t("photoLimit").replace("{count}", String(max))); return }
    busyRef.current = true; setBusy(true); onBusyChange?.(true); setError(null)
    const photos = [...value]
    try {
      for (const file of Array.from(files)) { photos.push(await uploadPhoto(credentials, file)); onChange([...photos]) }
    } catch (err) {
      const code = err instanceof Error ? err.message : ""
      setError(t(code === "owner_session" ? "ownerSessionError" : code === "photo_too_large" ? "photoTooLarge" : code === "photo_format" ? "photoFormatError" : "photoUploadError"))
    } finally { busyRef.current = false; setBusy(false); onBusyChange?.(false) }
  }
  return <section className="rounded-xl border border-border bg-card p-5" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className="text-sm font-semibold">{label ?? t("productImages")}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{help ?? t("choosePhotosHelp")}</p>
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {value.map((photo, index) => <div key={`${photo}-${index}`} className="relative overflow-hidden rounded-xl border border-border bg-muted">
        <img src={photo} alt={`${label ?? t("productImages")} ${index + 1}`} className="aspect-square w-full object-cover" />
        <Button type="button" size="icon" variant="outline" disabled={busy} aria-label={`${t("removePhoto")} ${index + 1}`} onClick={() => onChange(value.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-lg bg-card"><X className="size-4" /></Button>
        <div className="p-2 text-xs">
          {index === 0 ? <p className="font-medium">{t("coverPhoto")}</p> : <button type="button" disabled={busy} className="flex min-h-8 items-center gap-1 text-primary underline" onClick={() => onChange([photo, ...value.filter((_, i) => i !== index)])}><ArrowLeft className="size-3" />{t("makeCoverPhoto")}</button>}
        </div>
      </div>)}
    </div>
    <label htmlFor={`${id}-files`} className={`mt-4 inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-primary px-4 py-3 text-sm font-medium text-primary focus-within:ring-2 focus-within:ring-ring ${busy || value.length >= max ? "pointer-events-none opacity-50" : ""}`}>
      {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Camera className="size-5" />}
      {busy ? t("uploadingPhotos") : t("choosePhotos")}
      <input id={`${id}-files`} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/heic,image/heif,.heic,.heif" multiple={max > 1} disabled={busy || value.length >= max} className="sr-only" onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void selectPhotos(files) }} />
    </label>
    <p role="status" className="mt-2 text-xs text-muted-foreground">{busy ? t("uploadingPhotosHelp") : t("photoPrivacyHelp")}</p>
    <div className="mt-3"><OwnerError message={error} /></div>
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-muted-foreground">{t("usePhotoLink")}</summary>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${id}-link`} className="sr-only">{t("photoLinkPlaceholder")}</label>
        <input id={`${id}-link`} type="url" value={link} disabled={busy} placeholder="https://..." onChange={(event) => setLink(event.target.value)} className="h-12 min-w-0 flex-1 rounded-xl border border-input bg-background px-3" />
        <Button type="button" variant="outline" disabled={busy || !link.trim() || value.length >= max} onClick={() => {
          try { const url = new URL(link.trim(), window.location.origin); if (!["https:", "http:"].includes(url.protocol)) throw new Error(); onChange([...value, url.href]); setLink(""); setError(null) }
          catch { setError(t("photoLinkError")) }
        }}>{t("addPhotoLink")}</Button>
      </div>
    </details>
  </section>
}
