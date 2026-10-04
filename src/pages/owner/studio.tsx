import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import {
  createProduct,
  deleteProduct,
  fetchCategories,
  fetchProducts,
  formatPrice,
  getProductImageUrl,
} from "@/lib/shop"
import type { Category, Product } from "@/lib/supabase"
import { useOwnerAuth } from "@/lib/owner-auth"
import { CmsLayout } from "@/components/site/cms-layout"
import {
  Camera, Check, ImagePlus, LoaderCircle, Send, ShoppingBag, Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"

const sizes = ["2Y", "4Y", "6Y", "8Y", "10Y", "12Y"]
const colors = ["Coral", "Pink", "Blue", "Mint", "Yellow", "Green", "Teal", "White", "Navy", "Gold"]

export function OwnerStudioPage() {
  const { t, locale } = useI18n()
  const { credentials } = useOwnerAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [posts, setPosts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [form, setForm] = useState({
    name: "",
    caption: "",
    price: "",
    category_id: "",
    stock: "10",
    featured: true,
  })
  const [selectedSizes, setSelectedSizes] = useState<string[]>(["4Y", "6Y", "8Y"])
  const [selectedColors, setSelectedColors] = useState<string[]>(["Coral"])

  const loadPosts = async () => {
    setLoading(true)
    try {
      const [categoryData, productData] = await Promise.all([
        fetchCategories(),
        fetchProducts({ sort: "newest" }),
      ])
      setCategories(categoryData)
      setPosts(productData.slice(0, 12))
      if (!form.category_id && categoryData[0]) {
        setForm((current) => ({ ...current, category_id: categoryData[0].id }))
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPosts() }, [])

  const toggleValue = (value: string, selected: string[], setSelected: (values: string[]) => void) => {
    setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])
  }

  const publishPost = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) return

    setPublishing(true)
    try {
      if (!credentials) return
      await createProduct(
        credentials,
        {
          category_id: form.category_id || null,
          name: form.name.trim(),
          name_bn: null,
          description: form.caption.trim() || null,
          description_bn: null,
          price: form.price ? Number(form.price) : 0,
          compare_price: null,
          sizes: selectedSizes,
          colors: selectedColors,
          stock: Number(form.stock) || 0,
          is_featured: form.featured,
        },
        imageUrl.trim() ? [imageUrl.trim()] : [],
      )
      setPublished(true)
      setForm((current) => ({ ...current, name: "", caption: "", price: "", stock: "10" }))
      setImageUrl("")
      await loadPosts()
      window.setTimeout(() => setPublished(false), 3000)
    } catch (error) {
      console.error(error)
      alert(t("error"))
    } finally {
      setPublishing(false)
    }
  }

  const deletePost = async (productId: string) => {
    if (!window.confirm(t("areYouSure"))) return
    try {
      if (!credentials) return
      await deleteProduct(credentials, productId)
      setPosts((current) => current.filter((post) => post.id !== productId))
    } catch (error) {
      console.error(error)
    }
  }

  const inputClass = "h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"

  return (
    <CmsLayout title={t("newPost")}>
      <div className="space-y-5">
        {/* Photo */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Camera className="size-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t("addPhoto")}</p>
              <p className="text-xs text-muted-foreground">{t("photoLinkHelp")}</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-dashed border-border bg-muted">
            {imageUrl ? (
              <img src={imageUrl} alt={t("postPhotoAlt")} className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="flex aspect-[4/3] flex-col items-center justify-center text-center">
                <ImagePlus className="size-8 text-muted-foreground" strokeWidth={1.5} />
                <p className="mt-2 text-sm font-medium text-muted-foreground">{t("addPhoto")}</p>
              </div>
            )}
          </div>
          <input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder={t("photoLinkPlaceholder")}
            className={cn(inputClass, "mt-3")}
            type="url"
          />
        </div>

        {/* Title + Caption */}
        <div className="rounded-xl border border-border bg-card p-5">
          <label className="mb-1.5 block text-sm font-medium">{t("postTitle")} *</label>
          <input
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder={t("postTitlePlaceholder")}
            className={inputClass}
          />
          <label className="mb-1.5 mt-4 block text-sm font-medium">{t("postCaption")}</label>
          <textarea
            value={form.caption}
            onChange={(event) => setForm({ ...form, caption: event.target.value })}
            placeholder={t("postCaptionPlaceholder")}
            className={cn(inputClass, "h-24 resize-none py-3")}
          />
        </div>

        {/* Price + Stock + Category */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("postPrice")}</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
                placeholder={t("priceOnRequest")}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("stockQuantity")}</label>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(event) => setForm({ ...form, stock: event.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <label className="mb-1.5 mt-4 block text-sm font-medium">{t("selectCategory")}</label>
          <select
            value={form.category_id}
            onChange={(event) => setForm({ ...form, category_id: event.target.value })}
            className={inputClass}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {locale === "bn" && category.name_bn ? category.name_bn : category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sizes + Colors */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-3 text-sm font-semibold text-muted-foreground">{t("availableSizes")}</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => toggleValue(size, selectedSizes, setSelectedSizes)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  selectedSizes.includes(size) ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground/70 hover:border-primary",
                )}
              >
                {size}
              </button>
            ))}
          </div>
          <p className="mb-3 mt-5 text-sm font-semibold text-muted-foreground">{t("availableColors")}</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => toggleValue(color, selectedColors, setSelectedColors)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  selectedColors.includes(color) ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground/70 hover:border-primary",
                )}
              >
                {color}
              </button>
            ))}
          </div>
        </div>

        {/* Featured toggle */}
        <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-5">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(event) => setForm({ ...form, featured: event.target.checked })}
            className="size-5 rounded accent-primary"
          />
          <span className="text-sm font-medium">{t("showOnHome")}</span>
        </label>

        {published && (
          <div className="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
            <Check className="size-4" /> {t("postPublished")}
          </div>
        )}

        <Button
          type="button"
          onClick={publishPost}
          size="lg"
          disabled={publishing}
          className="h-14 w-full rounded-xl text-base font-semibold"
        >
          {publishing ? <><LoaderCircle className="size-5 animate-spin" /> {t("publishing")}</> : <><Send className="size-5" /> {t("publishPost")}</>}
        </Button>
      </div>

      {/* Recent posts */}
      <div className="mt-8">
        <p className="mb-3 text-sm font-semibold text-muted-foreground">{t("recentPosts")}</p>
        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-border py-10">
            <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {posts.slice(0, 6).map((post) => (
              <div key={post.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
                <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {getProductImageUrl(post) ? <img src={getProductImageUrl(post) ?? undefined} alt="" className="h-full w-full object-cover" /> : <ShoppingBag className="m-3 size-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{post.name}</p>
                  <p className="text-xs text-primary">{formatPrice(post.price, locale)}</p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => deletePost(post.id)} aria-label={t("delete")}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </CmsLayout>
  )
}
