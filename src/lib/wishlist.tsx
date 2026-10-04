import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Product } from "@/lib/supabase"

export type WishItem = {
  id: string
  name: string
  name_bn: string | null
  price: number
  image_url: string | null
}

const STORAGE_KEY = "ucp-wishlist"

type WishlistContextType = {
  items: WishItem[]
  has: (id: string) => boolean
  toggle: (product: Product) => void
  remove: (id: string) => void
  count: number
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const has = (id: string) => items.some((i) => i.id === id)

  const toggle = (product: Product) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === product.id)) {
        return prev.filter((i) => i.id !== product.id)
      }
      return [
        {
          id: product.id,
          name: product.name,
          name_bn: product.name_bn,
          price: product.price,
          image_url: product.product_images?.[0]?.image_url ?? null,
        },
        ...prev,
      ]
    })
  }

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))

  const count = items.length

  return (
    <WishlistContext.Provider value={{ items, has, toggle, remove, count }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider")
  return ctx
}
