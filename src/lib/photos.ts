import { supabase } from "@/lib/supabase"
import type { OwnerCredentials } from "@/lib/shop"

export async function preparePhoto(file: File): Promise<Blob> {
  if (file.size > 20 * 1024 * 1024) throw new Error("photo_too_large")
  if (!/^image\/(jpeg|png|webp|avif|gif|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|avif|gif|heic|heif)$/i.test(file.name)) {
    throw new Error("photo_format")
  }
  let source: Blob = file
  if (/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) {
    try {
      const { default: convert } = await import("heic2any")
      const converted = await convert({ blob: file, toType: "image/jpeg", quality: 0.85 })
      source = Array.isArray(converted) ? converted[0] : converted
    } catch { throw new Error("photo_format") }
  }
  const url = URL.createObjectURL(source)
  try {
    const image = new Image()
    image.src = url
    try { await image.decode() } catch { throw new Error("photo_format") }
    const ratio = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
    const context = canvas.getContext("2d")
    if (!context) throw new Error("photo_format")
    context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("photo_format")), "image/jpeg", 0.85))
  } finally { URL.revokeObjectURL(url) }
}

export async function uploadPhoto(credentials: OwnerCredentials, file: File): Promise<string> {
  const photo = await preparePhoto(file)
  const { data, error } = await supabase.functions.invoke("owner-photo-upload", {
    body: { ...credentials, contentType: photo.type, size: photo.size },
  })
  if (error || data?.error) {
    const context = (error as { context?: Response } | null)?.context
    if (context?.status === 401 || data?.error === "unauthorized") throw new Error("owner_session")
    throw new Error("photo_upload")
  }
  if (!data?.path || !data?.token || !data?.publicUrl) throw new Error("photo_upload")
  const { error: uploadError } = await supabase.storage.from("shop-photos").uploadToSignedUrl(data.path, data.token, photo, { contentType: "image/jpeg", cacheControl: "31536000" })
  if (uploadError) throw new Error("photo_upload")
  return data.publicUrl
}
