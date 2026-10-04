import { useEffect, useRef, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { useOwnerAuth } from "@/lib/owner-auth"
import {
  respondApproval,
  sendMessage,
  startAssistantSession,
  type PendingApproval,
} from "@/lib/assistant"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Bot, Check, LoaderCircle, Send, Sparkles, X,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Message = {
  role: "user" | "assistant"
  text: string
}

type Approval = PendingApproval & { summary: string }

function approvalSummary(p: PendingApproval): string {
  const input = p.toolInput ?? {}
  const name = String(input.product_name ?? input.productName ?? "")
  const oldPrice = input.old_price
  const newPrice = input.price
  if (p.toolName === "update_product_price" && name && oldPrice !== undefined) {
    return `Change ${name} from Tk ${oldPrice} to Tk ${newPrice}?`
  }
  if (p.toolName === "delete_product" && name) {
    return `Delete "${name}" permanently?`
  }
  if (p.toolName === "update_shop_settings") {
    const parts = Object.entries(input)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
    return parts.length ? `Update shop settings — ${parts.join(", ")}?` : "Update shop settings?"
  }
  return p.prompt
}

export function AssistantChat({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { locale } = useI18n()
  const { credentials } = useOwnerAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approval, setApproval] = useState<Approval | null>(null)
  const [notConfigured, setNotConfigured] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const L = {
    title: locale === "bn" ? "এআই সহকারী" : "AI Assistant",
    subtitle: locale === "bn" ? "শপ ম্যানেজ করুন কথায়" : "Manage your shop by talking",
    placeholder: locale === "bn" ? "যেমন: সব পেন্ডিং অর্ডার দেখাও" : "e.g. Show my pending orders",
    send: locale === "bn" ? "পাঠান" : "Send",
    working: locale === "bn" ? "ভাবছে..." : "Thinking...",
    netError: locale === "bn" ? "সংযোগে সমস্যা। আবার চেষ্টা করুন।" : "Connection problem. Please try again.",
    confirmTitle: locale === "bn" ? "নিশ্চিত করুন" : "Please confirm",
    yes: locale === "bn" ? "হ্যাঁ, করুন" : "Yes, do it",
    no: locale === "bn" ? "না, বাতিল" : "No, cancel",
    hi: locale === "bn"
      ? "আসসালামু আলাইকুম! আমি আপনার শপ সহকারী। আমি পণ্য যোগ বা মুছতে পারি, দাম বদলাতে পারি, অর্ডার দেখতে পারি, সেটিংস ঠিক করতে পারি — সব কথায়।"
      : "Hello! I'm your shop assistant. I can add or remove products, change prices, look up orders, and update settings — all by conversation.",
    reset: locale === "bn" ? "নতুন কথা" : "New chat",
    notConfiguredTitle: locale === "bn" ? "এআই সংযুক্ত নয়" : "AI not connected",
    notConfiguredMsg: locale === "bn"
      ? "সহকারী চালু করতে, সেটিংস পেজে গিয়ে আপনার AI API কী যোগ করুন।"
      : "To enable the assistant, go to the Settings page and add your AI API key.",
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, approval, busy])

  useEffect(() => {
    if (open && messages.length === 0 && !busy) {
      setMessages([{ role: "assistant", text: L.hi }])
      // Check if AI is configured
      if (credentials) {
        startAssistantSession(credentials.phone, credentials.pin).then((res) => {
          if (res.configured === false) {
            setNotConfigured(true)
          } else {
            setNotConfigured(false)
          }
        }).catch(() => {})
      }
    }
  }, [open])

  const runTurn = async (fn: () => Promise<{ text?: string; pending?: PendingApproval[]; error?: string }>) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fn()
      if (res.error) {
        setError(L.netError)
        return
      }
      if (res.text?.trim()) {
        setMessages((prev) => [...prev, { role: "assistant", text: res.text!.trim() }])
      }
      if (res.pending && res.pending.length > 0) {
        setApproval({ ...res.pending[0], summary: approvalSummary(res.pending[0]) })
      }
    } catch {
      setError(L.netError)
    } finally {
      setBusy(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || busy || !credentials) return
    setInput("")
    setMessages((prev) => [...prev, { role: "user", text }])
    await runTurn(() => sendMessage(credentials.phone, credentials.pin, "local", text))
  }

  const handleApproval = async (optionId: string) => {
    if (!approval || !credentials) return
    const current = approval
    setApproval(null)
    setMessages((prev) => [...prev, { role: "user", text: optionId === "approve" ? L.yes : L.no }])
    await runTurn(() =>
      respondApproval(credentials.phone, credentials.pin, "local", current.requestId, optionId)
    )
  }

  const resetChat = () => {
    localStorage.removeItem("ucp-assistant-chat-key")
    setMessages([{ role: "assistant", text: L.hi }])
    setApproval(null)
    setError(null)
    if (credentials) {
      startAssistantSession(credentials.phone, credentials.pin).then((res) => {
        setNotConfigured(res.configured === false)
      }).catch(() => {})
    }
  }

  const suggested = locale === "bn"
    ? ["আজকের অর্ডার কত?", "পেন্ডিং অর্ডার দেখাও", "নতুন পণ্য যোগ করো"]
    : ["How many orders today?", "Show pending orders", "Add a new product"]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="cms-light w-full gap-0 border-l border-border p-0 sm:max-w-md">
        <SheetHeader className="cms-gradient-surface-soft border-b border-border">
          <div className="flex items-center gap-3 pr-8">
            <div className="cms-gradient-surface flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-bold">{L.title}</SheetTitle>
              <p className="truncate text-xs text-muted-foreground">{L.subtitle}</p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs text-foreground hover:bg-background/60" onClick={resetChat}>
              {L.reset}
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {notConfigured && (
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <Bot className="size-3.5" /> {L.notConfiguredTitle}
              </p>
              <p className="text-sm font-medium text-foreground">{L.notConfiguredMsg}</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === "user"
                    ? "cms-gradient-surface rounded-br-md"
                    : "rounded-bl-md border border-border bg-card text-foreground"
                )}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" /> {L.working}
              </div>
            </div>
          )}

          {approval && !busy && (
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <Bot className="size-3.5" /> {L.confirmTitle}
              </p>
              <p className="mb-3 text-sm font-medium text-foreground">{approval.summary}</p>
              <div className="flex gap-2">
                <Button size="sm" className="h-9 flex-1 rounded-lg bg-green-600 text-white hover:bg-green-700" onClick={() => handleApproval("approve")}>
                  <Check className="size-4" /> {L.yes}
                </Button>
                <Button size="sm" variant="outline" className="h-9 flex-1 rounded-lg" onClick={() => handleApproval("deny")}>
                  <X className="size-4" /> {L.no}
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div ref={bottomRef} />
        </div>

        {messages.length <= 1 && !busy && !notConfigured && (
          <div className="flex flex-wrap gap-2 px-4 pb-2">
            {suggested.map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:border-primary hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="border-t border-border bg-card p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend(e)
                }
              }}
              rows={1}
              placeholder={L.placeholder}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
            />
            <Button type="submit" size="icon" disabled={busy || !input.trim()} className="size-11 shrink-0 rounded-xl">
              <Send className="size-4.5" />
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
