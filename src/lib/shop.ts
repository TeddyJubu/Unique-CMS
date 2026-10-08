import { supabase, type Product, type Category, type Order, type ShopSettings } from "@/lib/supabase"
import { cached, invalidateCache } from "@/lib/cache"

export function formatPrice(amount: number, locale: "en" | "bn" = "en"): string {
  if (amount === 0) return locale === "bn" ? "মূল্য জানতে যোগাযোগ করুন" : "Price on request"
  const symbol = locale === "bn" ? "৳" : "Tk"
  return `${symbol} ${Math.round(amount).toLocaleString("en-US")}`
}

const demoCategories: Category[] = [
  { id: "demo-girls", name: "Girls", name_bn: "মেয়েদের পোশাক", slug: "girls", image_url: "/kids-girls-frock.webp", sort_order: 1, created_at: "" },
  { id: "demo-boys", name: "Boys", name_bn: "ছেলেদের পোশাক", slug: "boys", image_url: "/kids-boy-panjabi.webp", sort_order: 2, created_at: "" },
  { id: "demo-sets", name: "Matching Sets", name_bn: "ম্যাচিং সেট", slug: "matching-sets", image_url: "/kids-printed-set.webp", sort_order: 3, created_at: "" },
  { id: "demo-party", name: "Party Wear", name_bn: "পার্টি ওয়্যার", slug: "party-wear", image_url: "/kids-girls-lehenga.webp", sort_order: 4, created_at: "" },
  { id: "demo-eid", name: "Eid Collection", name_bn: "ঈদ কালেকশন", slug: "eid-collection", image_url: "/kids-eid-kurta.webp", sort_order: 5, created_at: "" },
  { id: "demo-everyday", name: "Everyday", name_bn: "প্রতিদিনের পোশাক", slug: "everyday", image_url: "/kids-denim-jacket.webp", sort_order: 6, created_at: "" },
]

const demoProductSpecs = [
  ["girls", "Coral Bloom Frock", "কোরাল ব্লুম ফ্রক", 1450, 1800, "/kids-girls-frock.webp", ["2Y", "4Y", "6Y", "8Y"], ["Coral", "Pink"]],
  ["girls", "Rainbow Day Dress", "রেইনবো ডে ড্রেস", 1250, 1500, "/kids-rainbow-dress.webp", ["2Y", "4Y", "6Y", "8Y"], ["Rainbow", "Yellow"]],
  ["girls", "Petal Party Frock", "পেটাল পার্টি ফ্রক", 1650, 2100, "/kids-girls-frock.webp", ["4Y", "6Y", "8Y", "10Y"], ["Pink", "White"]],
  ["girls", "Little Star Tunic", "লিটল স্টার টিউনিস", 950, null, "/kids-rainbow-dress.webp", ["2Y", "4Y", "6Y"], ["Blue", "Yellow"]],
  ["girls", "Cotton Candy Skirt Set", "কটন ক্যান্ডি স্কার্ট সেট", 1150, 1400, "/kids-printed-set.webp", ["4Y", "6Y", "8Y"], ["Pink", "Teal"]],
  ["girls", "Mango Summer Dress", "ম্যাঙ্গো সামার ড্রেস", 1050, null, "/kids-rainbow-dress.webp", ["2Y", "4Y", "6Y"], ["Yellow", "Green"]],
  ["boys", "Royal Blue Panjabi", "রয়্যাল ব্লু পাঞ্জাবি", 1550, 1900, "/kids-boy-panjabi.webp", ["2Y", "4Y", "6Y", "8Y", "10Y"], ["Blue"]],
  ["boys", "Mint Eid Kurta", "মিন্ট ঈদ কুর্তা", 1750, 2200, "/kids-eid-kurta.webp", ["4Y", "6Y", "8Y", "10Y"], ["Mint", "White"]],
  ["boys", "Little Gentleman Set", "লিটল জেন্টলম্যান সেট", 1350, 1650, "/kids-boy-panjabi.webp", ["2Y", "4Y", "6Y", "8Y"], ["Navy", "White"]],
  ["boys", "Denim Day Jacket", "ডেনিম ডে জ্যাকেট", 1850, null, "/kids-denim-jacket.webp", ["4Y", "6Y", "8Y", "10Y"], ["Blue"]],
  ["boys", "Sunny Cotton Shirt", "সানি কটন শার্ট", 850, 1100, "/kids-printed-set.webp", ["2Y", "4Y", "6Y"], ["Yellow", "White"]],
  ["boys", "Classic Cream Panjabi", "ক্লাসিক ক্রিম পাঞ্জাবি", 1450, 1750, "/kids-boy-panjabi.webp", ["6Y", "8Y", "10Y", "12Y"], ["Cream", "Brown"]],
  ["sets", "Color Pop Co-ord", "কালার পপ কো-অর্ড", 1200, 1500, "/kids-printed-set.webp", ["2Y", "4Y", "6Y", "8Y"], ["Teal", "Yellow"]],
  ["sets", "Mini Explorer Set", "মিনি এক্সপ্লোরার সেট", 1100, null, "/kids-denim-jacket.webp", ["4Y", "6Y", "8Y"], ["Blue", "Cream"]],
  ["sets", "Garden Play Set", "গার্ডেন প্লে সেট", 990, 1250, "/kids-printed-set.webp", ["2Y", "4Y", "6Y"], ["Green", "Pink"]],
  ["sets", "Ocean Breeze Set", "ওশান ব্রিজ সেট", 1350, 1600, "/kids-rainbow-dress.webp", ["4Y", "6Y", "8Y", "10Y"], ["Blue", "White"]],
  ["sets", "Tiny Trendsetter Set", "টিনি ট্রেন্ডসেটার সেট", 1450, null, "/kids-denim-jacket.webp", ["6Y", "8Y", "10Y"], ["Navy", "Beige"]],
  ["party", "Pink Gold Lehenga", "পিংক গোল্ড লেহেঙ্গা", 2850, 3400, "/kids-girls-lehenga.webp", ["4Y", "6Y", "8Y", "10Y"], ["Pink", "Gold"]],
  ["party", "Velvet Rose Frock", "ভেলভেট রোজ ফ্রক", 2200, 2700, "/kids-girls-frock.webp", ["4Y", "6Y", "8Y"], ["Red", "Rose"]],
  ["party", "Little Prince Sherwani", "লিটল প্রিন্স শেরওয়ানি", 3200, 3800, "/kids-eid-kurta.webp", ["6Y", "8Y", "10Y", "12Y"], ["Mint", "Gold"]],
  ["party", "Moonlight Party Set", "মুনলাইট পার্টি সেট", 2450, null, "/kids-girls-lehenga.webp", ["4Y", "6Y", "8Y"], ["Lavender", "Silver"]],
  ["party", "Butterfly Celebration Dress", "বাটারফ্লাই সেলিব্রেশন ড্রেস", 1950, 2350, "/kids-rainbow-dress.webp", ["2Y", "4Y", "6Y", "8Y"], ["Rainbow", "Pink"]],
  ["eid", "Mint Moon Eid Kurta", "মিন্ট মুন ঈদ কুর্তা", 1750, 2100, "/kids-eid-kurta.webp", ["2Y", "4Y", "6Y", "8Y"], ["Mint"]],
  ["eid", "Eid Joy Frock", "ঈদ জয় ফ্রক", 2100, 2550, "/kids-girls-lehenga.webp", ["4Y", "6Y", "8Y"], ["Pink", "Gold"]],
  ["eid", "Crescent Panjabi Set", "ক্রিসেন্ট পাঞ্জাবি সেট", 2250, 2700, "/kids-boy-panjabi.webp", ["4Y", "6Y", "8Y", "10Y"], ["Blue", "White"]],
  ["everyday", "Denim Doodle Jacket", "ডেনিম ডুডল জ্যাকেট", 1850, 2200, "/kids-denim-jacket.webp", ["4Y", "6Y", "8Y", "10Y"], ["Blue"]],
  ["everyday", "Soft Sun T-shirt", "সফট সান টি-শার্ট", 650, 800, "/kids-printed-set.webp", ["2Y", "4Y", "6Y", "8Y"], ["Yellow", "White"]],
  ["everyday", "Comfy Cloud Jogger Set", "কমফি ক্লাউড জগার সেট", 1050, null, "/kids-denim-jacket.webp", ["4Y", "6Y", "8Y", "10Y"], ["Grey", "Blue"]],
  ["everyday", "Playground Polo", "প্লেগ্রাউন্ড পোলো", 750, 900, "/kids-boy-panjabi.webp", ["2Y", "4Y", "6Y", "8Y"], ["Green", "White"]],
  ["everyday", "Cozy Weekend Dress", "কোজি উইকেন্ড ড্রেস", 950, 1150, "/kids-rainbow-dress.webp", ["2Y", "4Y", "6Y", "8Y"], ["Coral", "Yellow"]],
] as const

const demoProducts: Product[] = demoProductSpecs.map(([categorySlug, name, nameBn, price, comparePrice, image, sizes, colors], index) => {
  const category = demoCategories.find((item) => item.slug === ({ girls: "girls", boys: "boys", sets: "matching-sets", party: "party-wear", eid: "eid-collection", everyday: "everyday" } as Record<string, string>)[categorySlug]) ?? demoCategories[0]
  const id = `demo-kid-${index + 1}`
  return { id, category_id: category.id, name, name_bn: nameBn, description: `Comfortable, playful and made for little adventures.`, description_bn: `ছোট্ট অ্যাডভেঞ্চারের জন্য আরামদায়ক ও আনন্দময় পোশাক।`, price, compare_price: comparePrice, sizes: [...sizes], colors: [...colors], stock: 8 + (index % 18), is_featured: index < 10, is_active: true, sort_order: index + 1, created_at: "", updated_at: "", product_images: [{ id: `${id}-image`, product_id: id, image_url: image, sort_order: 0, created_at: "" }], category }
})

const sheetProductSpecs = [
  ["Most comfortable gharara collection", "Gharara", 0, "/kids-girls-lehenga.webp"],
  ["Most demanding Kabli set", "Kabli outfit", 0, "/kids-boy-panjabi.webp"],
  ["New trendy frock", "Frock", 0, "/kids-girls-frock.webp"],
  ["Noyontara gharara", "Gharara", 0, "/kids-girls-lehenga.webp"],
  ["Comfort + style collection", "Children's outfit collection", 0, "/kids-printed-set.webp"],
  ["Most-demanded Kabli set", "Kabli outfit", 0, "/kids-boy-panjabi.webp"],
  ["Pakistani-inspired Kabli", "Kabli outfit", 0, "/kids-eid-kurta.webp"],
  ["New frock", "Frock", 1000, "/kids-girls-frock.webp"],
  ["Barbie frock", "Frock", 0, "/kids-rainbow-dress.webp"],
  ["Western dress", "Western dress", 0, "/kids-rainbow-dress.webp"],
  ["Pakistani-inspired outfit (two colors)", "Children's outfit", 0, "/kids-printed-set.webp"],
  ["Premium party-dress collection", "Party dress collection", 0, "/kids-girls-lehenga.webp"],
  ["80s Queen", "Frock / dress", 0, "/kids-girls-frock.webp"],
  ["Premium lehenga collection", "Lehenga", 0, "/kids-girls-lehenga.webp"],
  ["Best-selling Afghan gharara", "Gharara", 0, "/kids-girls-lehenga.webp"],
  ["Cherry Kabli", "Kabli outfit", 0, "/kids-boy-panjabi.webp"],
  ["Budget gown / frock", "Gown / frock", 0, "/kids-girls-frock.webp"],
  ["Cute Kabli set", "Kabli outfit", 0, "/kids-boy-panjabi.webp"],
  ["Noyontara gharara", "Gharara", 0, "/kids-girls-lehenga.webp"],
  ["Jimichu Kabli", "Kabli outfit", 0, "/kids-eid-kurta.webp"],
  ["Gharara featured in review post", "Gharara", 0, "/kids-girls-lehenga.webp"],
  ["Cotton gharara", "Gharara", 0, "/kids-girls-lehenga.webp"],
  ["Cute linen gharara", "Gharara", 0, "/kids-girls-lehenga.webp"],
  ["Children’s clothing album + free delivery", "Children's clothing collection", 0, "/kids-printed-set.webp"],
  ["Cotton Naira-cut outfit", "Gharara / Naira cut", 0, "/kids-girls-lehenga.webp"],
  ["Linen gharara", "Gharara", 0, "/kids-girls-lehenga.webp"],
  ["Soft summer collection", "Children's outfit collection", 0, "/kids-rainbow-dress.webp"],
  ["Premium lehenga set", "Lehenga", 0, "/kids-girls-lehenga.webp"],
  ["Sherwani gharara", "Gharara", 0, "/kids-eid-kurta.webp"],
  ["Wedding collection", "Children's wedding outfit collection", 0, "/kids-girls-lehenga.webp"],
  ["Cherry Kabli", "Kabli outfit", 0, "/kids-boy-panjabi.webp"],
  ["Floral Kabli", "Kabli outfit", 0, "/kids-printed-set.webp"],
  ["Party collection", "Children's party outfit collection", 0, "/kids-girls-lehenga.webp"],
  ["Most comfortable linen gharara", "Gharara", 0, "/kids-girls-lehenga.webp"],
  ["Jimichu Pari frock", "Frock", 0, "/kids-girls-frock.webp"],
  ["Burj Khalifa design", "Children's dress", 0, "/kids-eid-kurta.webp"],
  ["Western dress", "Western dress", 0, "/kids-rainbow-dress.webp"],
  ["Rose gharara", "Gharara", 0, "/kids-girls-lehenga.webp"],
  ["Cute skirt set (3 colors)", "Skirt set", 0, "/kids-printed-set.webp"],
  ["Cotton baby frock", "Frock", 0, "/kids-girls-frock.webp"],
  ["Eye-soothing gown", "Gown", 0, "/kids-girls-lehenga.webp"],
  ["Stock-clearance outfit", "Children's outfit", 600, "/kids-printed-set.webp"],
  ["Naira-cut cotton gharara", "Gharara", 0, "/kids-girls-lehenga.webp"],
  ["Cotton gharara", "Gharara", 0, "/kids-girls-lehenga.webp"],
  ["Viral Kabli set", "Kabli outfit", 0, "/kids-boy-panjabi.webp"],
  ["Day-out frock collection", "Frock collection", 0, "/kids-rainbow-dress.webp"],
  ["Party-dress collection", "Party dress collection", 0, "/kids-girls-lehenga.webp"],
] as const

const sheetProducts: Product[] = sheetProductSpecs.map(([name, categoryName, price, image], index) => {
  const category = categoryName.includes("Kabli") ? demoCategories[1] : categoryName.includes("Gharara") || categoryName.includes("Frock") || categoryName.includes("dress") || categoryName.includes("Lehenga") || categoryName.includes("Gown") || categoryName.includes("Skirt") ? demoCategories[3] : demoCategories[2]
  const id = `sheet-product-${index + 1}`
  const sizes = ["2Y", "4Y", "6Y", "8Y", "10Y", "12Y"]
  return { id, category_id: category.id, name, name_bn: null, description: `Real collection listing from the shared product sheet. ${price === 0 ? "Price available on request." : "Limited offer price."}`, description_bn: `শেয়ার করা প্রোডাক্ট শীটের বাস্তব কালেকশন লিস্টিং। ${price === 0 ? "মূল্য জানতে যোগাযোগ করুন।" : "সীমিত অফার মূল্য।"}`, price, compare_price: null, sizes, colors: ["Coral", "Pink", "Blue"], stock: 10 + (index % 12), is_featured: index < 8, is_active: true, sort_order: index + 1, created_at: "", updated_at: "", product_images: [{ id: `${id}-image`, product_id: id, image_url: image, sort_order: 0, created_at: "" }], category }
})

const productCatalog = sheetProducts.length > 0 ? sheetProducts : demoProducts

const demoSettings: ShopSettings = { id: "demo-settings", shop_name: "Unique Collection by Princess", shop_name_bn: "ইউনিক কালেকশন বাই প্রিন্সেস", whatsapp_number: "+8801700000000", bkash_number: "01XXXXXXXXX", delivery_inside_dhaka: 60, delivery_outside_dhaka: 120, hero_title: "Big Little Moments", hero_title_bn: "ছোট্ট মুহূর্ত, বড় আনন্দ", hero_subtitle: "Playful clothes for every little adventure", hero_subtitle_bn: "প্রতিটি ছোট্ট অ্যাডভেঞ্চারের জন্য আনন্দময় পোশাক" }

// The owner phone/PIN are deliberately NOT readable by the browser. Admin
// actions send the credentials to the server, which verifies them itself.
export type OwnerCredentials = { phone: string; pin: string }

// PostgREST parses commas, dots and parentheses as filter syntax, so a raw
// search term could rewrite the query. Strip the expression metacharacters.
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,().*\\"'%]/g, " ").trim().slice(0, 100)
}

const SETTINGS_COLUMNS =
  "id, shop_name, shop_name_bn, whatsapp_number, bkash_number, delivery_inside_dhaka, delivery_outside_dhaka, hero_title, hero_title_bn, hero_subtitle, hero_subtitle_bn, ai_api_url, ai_model"

export async function fetchCategories(): Promise<Category[]> {
  return cached("categories", async () => {
    const { data, error } = await supabase.from("categories").select("*").order("sort_order", { ascending: true })
    if (error) return demoCategories
    return data as Category[]
  })
}

export async function fetchProducts(filters?: {
  categoryId?: string
  featured?: boolean
  search?: string
  sizes?: string[]
  colors?: string[]
  minPrice?: number
  maxPrice?: number
  sort?: "newest" | "price_low" | "price_high"
}): Promise<Product[]> {
  const cacheKey = `products:${JSON.stringify({
    c: filters?.categoryId, f: filters?.featured, s: filters?.search, sort: filters?.sort,
    min: filters?.minPrice, max: filters?.maxPrice,
  })}`

  return cached(cacheKey, async () => {
    let query = supabase
    .from("products")
    .select("*, product_images(*), category(*)")
    .eq("is_active", true)

  if (filters?.categoryId) {
    query = query.eq("category_id", filters.categoryId)
  }
  if (filters?.featured) {
    query = query.eq("is_featured", true)
  }
  if (filters?.search) {
    const term = sanitizeSearchTerm(filters.search)
    if (term) {
      query = query.or(`name.ilike.%${term}%,name_bn.ilike.%${term}%`)
    }
  }
  if (filters?.minPrice !== undefined) {
    query = query.gte("price", filters.minPrice)
  }
  if (filters?.maxPrice !== undefined) {
    query = query.lte("price", filters.maxPrice)
  }

  if (filters?.sort === "price_low") {
    query = query.order("price", { ascending: true })
  } else if (filters?.sort === "price_high") {
    query = query.order("price", { ascending: false })
  } else {
    query = query.order("created_at", { ascending: false })
  }

  const { data, error } = await query
  if (error) {
    let products = productCatalog
    if (filters?.categoryId) products = products.filter((p) => p.category_id === filters.categoryId)
    if (filters?.search) products = products.filter((p) => p.name.toLowerCase().includes(filters.search!.toLowerCase()))
    if (filters?.featured) products = products.filter((p) => p.is_featured)
    return products
  }

    let products = data as Product[]

    if (filters?.sizes && filters.sizes.length > 0) {
      products = products.filter((p) => p.sizes.some((s) => filters.sizes!.includes(s)))
    }
    if (filters?.colors && filters.colors.length > 0) {
      products = products.filter((p) => p.colors.some((c) => filters.colors!.includes(c)))
    }

    products = products.map((p) => ({
      ...p,
      product_images: p.product_images?.sort((a, b) => a.sort_order - b.sort_order),
    }))

    return products
  })
}

export async function fetchProduct(id: string): Promise<Product | null> {
  return cached(`product:${id}`, async () => {
    const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), category(*)")
    .eq("id", id)
    .maybeSingle()
  if (error) return productCatalog.find((p) => p.id === id) ?? null
  if (!data) return productCatalog.find((p) => p.id === id) ?? null
    const product = data as Product
    product.product_images?.sort((a, b) => a.sort_order - b.sort_order)
    return product
  })
}

export async function fetchShopSettings(): Promise<ShopSettings | null> {
  return cached("settings", async () => {
    const { data, error } = await supabase
      .from("shop_settings")
      .select(SETTINGS_COLUMNS)
      .limit(1)
      .maybeSingle()
    if (error) return demoSettings
    return data as unknown as ShopSettings
  })
}

export async function verifyOwnerLogin(phone: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("owner_login_throttled", {
    p_key: getLoginThrottleKey(),
    p_phone: phone,
    p_pin: pin,
  })
  if (error) return false
  return Boolean((data as { ok?: boolean } | null)?.ok)
}

function getLoginThrottleKey(): string {
  let key = localStorage.getItem("ucp-login-key")
  if (!key) {
    key = crypto.randomUUID()
    localStorage.setItem("ucp-login-key", key)
  }
  return key
}

export async function fetchOrdersByPhone(phone: string): Promise<Order[]> {
  // Returns a redacted projection: no address, no customer name, no trx id.
  const { data, error } = await supabase.rpc("track_orders_by_phone", { p_phone: phone })
  if (error) return []
  return (data ?? []) as Order[]
}

export async function fetchAllOrders(creds: OwnerCredentials, limit?: number): Promise<Order[]> {
  const { data, error } = await supabase.rpc("admin_list_orders", {
    p_phone: creds.phone,
    p_pin: creds.pin,
    p_limit: limit ?? null,
  })
  if (error) return []
  return (data ?? []) as Order[]
}

export async function validateCoupon(code: string, subtotal: number): Promise<number> {
  const { data, error } = await supabase.rpc("validate_coupon", { p_code: code, p_subtotal: subtotal })
  if (error) {
    const msg = (error as { message?: string }).message ?? ""
    throw new Error(msg)
  }
  return Number(data)
}

export async function createOrder(
  order: {
    customer_name: string
    customer_phone: string
    customer_email: string | null
    customer_address: string
    district: string
    area_type: "inside_dhaka" | "outside_dhaka"
    payment_method: "cod" | "bkash"
    bkash_trx_id: string | null
    subtotal: number
    delivery_charge: number
    total: number
    notes: string | null
    coupon_code: string | null
  },
  items: {
    product_id: string | null
    product_name: string
    size: string | null
    color: string | null
    quantity: number
    price: number
  }[]
): Promise<Order> {
  // Prices, delivery charge and totals are recomputed server-side; the values
  // sent from the browser are advisory only and are ignored by the server.
  const { data, error } = await supabase.rpc("place_order", {
    p_customer: {
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email,
      customer_address: order.customer_address,
      district: order.district,
      area_type: order.area_type,
      payment_method: order.payment_method,
      bkash_trx_id: order.bkash_trx_id,
      notes: order.notes,
    },
    p_coupon: order.coupon_code,
    p_items: items.map((i) => ({
      product_id: i.product_id,
      size: i.size,
      color: i.color,
      quantity: i.quantity,
    })),
  })
  if (error) throw new Error("order_failed")
  return data as Order
}

export async function updateOrderStatus(
  creds: OwnerCredentials,
  orderId: string,
  status: Order["status"]
): Promise<void> {
  const { error } = await supabase.rpc("admin_set_order_status", {
    p_phone: creds.phone,
    p_pin: creds.pin,
    p_order_id: orderId,
    p_status: status,
  })
  if (error) throw new Error("update_failed")
}

export async function updateOrderPaymentStatus(
  creds: OwnerCredentials,
  orderId: string,
  paymentStatus: "pending" | "paid" | "failed"
): Promise<void> {
  const { error } = await supabase.rpc("admin_set_payment_status", {
    p_phone: creds.phone,
    p_pin: creds.pin,
    p_order_id: orderId,
    p_status: paymentStatus,
  })
  if (error) throw new Error("update_failed")
}

export async function createProduct(
  creds: OwnerCredentials,
  product: {
    category_id: string | null
    name: string
    name_bn: string | null
    description: string | null
    description_bn: string | null
    price: number
    compare_price: number | null
    sizes: string[]
    colors: string[]
    stock: number
    is_featured: boolean
  },
  imageUrls: string[]
): Promise<Product> {
  const { data, error } = await supabase.rpc("admin_create_product", {
    p_phone: creds.phone,
    p_pin: creds.pin,
    p_product: product,
    p_images: imageUrls.filter((url) => url.trim()).map((url) => url.trim()),
  })
  if (error) throw new Error("save_failed")
  invalidateCache("product")
  invalidateCache("products")
  return data as Product
}

export async function updateProduct(
  creds: OwnerCredentials,
  productId: string,
  product: {
    category_id: string | null
    name: string
    name_bn: string | null
    description: string | null
    description_bn: string | null
    price: number
    compare_price: number | null
    sizes: string[]
    colors: string[]
    stock: number
    is_featured: boolean
  },
  imageUrls: string[]
): Promise<void> {
  const { error } = await supabase.rpc("admin_update_product", {
    p_phone: creds.phone,
    p_pin: creds.pin,
    p_product_id: productId,
    p_product: product,
    p_images: imageUrls.filter((url) => url.trim()).map((url) => url.trim()),
  })
  if (error) throw new Error("save_failed")
  invalidateCache("product")
  invalidateCache("products")
}

export async function deleteProduct(creds: OwnerCredentials, productId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_delete_product", {
    p_phone: creds.phone,
    p_pin: creds.pin,
    p_product_id: productId,
  })
  if (error) throw new Error("delete_failed")
  invalidateCache("product")
  invalidateCache("products")
}

export async function updateShopSettings(
  creds: OwnerCredentials,
  settings: Partial<ShopSettings> & { owner_pin?: string }
): Promise<void> {
  const { error } = await supabase.rpc("admin_update_settings", {
    p_phone: creds.phone,
    p_pin: creds.pin,
    p_patch: settings,
  })
  if (error) throw new Error("save_failed")
}

export function getProductImageUrl(product: Product): string | null {
  return product.product_images?.[0]?.image_url ?? null
}

export function getWhatsAppOrderMessage(
  productName: string,
  size: string,
  color: string,
  price: number,
  shopName: string
): string {
  return `Hello ${shopName}! I'd like to order:%0A%0A*Product:* ${productName}%0A*Size:* ${size}%0A*Color:* ${color}%0A*Price:* Tk ${price}%0A%0AIs this available?`
}
