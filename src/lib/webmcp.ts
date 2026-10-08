import type { ShopSettings, Product, Category } from "@/lib/supabase"

export function generateWebMCPManifest(settings: ShopSettings | null): object {
  return {
    "$schema": "https://schema.webmcp.org/v1",
    "name": settings?.shop_name || "Unique Collection by Princess",
    "description": "Playful kids clothing store in Bangladesh. Frocks, Panjabis, matching sets, Eid wear and party outfits. Cash on Delivery and bKash accepted.",
    "type": "ecommerce",
    "actions": [
      {
        "name": "search_products",
        "description": "Search for products by name, category, or keyword",
        "type": "query",
        "parameters": {
          "query": { "type": "string", "description": "Search term" },
          "category": { "type": "string", "description": "Category slug or ID" },
          "min_price": { "type": "number", "description": "Minimum price in BDT" },
          "max_price": { "type": "number", "description": "Maximum price in BDT" },
          "size": { "type": "string", "description": "Size filter" },
          "color": { "type": "string", "description": "Color filter" }
        },
        "returns": { "type": "array", "items": "Product" }
      },
      {
        "name": "get_product_details",
        "description": "Get detailed information about a specific product including sizes, colors, and stock",
        "type": "query",
        "parameters": {
          "product_id": { "type": "string", "required": true }
        },
        "returns": { "type": "Product" }
      },
      {
        "name": "check_stock",
        "description": "Check stock availability for a product and size",
        "type": "query",
        "parameters": {
          "product_id": { "type": "string", "required": true },
          "size": { "type": "string" }
        },
        "returns": { "type": "object", "properties": { "in_stock": "boolean", "available_quantity": "number" } }
      },
      {
        "name": "add_to_cart",
        "description": "Add a product to the shopping cart",
        "type": "action",
        "parameters": {
          "product_id": { "type": "string", "required": true },
          "size": { "type": "string" },
          "color": { "type": "string" },
          "quantity": { "type": "number", "default": 1 }
        }
      },
      {
        "name": "place_order",
        "description": "Place an order. Payment method can be cash on delivery or bKash.",
        "type": "action",
        "parameters": {
          "customer_name": { "type": "string", "required": true },
          "customer_phone": { "type": "string", "required": true },
          "customer_address": { "type": "string", "required": true },
          "district": { "type": "string", "required": true },
          "area_type": { "type": "string", "enum": ["inside_dhaka", "outside_dhaka"], "required": true },
          "payment_method": { "type": "string", "enum": ["cod", "bkash"], "required": true },
          "bkash_trx_id": { "type": "string", "description": "Required if payment_method is bkash" },
          "items": { "type": "array", "required": true }
        },
        "returns": { "type": "object", "properties": { "order_number": "string", "total": "number" } }
      },
      {
        "name": "track_order",
        "description": "Track order status by phone number",
        "type": "query",
        "parameters": {
          "phone": { "type": "string", "required": true }
        },
        "returns": { "type": "array", "items": "Order" }
      }
    ],
    "owner_actions": [
      {
        "name": "manage_orders",
        "description": "View and update order status (confirm, ship, deliver, cancel). Requires owner authentication.",
        "type": "action",
        "requires_auth": true,
        "parameters": {
          "action": { "type": "string", "enum": ["confirm", "ship", "deliver", "cancel", "mark_paid"] },
          "order_id": { "type": "string", "required": true }
        }
      },
      {
        "name": "add_product",
        "description": "Add a new product. Requires owner authentication.",
        "type": "action",
        "requires_auth": true,
        "parameters": {
          "name": { "type": "string", "required": true },
          "price": { "type": "number", "required": true },
          "category_id": { "type": "string" },
          "sizes": { "type": "array" },
          "colors": { "type": "array" },
          "stock": { "type": "number" },
          "image_urls": { "type": "array" }
        }
      },
      {
        "name": "get_sales_summary",
        "description": "Get today's and recent sales summary. Requires owner authentication.",
        "type": "query",
        "requires_auth": true,
        "returns": { "type": "object", "properties": { "today_orders": "number", "today_revenue": "number", "pending_orders": "number" } }
      }
    ]
  }
}

export function generateStructuredData(settings: ShopSettings | null, products: Product[], categories: Category[]) {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "name": settings?.shop_name || "Unique Collection by Princess",
    "description": "Playful children's clothing store in Bangladesh",
    "paymentAccepted": "Cash on Delivery, bKash",
    "currenciesAccepted": "BDT",
    "areaServed": "Bangladesh",
    "deliveryCharge": {
      insideDhaka: settings?.delivery_inside_dhaka ?? 60,
      outsideDhaka: settings?.delivery_outside_dhaka ?? 120
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "telephone": settings?.whatsapp_number,
      "availableLanguage": ["English", "Bengali"]
    },
    "categories": categories.map(c => ({
      name: c.name,
      slug: c.slug
    })),
    "products": products.slice(0, 50).map(p => ({
      "@type": "Product",
      "id": p.id,
      "name": p.name,
      "category": p.category?.name,
      "price": p.price,
      "currency": "BDT",
      "sizes": p.sizes,
      "colors": p.colors,
      "inStock": p.stock > 0,
      "image": p.product_images?.[0]?.image_url
    }))
  }
}
