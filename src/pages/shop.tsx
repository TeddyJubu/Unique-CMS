import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { useRouter, navigate } from "@/lib/router"
import { ProductGrid } from "@/components/site/product-card"
import { Button } from "@/components/ui/button"
import { fetchProducts } from "@/lib/shop"
import type { Product } from "@/lib/supabase"
import { SlidersHorizontal, X } from "lucide-react"

const ALL_SIZES = ["2Y", "4Y", "6Y", "8Y", "10Y", "12Y"]
const ALL_COLORS = ["Coral", "Pink", "Blue", "Mint", "Yellow", "Green", "Teal", "White", "Navy", "Gold"]

export function ShopPage() {
  const { route } = useRouter()
  const { t } = useI18n()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"newest" | "price_low" | "price_high">("newest")

  const searchQuery = route.params.search || ""

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await fetchProducts({
          search: searchQuery || undefined,
          sizes: selectedSizes.length > 0 ? selectedSizes : undefined,
          colors: selectedColors.length > 0 ? selectedColors : undefined,
          sort: sortBy,
        })
        setProducts(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [searchQuery, selectedSizes, selectedColors, sortBy])

  const toggleSize = (s: string) => {
    setSelectedSizes((prev) => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  const toggleColor = (c: string) => {
    setSelectedColors((prev) => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }
  const clearFilters = () => {
    setSelectedSizes([])
    setSelectedColors([])
  }

  return (
    <div className="pt-16">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold uppercase tracking-tight md:text-3xl">
            {searchQuery ? `"${searchQuery}"` : t("shop")}
          </h1>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="h-9 border border-border bg-background px-3 text-xs uppercase text-foreground focus:border-primary focus:outline-none"
            >
              <option value="newest">{t("newest")}</option>
              <option value="price_low">{t("priceLowHigh")}</option>
              <option value="price_high">{t("priceHighLow")}</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden"
            >
              <SlidersHorizontal className="size-4" /> {t("filterBy")}
            </Button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Filters sidebar */}
          <aside className={`${showFilters ? "block" : "hidden"} w-full md:block md:w-56 md:shrink-0`}>
            <div className="space-y-6 border border-border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider">{t("filterBy")}</h3>
                {(selectedSizes.length > 0 || selectedColors.length > 0) && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-primary hover:underline"
                  >
                    {t("clear")}
                  </button>
                )}
              </div>

              <div>
                <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">{t("size")}</h4>
                <div className="flex flex-wrap gap-2">
                  {ALL_SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleSize(s)}
                      className={`border px-3 py-1 text-xs uppercase transition-colors ${
                        selectedSizes.includes(s)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-foreground/70 hover:border-primary"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">{t("color")}</h4>
                <div className="flex flex-wrap gap-2">
                  {ALL_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleColor(c)}
                      className={`border px-3 py-1 text-xs uppercase transition-colors ${
                        selectedColors.includes(c)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-foreground/70 hover:border-primary"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {showFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full md:hidden"
                  onClick={() => setShowFilters(false)}
                >
                  {t("clear")} <X className="size-4" />
                </Button>
              )}
            </div>
          </aside>

          {/* Products */}
          <div className="flex-1">
            <p className="mb-4 text-xs uppercase text-muted-foreground">
              {products.length} {t("results")}
            </p>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <span className="text-sm uppercase text-muted-foreground">{t("loading")}</span>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-sm uppercase text-muted-foreground">{t("noProducts")}</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate("/shop")}>
                  {t("continueShopping")}
                </Button>
              </div>
            ) : (
              <ProductGrid products={products} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function CategoryPage() {
  const { route } = useRouter()
  const { t, locale } = useI18n()
  const categoryId = route.params.id
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryName, setCategoryName] = useState("")

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await fetchProducts({ categoryId })
        setProducts(data)
        if (data.length > 0 && data[0].category) {
          const cat = data[0].category
          setCategoryName(locale === "bn" && cat.name_bn ? cat.name_bn : cat.name)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    if (categoryId) load()
  }, [categoryId, locale])

  return (
    <div className="pt-16">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <h1 className="mb-6 text-2xl font-extrabold uppercase tracking-tight md:text-3xl">
          {categoryName || t("categories")}
        </h1>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-sm uppercase text-muted-foreground">{t("loading")}</span>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm uppercase text-muted-foreground">{t("noProductsInCategory")}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/shop")}>
              {t("continueShopping")}
            </Button>
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </div>
  )
}
