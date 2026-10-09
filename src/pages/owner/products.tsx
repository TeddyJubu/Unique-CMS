import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { navigate } from "@/lib/router"
import {
  fetchProducts, fetchCategories, deleteProduct, formatPrice,
  getProductImageUrl, fetchProduct, createProduct, updateProduct
} from "@/lib/shop"
import type { Product, Category } from "@/lib/supabase"
import { useOwnerAuth } from "@/lib/owner-auth"
import { CmsLayout } from "@/components/site/cms-layout"
import { Tag, Edit, Trash2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { variantKey } from "@/lib/variants"

export function OwnerProductsPage() {
  const { t, locale } = useI18n()
  const { credentials } = useOwnerAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([fetchProducts(), fetchCategories()])
      setProducts(p)
      setCategories(c)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm(t("areYouSure"))) return
    try {
      if (!credentials) return
      await deleteProduct(credentials, id)
      load()
    } catch (e) {
      console.error(e)
    }
  }

  const categoryName = (catId: string | null) => {
    if (!catId) return "-"
    const cat = categories.find((c) => c.id === catId)
    return cat ? (locale === "bn" && cat.name_bn ? cat.name_bn : cat.name) : "-"
  }

  return (
    <CmsLayout title={t("myProducts")}>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{products.length} {t("items").toLowerCase()}</p>
        <Button className="rounded-xl" onClick={() => navigate("/owner/products/new")}>
          <Plus className="size-4" /> {t("addProduct")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-muted-foreground">{t("loading")}</span>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-12">
          <Tag className="size-10 text-muted-foreground" strokeWidth={1} />
          <p className="mt-3 text-sm text-muted-foreground">{t("noProducts")}</p>
          <Button className="mt-4 rounded-xl" onClick={() => navigate("/owner/products/new")}>
            <Plus className="size-4" /> {t("addProduct")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {products.map((product) => {
            const imageUrl = getProductImageUrl(product)
            const name = locale === "bn" && product.name_bn ? product.name_bn : product.name
            return (
              <div key={product.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Tag className="size-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {categoryName(product.category_id)} | {t("stock")}: {product.stock}
                  </p>
                  <p className="text-sm font-bold text-primary">{formatPrice(product.price, locale)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => navigate(`/owner/products/edit?id=${product.id}`)}>
                    <Edit className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-lg text-destructive hover:text-destructive" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </CmsLayout>
  )
}

const ALL_SIZES = ["2Y", "4Y", "6Y", "8Y", "10Y", "12Y"]
const ALL_COLORS = ["Coral", "Pink", "Blue", "Mint", "Yellow", "Green", "Teal", "White", "Navy", "Gold"]

export function OwnerProductFormPage() {
  const { t, locale } = useI18n()
  const { credentials } = useOwnerAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    category_id: "",
    name: "",
    name_bn: "",
    description: "",
    description_bn: "",
    price: "",
    compare_price: "",
    stock: "10",
    is_featured: false,
  })
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [imageUrls, setImageUrls] = useState("")
  const [trackVariants, setTrackVariants] = useState(false)
  const [variantQty, setVariantQty] = useState<Record<string, string>>({})

  const editId = new URLSearchParams(window.location.hash.split("?")[1] || "").get("id")
  const isEdit = !!editId

  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error)
    if (isEdit && editId) {
      fetchProduct(editId).then((p) => {
        if (!p) return
        setForm({
          category_id: p.category_id || "",
          name: p.name,
          name_bn: p.name_bn || "",
          description: p.description || "",
          description_bn: p.description_bn || "",
          price: String(p.price),
          compare_price: p.compare_price ? String(p.compare_price) : "",
          stock: String(p.stock),
          is_featured: p.is_featured,
        })
        setSelectedSizes(p.sizes)
        setSelectedColors(p.colors)
        setImageUrls(p.product_images?.map((img) => img.image_url).join("\n") || "")
        if (p.variant_stock && Object.keys(p.variant_stock).length > 0) {
          setTrackVariants(true)
          const qty: Record<string, string> = {}
          for (const [k, v] of Object.entries(p.variant_stock)) qty[k] = String(v)
          setVariantQty(qty)
        }
      })
    }
  }, [editId, isEdit])

  const toggleSize = (s: string) => {
    setSelectedSizes((prev) => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  const toggleColor = (c: string) => {
    setSelectedColors((prev) => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  const dimsSelected = selectedSizes.length > 0 || selectedColors.length > 0
  const matrixRows = selectedSizes.length > 0 ? selectedSizes : [""]
  const matrixCols = selectedColors.length > 0 ? selectedColors : [""]
  const variantTotal = trackVariants
    ? matrixRows.reduce(
        (sum, s) => sum + matrixCols.reduce(
          (inner, c) => inner + (parseInt(variantQty[variantKey(s, c)] ?? "") || 0), 0),
        0)
    : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.price) return
    setLoading(true)
    try {
      const useVariants = trackVariants && dimsSelected
      const stockRecord: Record<string, number> = {}
      if (useVariants) {
        for (const s of matrixRows) {
          for (const c of matrixCols) {
            stockRecord[variantKey(s, c)] = Math.max(0, parseInt(variantQty[variantKey(s, c)] ?? "") || 0)
          }
        }
      }
      const productData = {
        category_id: form.category_id || null,
        name: form.name,
        name_bn: form.name_bn || null,
        description: form.description || null,
        description_bn: form.description_bn || null,
        price: parseFloat(form.price),
        compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
        sizes: selectedSizes,
        colors: selectedColors,
        stock: useVariants
          ? Object.values(stockRecord).reduce((a, b) => a + b, 0)
          : parseInt(form.stock) || 0,
        variant_stock: stockRecord,
        is_featured: form.is_featured,
      }
      const urls = imageUrls.split("\n").filter((u) => u.trim())

      if (!credentials) return
      if (isEdit && editId) {
        await updateProduct(credentials, editId, productData, urls)
      } else {
        await createProduct(credentials, productData, urls)
      }
      setSaved(true)
      setTimeout(() => navigate("/owner/products"), 1500)
    } catch (err) {
      console.error(err)
      alert(t("error"))
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"

  return (
    <CmsLayout title={isEdit ? t("edit") : t("addProduct")}>
      {saved && (
        <div className="mb-4 rounded-xl bg-green-50 p-4 text-center text-sm font-medium text-green-700">
          {t("productSaved")}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground">{t("productName")}</h3>

          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("productName")} (EN) *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              placeholder="e.g. Pink party frock"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("productName")} (বাংলা)</label>
            <input
              type="text"
              value={form.name_bn}
              onChange={(e) => setForm({ ...form, name_bn: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("productPrice")} *</label>
              <input
                type="number"
                required
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("comparePrice")}</label>
              <input
                type="number"
                min="0"
                value={form.compare_price}
                onChange={(e) => setForm({ ...form, compare_price: e.target.value })}
                className={inputClass}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("selectCategory")}</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className={inputClass}
              >
                <option value="">--</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === "bn" && c.name_bn ? c.name_bn : c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("stockQuantity")}</label>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Sizes */}
        <div className="rounded-xl border border-border bg-card p-5">
          <label className="mb-3 block text-sm font-semibold text-muted-foreground">
            {t("availableSizes")}
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSize(s)}
                className={cn(
                  "min-w-11 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  selectedSizes.includes(s)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground/70 hover:border-primary"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div className="rounded-xl border border-border bg-card p-5">
          <label className="mb-3 block text-sm font-semibold text-muted-foreground">
            {t("availableColors")}
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleColor(c)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  selectedColors.includes(c)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground/70 hover:border-primary"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Per-variant stock */}
        <div className="rounded-xl border border-border bg-card p-5">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={trackVariants}
              onChange={(e) => setTrackVariants(e.target.checked)}
              className="size-5 rounded accent-primary"
            />
            <span className="text-sm font-medium">{t("trackVariantStock")}</span>
          </label>
          <p className="mt-1.5 text-xs text-muted-foreground">{t("trackVariantStockHelp")}</p>

          {trackVariants && (
            <div className="mt-4">
              {!dimsSelected ? (
                <p className="text-sm text-muted-foreground">{t("selectCombination")}</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="border border-border bg-muted px-2 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                            {t("size")} / {t("color")}
                          </th>
                          {matrixCols.map((c) => (
                            <th key={c || "-"} className="border border-border bg-muted px-2 py-2 text-xs font-semibold uppercase text-muted-foreground">
                              {c || "—"}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {matrixRows.map((s) => (
                          <tr key={s || "-"}>
                            <th className="border border-border bg-muted/50 px-2 py-1.5 text-left text-xs font-semibold uppercase">
                              {s || "—"}
                            </th>
                            {matrixCols.map((c) => (
                              <td key={c || "-"} className="border border-border p-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100000"
                                  value={variantQty[variantKey(s, c)] ?? ""}
                                  onChange={(e) =>
                                    setVariantQty({ ...variantQty, [variantKey(s, c)]: e.target.value })
                                  }
                                  placeholder="0"
                                  aria-label={`${s || "—"} / ${c || "—"}`}
                                  className="h-10 w-full min-w-16 rounded-lg border border-input bg-background px-2 text-center text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-sm font-semibold">
                    {t("totalStock")}: <span className="text-primary">{variantTotal}</span>
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Images */}
        <div className="rounded-xl border border-border bg-card p-5">
          <label className="mb-2 block text-sm font-semibold text-muted-foreground">
            {t("imageUrls")}
          </label>
          <textarea
            value={imageUrls}
            onChange={(e) => setImageUrls(e.target.value)}
            className={cn(inputClass, "h-24 py-3")}
            placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {locale === "bn" ? "প্রতি লাইনে একটি ছবির লিংক দিন" : "One image URL per line"}
          </p>
        </div>

        {/* Description */}
        <div className="rounded-xl border border-border bg-card p-5">
          <label className="mb-2 block text-sm font-semibold text-muted-foreground">
            {t("productDescription")}
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={cn(inputClass, "h-20 py-3")}
          />
          <label className="mb-2 mt-4 block text-sm font-semibold text-muted-foreground">
            {t("productDescription")} (বাংলা)
          </label>
          <textarea
            value={form.description_bn}
            onChange={(e) => setForm({ ...form, description_bn: e.target.value })}
            className={cn(inputClass, "h-20 py-3")}
          />
        </div>

        {/* Featured */}
        <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-5">
          <input
            type="checkbox"
            id="featured"
            checked={form.is_featured}
            onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
            className="size-5 rounded accent-primary"
          />
          <span className="text-sm font-medium">{t("featured")}</span>
        </label>

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="h-14 w-full rounded-xl text-base font-semibold"
        >
          {loading ? t("saving") : t("save")}
        </Button>
      </form>
    </CmsLayout>
  )
}
