import { useEffect, useState } from "react"
import { I18nProvider } from "@/lib/i18n"
import { CartProvider } from "@/lib/cart"
import { WishlistProvider } from "@/lib/wishlist"
import { OwnerAuthProvider } from "@/lib/owner-auth"
import { useRouter } from "@/lib/router"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { CustomerChat } from "@/components/site/customer-chat"
import { HomePage } from "@/pages/home"
import { ShopPage, CategoryPage } from "@/pages/shop"
import { ProductPage } from "@/pages/product"
import { CartPage } from "@/pages/cart"
import { WishlistPage } from "@/pages/wishlist"
import { CheckoutPage } from "@/pages/checkout"
import { TrackOrderPage } from "@/pages/track-order"
import { OwnerLoginPage } from "@/pages/owner/login"
import { OwnerDashboard } from "@/pages/owner/dashboard"
import { OwnerOrdersPage } from "@/pages/owner/orders"
import { OwnerProductsPage, OwnerProductFormPage } from "@/pages/owner/products"
import { OwnerSettingsPage } from "@/pages/owner/settings"
import { OwnerStudioPage } from "@/pages/owner/studio"
import { fetchCategories, fetchShopSettings, fetchProducts } from "@/lib/shop"
import { generateWebMCPManifest, generateStructuredData } from "@/lib/webmcp"
import type { Category, ShopSettings } from "@/lib/supabase"
import { useOwnerAuth } from "@/lib/owner-auth"

function StoreLayout({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<ShopSettings | null>(null)

  useEffect(() => {
    Promise.all([fetchCategories(), fetchShopSettings()])
      .then(([c, s]) => {
        setCategories(c)
        setSettings(s)
      })
      .catch(console.error)
  }, [])

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader categories={categories} settings={settings} />
      <main className="flex-1">{children}</main>
      <SiteFooter categories={categories} settings={settings} />
      <CustomerChat />
    </div>
  )
}

function OwnerRouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthed } = useOwnerAuth()
  if (!isAuthed) {
    return <OwnerLoginPage />
  }
  return <>{children}</>
}

function AppRoutes() {
  const { route } = useRouter()

  // Owner routes (no storefront layout)
  if (route.path.startsWith("/owner")) {
    if (route.path === "/owner" || route.path === "/owner/") {
      return <OwnerLoginPage />
    }
    if (route.path === "/owner/dashboard") {
      return (
        <OwnerRouteGuard>
          <OwnerDashboard />
        </OwnerRouteGuard>
      )
    }
    if (route.path === "/owner/orders") {
      return (
        <OwnerRouteGuard>
          <OwnerOrdersPage />
        </OwnerRouteGuard>
      )
    }
    if (route.path === "/owner/post") {
      return (
        <OwnerRouteGuard>
          <OwnerStudioPage />
        </OwnerRouteGuard>
      )
    }
    if (route.path === "/owner/products") {
      return (
        <OwnerRouteGuard>
          <OwnerProductsPage />
        </OwnerRouteGuard>
      )
    }
    if (route.path === "/owner/products/new" || route.path === "/owner/products/edit") {
      return (
        <OwnerRouteGuard>
          <OwnerProductFormPage />
        </OwnerRouteGuard>
      )
    }
    if (route.path === "/owner/settings") {
      return (
        <OwnerRouteGuard>
          <OwnerSettingsPage />
        </OwnerRouteGuard>
      )
    }
    return <OwnerLoginPage />
  }

  // Storefront routes
  let page: React.ReactNode
  switch (route.path) {
    case "/":
      page = <HomePage />
      break
    case "/shop":
      page = <ShopPage />
      break
    case "/category":
      page = <CategoryPage />
      break
    case "/product":
      page = <ProductPage />
      break
    case "/cart":
      page = <CartPage />
      break
    case "/wishlist":
      page = <WishlistPage />
      break
    case "/checkout":
      page = <CheckoutPage />
      break
    case "/track-order":
      page = <TrackOrderPage />
      break
    default:
      page = <HomePage />
  }

  return <StoreLayout>{page}</StoreLayout>
}

function WebMCPInjector() {
  useEffect(() => {
    async function inject() {
      try {
        const [settings, products, categories] = await Promise.all([
          fetchShopSettings(),
          fetchProducts(),
          fetchCategories(),
        ])
        const manifest = generateWebMCPManifest(settings)
        const structured = generateStructuredData(settings, products, categories)

        let script = document.getElementById("webmcp-manifest") as HTMLScriptElement | null
        if (!script) {
          script = document.createElement("script")
          script.id = "webmcp-manifest"
          script.type = "application/json"
          script.setAttribute("data-webmcp", "manifest")
          document.head.appendChild(script)
        }
        script.textContent = JSON.stringify(manifest)

        let ldScript = document.getElementById("structured-data") as HTMLScriptElement | null
        if (!ldScript) {
          ldScript = document.createElement("script")
          ldScript.id = "structured-data"
          ldScript.type = "application/ld+json"
          document.head.appendChild(ldScript)
        }
        ldScript.textContent = JSON.stringify(structured)
      } catch (e) {
        console.error("WebMCP injection failed", e)
      }
    }
    inject()
  }, [])
  return null
}

function App() {
  return (
    <I18nProvider>
      <WishlistProvider>
        <CartProvider>
          <OwnerAuthProvider>
            <WebMCPInjector />
            <AppRoutes />
          </OwnerAuthProvider>
        </CartProvider>
      </WishlistProvider>
    </I18nProvider>
  )
}

export default App
