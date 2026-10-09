import { useCallback, useEffect, useRef, useState } from "react"
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function ImageLightbox({
  images,
  index,
  alt,
  onClose,
  onIndexChange,
}: {
  images: string[]
  index: number
  alt: string
  onClose: () => void
  onIndexChange: (index: number) => void
}) {
  const { t } = useI18n()
  const [zoom, setZoom] = useState(1)
  const [origin, setOrigin] = useState("50% 50%")
  const closeRef = useRef<HTMLButtonElement>(null)
  const total = images.length

  const go = useCallback(
    (dir: 1 | -1) => {
      if (total === 0) return
      onIndexChange((index + dir + total) % total)
      setZoom(1)
    },
    [index, total, onIndexChange]
  )

  useEffect(() => {
    closeRef.current?.focus()
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") go(1)
      if (e.key === "ArrowLeft") go(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKey)
    }
  }, [go, onClose])

  useEffect(() => setZoom(1), [index])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setOrigin(`${x.toFixed(1)}% ${y.toFixed(1)}%`)
  }

  if (total === 0) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[60] flex flex-col bg-black/95"
      onClick={onClose}
    >
      <div className="flex items-center justify-between bg-black px-4 py-3 text-white">
        <span className="text-xs font-medium uppercase tracking-wider text-white/70">
          {index + 1} / {total}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))
            }}
            disabled={zoom <= 1}
            aria-label={t("zoomOut")}
            className="flex size-10 items-center justify-center text-white/80 transition-colors hover:text-white disabled:opacity-40"
          >
            <ZoomOut className="size-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setZoom((z) => Math.min(3, +(z + 0.5).toFixed(1)))
            }}
            disabled={zoom >= 3}
            aria-label={t("zoomIn")}
            className="flex size-10 items-center justify-center text-white/80 transition-colors hover:text-white disabled:opacity-40"
          >
            <ZoomIn className="size-5" />
          </button>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label={t("closeViewer")}
            className="flex size-10 items-center justify-center text-white/80 transition-colors hover:text-white"
          >
            <X className="size-6" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-12 md:px-20",
          zoom > 1 ? "cursor-zoom-out" : "cursor-zoom-in"
        )}
        onClick={(e) => {
          e.stopPropagation()
          setZoom((z) => (z > 1 ? 1 : 2))
        }}
        onMouseMove={handleMouseMove}
      >
        <img
          src={images[index]}
          alt={alt}
          draggable={false}
          style={{ transform: `scale(${zoom})`, transformOrigin: origin }}
          className="max-h-full max-w-full object-contain transition-transform duration-150"
        />

        {total > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                go(-1)
              }}
              aria-label={t("prevImage")}
              className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center bg-white/10 text-white transition-colors hover:bg-white/20 md:left-4"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                go(1)
              }}
              aria-label={t("nextImage")}
              className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center bg-white/10 text-white transition-colors hover:bg-white/20 md:right-4"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>

      {total > 1 && (
        <div
          className="flex justify-center gap-2 overflow-x-auto px-4 pb-5 pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              onClick={() => {
                onIndexChange(i)
                setZoom(1)
              }}
              aria-label={`${t("nextImage")} ${i + 1}`}
              className={cn(
                "size-14 shrink-0 overflow-hidden border-2",
                i === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
