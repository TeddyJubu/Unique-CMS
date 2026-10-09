import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
})

export type Category = {
  id: string
  name: string
  name_bn: string | null
  slug: string
  image_url: string | null
  sort_order: number
  created_at: string
}

export type Product = {
  id: string
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
  /** Per-variant qty keyed by "size|color" ("" for a missing dimension). Absent/empty = total-stock mode. */
  variant_stock?: Record<string, number> | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  product_images?: ProductImage[]
  category?: Category | null
}

export type ProductImage = {
  id: string
  product_id: string
  image_url: string
  sort_order: number
  created_at: string
}

export type Order = {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  customer_address: string
  district: string
  area_type: "inside_dhaka" | "outside_dhaka"
  payment_method: "cod" | "bkash"
  payment_status: "pending" | "paid" | "failed"
  bkash_trx_id: string | null
  subtotal: number
  delivery_charge: number
  total: number
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  notes: string | null
  created_at: string
  updated_at: string
  order_items?: OrderItem[]
}

export type OrderItem = {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  size: string | null
  color: string | null
  quantity: number
  price: number
  created_at: string
}

export type ShopSettings = {
  id: string
  shop_name: string
  shop_name_bn: string
  whatsapp_number: string
  bkash_number: string
  delivery_inside_dhaka: number
  delivery_outside_dhaka: number

  hero_title: string
  hero_title_bn: string
  hero_subtitle: string
  hero_subtitle_bn: string

  ai_api_url?: string | null
  ai_model?: string | null
  announcement_text?: string | null
  announcement_text_bn?: string | null
  announcement_enabled?: boolean | null
}

export type ProductReview = {
  id: string
  product_id: string
  customer_name: string
  customer_phone?: string | null
  rating: number
  title: string | null
  body: string
  photos: string[]
  is_approved: boolean
  is_verified: boolean
  created_at: string
  product_name?: string
}

export type HomepageBanner = {
  id: string
  title: string
  title_bn: string
  subtitle: string
  subtitle_bn: string
  image_url: string
  link_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export type CustomerProfile = {
  phone: string
  name: string
  address: string | null
  district: string | null
  area_type: "inside_dhaka" | "outside_dhaka"
  updated_at?: string
}

export type CartItem = {
  product_id: string
  name: string
  name_bn: string | null
  price: number
  image_url: string | null
  size: string
  color: string
  quantity: number
  stock: number
}
