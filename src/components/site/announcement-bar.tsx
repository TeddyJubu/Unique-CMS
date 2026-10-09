import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { fetchAnnouncement } from "@/lib/banners"

const DISMISS_KEY = "ucp-ann-dismissed"

export function AnnouncementBar({ onVisibility }: { onVisibility: (visible: boolean) => void }) {
  const { locale, t } = useI18n()
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) {
      onVisibility(false)
      return
    }
    fetchAnnouncement()
      .then((a) => {
        if (!a) {
          onVisibility(false)
          return
        }
        const label = locale === "bn" && a.text_bn ? a.text_bn : a.text
        if (!label) {
          onVisibility(false)
          return
        }
        setText(label)
        onVisibility(true)
      })
      .catch(() => onVisibility(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  if (!text) return null

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex h-9 items-center justify-center bg-primary px-10 text-primary-foreground">
      <p className="truncate text-xs font-semibold uppercase tracking-wider">{text}</p>
      <button
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, "1")
          setText(null)
          onVisibility(false)
        }}
        aria-label={t("dismissAnnouncement")}
        className="absolute right-2 flex size-7 items-center justify-center opacity-80 transition-opacity hover:opacity-100"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
