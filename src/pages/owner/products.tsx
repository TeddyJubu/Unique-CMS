import { useEffect, useRef, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { navigate, useRouter } from "@/lib/router"
import { fetchOwnerProducts, fetchOwnerCategories, deleteProduct, formatPrice, getProductImageUrl, fetchOwnerProduct, createProduct, updateProduct } from "@/lib/shop"
import type { Product, Category } from "@/lib/supabase"
import { useOwnerAuth } from "@/lib/owner-auth"
import { CmsLayout } from "@/components/site/cms-layout"
import { PhotoPicker } from "@/components/site/photo-picker"
import { OwnerError, OwnerConfirmation } from "@/components/site/owner-feedback"
import { ownerErrorMessage } from "@/lib/owner-errors"
import { Tag, Edit, Trash2, Plus, LoaderCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { variantKey } from "@/lib/variants"

export function OwnerProductsPage() {
  const { t, locale } = useI18n()
  const { credentials } = useOwnerAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Product | null>(null)
  const load = async () => {
    setLoading(true); setError(null)
    try { setProducts(await fetchOwnerProducts()) }
    catch (err) { setError(ownerErrorMessage(err, t("productLoadError"), t("ownerSessionError"))) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  return <CmsLayout title={t("myProducts")}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{!loading && !error && <>{products.length} {t("items").toLowerCase()}</>}</p>
      <Button className="rounded-xl" onClick={() => navigate("/owner/products/new")}><Plus className="size-4" />{t("addProduct")}</Button>
    </div>
    <OwnerError message={error} retry={() => void load()} />
    {loading ? <p role="status" className="py-12 text-center text-sm">{t("loading")}</p> : !error && products.length === 0 ? <div className="rounded-xl border border-border bg-card p-8 text-center">
      <Tag className="mx-auto size-10 text-muted-foreground" /><p className="mt-3 text-sm">{t("noProducts")}</p>
      <Button className="mt-4 rounded-xl" onClick={() => navigate("/owner/products/new")}>{t("addProduct")}</Button>
    </div> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {products.map((product) => {
        const photo = getProductImageUrl(product)
        const name = locale === "bn" && product.name_bn ? product.name_bn : product.name
        return <div key={product.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">{photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <Tag className="m-5 size-6" />}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{name}</p><p className="text-xs text-muted-foreground">{locale === "bn" && product.category?.name_bn ? product.category.name_bn : product.category?.name} · {t("stock")}: {product.stock}</p><p className="text-sm font-bold text-primary">{formatPrice(product.price, locale)}</p></div>
          <div className="flex flex-col gap-1">
            <Button variant="ghost" size="icon" aria-label={t("edit") + " " + name} onClick={() => navigate(`/owner/products/edit?id=${product.id}`)}><Edit className="size-4" /></Button>
            <Button variant="ghost" size="icon" aria-label={t("removeProduct") + " " + name} className="text-destructive" onClick={() => setRemoving(product)}><Trash2 className="size-4" /></Button>
          </div>
        </div>
      })}
    </div>}
    <OwnerConfirmation open={!!removing} onClose={() => setRemoving(null)} title={t("removeProductTitle", { name: removing?.name ?? "" })} description={t("removeProductHelp")} actionLabel={t("removeProduct")} destructive errorMessage={t("productDeleteError")} onConfirm={async () => {
      if (!credentials || !removing) throw new Error("owner_session")
      await deleteProduct(credentials, removing.id)
      setProducts((items) => items.filter((product) => product.id !== removing.id))
    }} />
  </CmsLayout>
}

const ALL_SIZES = ["2Y", "4Y", "6Y", "8Y", "10Y", "12Y"]
const ALL_COLORS = ["Coral", "Pink", "Blue", "Mint", "Yellow", "Green", "Teal", "White", "Navy", "Gold"]
const emptyForm = { category_id: "", name: "", name_bn: "", description: "", description_bn: "", price: "", compare_price: "", stock: "", is_featured: false }

export function OwnerProductFormPage() {
  const { t, locale } = useI18n()
  const { credentials } = useOwnerAuth()
  const { route } = useRouter()
  const editId = route.path === "/owner/products/edit" ? route.params.id : undefined
  const isEdit = route.path === "/owner/products/edit"
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [photos, setPhotos] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [trackVariants, setTrackVariants] = useState(false)
  const [variantQty, setVariantQty] = useState<Record<string, string>>({})
  const [contactPrice, setContactPrice] = useState(false)
  const loadRequest = useRef(0)
  const load = async () => {
    const request = ++loadRequest.current
    setLoading(true); setLoadError(null)
    if (!isEdit) { setForm(emptyForm); setPhotos([]); setSelectedSizes([]); setSelectedColors([]); setTrackVariants(false); setVariantQty({}); setContactPrice(false); setError(null); setPreview(false) }
    try {
      const availableCategories = await fetchOwnerCategories()
      if (request !== loadRequest.current) return
      setCategories(availableCategories)
      if (isEdit) {
        if (!editId) throw new Error("product_missing")
        const product = await fetchOwnerProduct(editId)
        if (request !== loadRequest.current) return
        setForm({ category_id: product.category_id || "", name: product.name, name_bn: product.name_bn || "", description: product.description || "", description_bn: product.description_bn || "", price: String(product.price), compare_price: product.compare_price ? String(product.compare_price) : "", stock: String(product.stock), is_featured: product.is_featured })
        setPhotos((product.product_images ?? []).sort((a, b) => a.sort_order - b.sort_order).map((photo) => photo.image_url))
        setSelectedSizes(product.sizes); setSelectedColors(product.colors)
        setContactPrice(product.price === 0)
        const quantities = product.variant_stock ?? {}
        setTrackVariants(Object.keys(quantities).length > 0)
        setVariantQty(Object.fromEntries(Object.entries(quantities).map(([key, value]) => [key, String(value)])))
      }
    } catch (err) { if (request !== loadRequest.current) return; setLoadError(ownerErrorMessage(err, t("productLoadError"), t("ownerSessionError"))) }
    finally { if (request === loadRequest.current) setLoading(false) }
  }
  useEffect(() => { void load(); return () => { loadRequest.current++ } }, [editId, isEdit])
  const rows = selectedSizes.length ? selectedSizes : [""]
  const cols = selectedColors.length ? selectedColors : [""]
  const dimsSelected = selectedSizes.length > 0 || selectedColors.length > 0
  const useVariants = trackVariants && dimsSelected
  const stockRecord = Object.fromEntries(rows.flatMap((size) => cols.map((color) => [variantKey(size, color), Number(variantQty[variantKey(size, color)] ?? "")])))
  const totalStock = useVariants ? Object.values(stockRecord).reduce((sum, qty) => sum + qty, 0) : Number(form.stock)
  const validQuantity = (value: string | undefined) => value !== undefined && value.trim() !== "" && Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 100000
  const validation = () => {
    if (!form.name.trim()) return t("productNameRequired")
    if (!photos.length) return t("productPhotoRequired")
    if (!contactPrice && (!Number.isFinite(Number(form.price)) || Number(form.price) <= 0)) return t("productPriceRequired")
    if (trackVariants && (!dimsSelected || rows.some((size) => cols.some((color) => !validQuantity(variantQty[variantKey(size, color)]))))) return t("variantQuantityRequired")
    if (!trackVariants && !validQuantity(form.stock)) return t("productQuantityRequired")
    return null
  }
  const publish = async () => {
    if (savingRef.current || photoBusy) return
    const problem = validation()
    if (problem) { setError(problem); return }
    if (!credentials) { setError(t("ownerSessionError")); return }
    savingRef.current = true; setSaving(true); setError(null)
    try {
      const product = { category_id: form.category_id || null, name: form.name.trim(), name_bn: form.name_bn.trim() || null, description: form.description.trim() || null, description_bn: form.description_bn.trim() || null, price: contactPrice ? 0 : Number(form.price), compare_price: form.compare_price ? Number(form.compare_price) : null, sizes: selectedSizes, colors: selectedColors, stock: totalStock, variant_stock: useVariants ? stockRecord : {}, is_featured: form.is_featured }
      if (isEdit && editId) await updateProduct(credentials, editId, product, photos)
      else await createProduct(credentials, product, photos)
      navigate("/owner/products")
    } catch (err) { setError(ownerErrorMessage(err, t("productSaveError"), t("ownerSessionError"))) }
    finally { savingRef.current = false; setSaving(false) }
  }
  const inputClass = "h-12 w-full rounded-xl border border-input bg-background px-4 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
  const textField = (key: "name" | "name_bn" | "description" | "description_bn" | "price" | "compare_price" | "stock", label: string, type = "text", required = false) => <div key={key}>
    <label htmlFor={"product-" + key} className="mb-1.5 block text-sm font-medium">{label}{required && " *"}</label>
    {key.startsWith("description") ? <textarea id={"product-" + key} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className={cn(inputClass, "h-24 py-3")} /> : <input id={"product-" + key} type={type} required={required} min={type === "number" ? key === "price" ? "0.01" : "0" : undefined} max={key === "stock" ? "100000" : undefined} step={type === "number" ? key === "stock" ? "1" : "0.01" : undefined} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className={inputClass} />}
    {key === "stock" && <p className="mt-1.5 text-xs text-muted-foreground">{t("quantityHelp")}</p>}
  </div>
  const choices = (options: string[], selected: string[], setSelected: (values: string[]) => void, label: string) => <fieldset className="mt-4"><legend className="mb-2 text-sm">{label}</legend><div className="flex flex-wrap gap-2">{options.map((option) => <button key={option} type="button" aria-pressed={selected.includes(option)} onClick={() => setSelected(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option])} className={cn("min-h-11 rounded-lg border px-3 py-2 text-sm", selected.includes(option) ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{option}</button>)}</div></fieldset>
  return <CmsLayout title={isEdit ? t("edit") + " " + t("product") : t("addProduct")}>
    <p className="mb-5 text-sm text-muted-foreground">{t("productFormHelp")}</p>
    <OwnerError message={loadError} retry={() => void load()} />
    {loading ? <p role="status">{t("loading")}</p> : !loadError && <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); const problem = validation(); setError(problem); if (!problem && !photoBusy) setPreview(true) }}>
      <fieldset disabled={saving} className="space-y-5">
        <PhotoPicker value={photos} onChange={setPhotos} onBusyChange={setPhotoBusy} />
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">{t("productBasics")}</h2>
          {textField("name", t("productName"), "text", true)}
          {textField("description", t("productDescription"))}
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={contactPrice} onChange={(event) => setContactPrice(event.target.checked)} className="size-5 accent-primary" />{t("contactForPrice")}</label>
          <div className="grid gap-4 sm:grid-cols-2">{!contactPrice && textField("price", t("productPrice"), "number", true)}{!trackVariants && textField("stock", t("stockQuantity"), "number", true)}</div>
          <div><label htmlFor="product-category" className="mb-1.5 block text-sm font-medium">{t("selectCategory")}</label><select id="product-category" value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} className={inputClass}><option value="">{t("noCategory")}</option>{categories.map((category) => <option key={category.id} value={category.id}>{locale === "bn" && category.name_bn ? category.name_bn : category.name}</option>)}</select></div>
        </section>
        <details className="rounded-xl border border-border bg-card p-5">
          <summary className="cursor-pointer text-sm font-semibold">{t("productOptions")}</summary>
          <p className="mt-3 text-xs text-muted-foreground">{t("productOptionsHelp")}</p>
          {choices(ALL_SIZES, selectedSizes, setSelectedSizes, t("availableSizes"))}
          {choices(ALL_COLORS, selectedColors, setSelectedColors, t("availableColors"))}
          <label className="mt-5 flex items-center gap-3 text-sm"><input type="checkbox" checked={trackVariants} onChange={(event) => setTrackVariants(event.target.checked)} className="size-5 accent-primary" />{t("trackVariantStock")}</label>
          <p className="mt-1.5 text-xs text-muted-foreground">{t("trackVariantStockHelp")}</p>
          {trackVariants && (dimsSelected ? <div className="mt-4 space-y-3">{rows.flatMap((size) => cols.map((color) => {
            const key = variantKey(size, color); const label = [size, color].filter(Boolean).join(" / ")
            return <div key={key} className="flex flex-wrap items-center gap-3"><label htmlFor={"variant-" + key} className="flex-1 text-sm">{label}</label><input id={"variant-" + key} type="number" min="0" max="100000" step="1" value={variantQty[key] ?? ""} onChange={(event) => setVariantQty({ ...variantQty, [key]: event.target.value })} className={cn(inputClass, "w-24")} /></div>
          }))}<p className="text-sm font-semibold">{t("totalStock")}: {Number.isFinite(totalStock) ? totalStock : 0}</p></div> : <p className="mt-3 text-sm">{t("selectCombination")}</p>)}
        </details>
        <details className="rounded-xl border border-border bg-card p-5">
          <summary className="cursor-pointer text-sm font-semibold">{t("extraProductDetails")}</summary>
          <div className="mt-4 space-y-4">{textField("compare_price", t("comparePrice"), "number")}{textField("name_bn", t("bengaliName"))}{textField("description_bn", t("bengaliDescription"))}</div>
        </details>
        <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 text-sm"><input type="checkbox" checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} className="size-5 accent-primary" />{t("featured")}</label>
      </fieldset>
      <OwnerError message={error} />
      <Button type="submit" disabled={photoBusy || saving} className="min-h-14 w-full rounded-xl text-base">{photoBusy ? t("uploadingPhotos") : t("reviewProduct")}</Button>
    </form>}
    <Dialog open={preview} onOpenChange={(open) => { if (!saving) setPreview(open) }}>
      <DialogContent className="cms-light max-h-[90svh] overflow-y-auto rounded-2xl" showCloseButton={!saving}>
        <DialogHeader><DialogTitle>{t("reviewProduct")}</DialogTitle><DialogDescription>{t("reviewProductHelp")}</DialogDescription></DialogHeader>
        <div className="overflow-hidden rounded-xl border border-border">
          {photos[0] && <img src={photos[0]} alt={form.name} className="max-h-60 w-full object-contain bg-muted" />}
          <div className="space-y-2 p-4"><h2 className="font-bold">{form.name}</h2><p className="text-lg font-bold text-primary">{formatPrice(contactPrice ? 0 : Number(form.price), locale)}</p><p className="text-sm">{t("stock")}: {totalStock}</p>{selectedSizes.length > 0 && <p className="text-sm">{t("availableSizes")}: {selectedSizes.join(", ")}</p>}{selectedColors.length > 0 && <p className="text-sm">{t("availableColors")}: {selectedColors.join(", ")}</p>}{useVariants && <ul className="text-sm">{rows.flatMap((size) => cols.map((color) => <li key={variantKey(size, color)}>{[size, color].filter(Boolean).join(" / ")}: {stockRecord[variantKey(size, color)]}</li>))}</ul>}<p className="whitespace-pre-wrap text-sm text-muted-foreground">{form.description}</p></div>
        </div>
        {photos.length > 1 && <div className="flex gap-2 overflow-x-auto">{photos.slice(1).map((photo, index) => <img key={index} src={photo} alt={t("productImages") + " " + (index + 2)} className="size-16 shrink-0 rounded-lg object-cover" />)}</div>}
        <OwnerError message={error} />
        <div className="flex flex-col gap-2 sm:flex-row"><Button variant="outline" disabled={saving} onClick={() => setPreview(false)} className="min-h-12 flex-1 rounded-xl">{t("continueEditing")}</Button><Button disabled={saving} onClick={() => void publish()} className="min-h-12 flex-1 rounded-xl">{saving && <LoaderCircle className="size-4 animate-spin" />}{saving ? t("saving") : isEdit ? t("saveProductChanges") : t("publishProduct")}</Button></div>
      </DialogContent>
    </Dialog>
  </CmsLayout>
}
