function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement("meta")
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute("content", content)
}

export function setSeo(opts: {
  title: string
  description?: string
  image?: string | null
  type?: string
}) {
  document.title = opts.title
  if (opts.description) {
    setMeta("name", "description", opts.description)
    setMeta("property", "og:description", opts.description)
    setMeta("name", "twitter:description", opts.description)
  }
  setMeta("property", "og:title", opts.title)
  setMeta("name", "twitter:title", opts.title)
  setMeta("property", "og:type", opts.type ?? "website")
  if (opts.image) {
    setMeta("property", "og:image", opts.image)
    setMeta("name", "twitter:image", opts.image)
  }
}
