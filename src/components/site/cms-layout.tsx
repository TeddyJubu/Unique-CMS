import { type ReactNode } from "react"
import { useI18n } from "@/lib/i18n"
import { useOwnerAuth } from "@/lib/owner-auth"
import { navigate, useRouter } from "@/lib/router"
import { Home, ShoppingBag, Plus, Tag, Settings, LogOut, ArrowLeft, Sparkles } from "lucide-react"
import { AssistantChat } from "@/components/site/assistant-chat"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function CmsLayout({ children, title }: { children: ReactNode; title?: string }) {
  const { t } = useI18n()
  const { settings, logout } = useOwnerAuth()
  const { route } = useRouter()
  const [chatOpen, setChatOpen] = useState(false)

  const navItems = [
    { icon: Home, label: t("dashboard"), path: "/owner/dashboard" },
    { icon: ShoppingBag, label: t("allOrders"), path: "/owner/orders" },
    { icon: Plus, label: t("newPost"), path: "/owner/post" },
    { icon: Tag, label: t("myProducts"), path: "/owner/products" },
    { icon: Settings, label: t("settings"), path: "/owner/settings" },
  ]

  const currentPath = route.path

  return (
    <div className="cms-light min-h-svh bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate("/")}
              className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-accent hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="size-5" />
              <span className="sr-only">{t("backToShop")}</span>
            </button>
          </div>
          <h1 className="text-foreground text-base font-bold tracking-tight">
            {title || settings?.shop_name || "Shop"}
          </h1>
          <button
            onClick={() => { logout(); navigate("/") }}
            className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-accent hover:bg-accent hover:text-foreground"
          >
            <LogOut className="size-5" />
            <span className="sr-only">{t("logout")}</span>
          </button>
        </div>
      </header>

      {/* Desktop side nav */}
      <div className="mx-auto flex max-w-5xl gap-6 px-4 py-6 md:px-6">
        <nav className="hidden md:block w-52 shrink-0">
          <div className="sticky top-20 space-y-1">
            {navItems.map((item) => {
              const isActive = currentPath === item.path
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex w-full touch-manipulation items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors active:scale-[0.98]",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/70 hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="size-5 shrink-0" strokeWidth={1.8} />
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Main content */}
        <main className="min-w-0 flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Floating AI assistant button */}
      <button
        onClick={() => setChatOpen(true)}
        className="cms-gradient-surface fixed right-4 bottom-20 z-30 flex size-13 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6"
        aria-label="AI Assistant"
      >
        <Sparkles className="size-6" />
      </button>
      <AssistantChat open={chatOpen} onOpenChange={setChatOpen} />

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex items-stretch">
          {navItems.map((item) => {
            const isActive = currentPath === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex min-h-14 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium transition-colors active:scale-95",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="size-6" strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="truncate px-0.5">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
