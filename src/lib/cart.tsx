import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { CartItem } from "@/lib/supabase"

type CartContextType = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (product_id: string, size: string, color: string) => void
  updateQuantity: (product_id: string, size: string, color: string, quantity: number) => void
  clearCart: () => void
  itemCount: number
  subtotal: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const stored = localStorage.getItem("ucp-cart")
    return stored ? JSON.parse(stored) : []
  })

  useEffect(() => {
    localStorage.setItem("ucp-cart", JSON.stringify(items))
  }, [items])

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.product_id === item.product_id && i.size === item.size && i.color === item.color
      )
      if (existing) {
        return prev.map((i) =>
          i.product_id === item.product_id && i.size === item.size && i.color === item.color
            ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock) }
            : i
        )
      }
      return [...prev, item]
    })
  }

  const removeItem = (product_id: string, size: string, color: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.product_id === product_id && i.size === size && i.color === color))
    )
  }

  const updateQuantity = (product_id: string, size: string, color: string, quantity: number) => {
    if (quantity < 1) return
    setItems((prev) =>
      prev.map((i) =>
        i.product_id === product_id && i.size === size && i.color === color
          ? { ...i, quantity: Math.min(quantity, i.stock) }
          : i
      )
    )
  }

  const clearCart = () => setItems([])

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
