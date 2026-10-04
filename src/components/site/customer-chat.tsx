import { useEffect, useRef, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { checkCustomerAssistant, sendCustomerMessage } from "@/lib/assistant"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { LoaderCircle, MessageCircle, Send, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Message = {
  role: "user" | "assistant"
  text: string
}

export function CustomerChat() {
  const { locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [available, setAvailable] = useState(false)
  const [checked, setChecked] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const greetedRef = useRef(false)

  const L = {
    title: locale === "bn" ? "চ্যাট সহকারী" : "Chat with us",
    subtitle: locale === "bn" ? "পণ্য, ডেলিভারি বা অর্ডার নিয়ে জিজ্ঞেস করুন" : "Ask about products, delivery or your order",
    placeholder: locale === "bn" ? "যেমন: ফ্রকের দাম কত?" : "e.g. What frocks do you have?",
    working: locale === "bn" ? "লিখছে..." : "Typing...",
    netError: locale === "bn" ? "সংযোগে সমস্যা। আবার চেষ্টা করুন।" : "Connection problem. Please try again.",
    rateError: locale === "bn" ? "অনেক বার্তা পাঠানো হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।" : "Too many messages. Please wait a moment and try again.",
    hi: locale === "bn"
      ? "আসসালামু আলাইকুম! আমি লিটল লুপের সহকারী। পণ্য খুঁজে দিতে পারি, ডেলিভারি চার্জ বলতে পারি, অর্ডারের অবস্থা দেখাতে পারি — কী জানতে চান?"
      : "Hello! I'm the Little Loop assistant. I can help you find products, check delivery charges, or track your order — what would you like to know?",
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, busy])

  useEffect(() => {
    checkCustomerAssistant().then((res) => {
      setAvailable(res.configured)
      setChecked(true)
    }).catch(() => setChecked(true))
  }, [])

  useEffect(() => {
    if (open && available && !greetedRef.current) {
      greetedRef.current = true
      setMessages([{ role: "assistant", text: L.hi }])
    }
  }, [open, available])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    setInput("")
    setError(null)
    setMessages((prev) => [...prev, { role: "user", text }])
    setBusy(true)
    try {
      const res = await sendCustomerMessage(text)
      if (res.error) {
        setError(res.error === "rate_limited" ? L.rateError : L.netError)
      } else {
        const reply = res.text?.trim()
        setMessages((prev) => [...prev, { role: "assistant", text: reply || "…" }])
      }
    } catch {
      setError(L.netError)
    } finally {
      setBusy(false)
    }
  }

  const suggested = locale === "bn"
    ? ["ফ্রক খুঁজছি", "ডেলিভারি চার্জ কত?", "আমার অর্ডার কোথায়?"]
    : ["Looking for a frock", "What's the delivery charge?", "Where is my order?"]

  return (
    <>
      {/* Floating launcher button */}
      {!open && checked && available && (
        <button
          onClick={() => setOpen(true)}
          aria-label={L.title}
          className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        >
          <MessageCircle className="size-6" />
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full gap-0 border-l border-border bg-background p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b border-border bg-background">
            <div className="flex items-center gap-3 pr-8">
              <div className="flex size-10 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                <Sparkles className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-sm font-extrabold uppercase tracking-widest text-foreground">
                  {L.title}
                </SheetTitle>
                <p className="truncate text-xs text-muted-foreground">{L.subtitle}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-none"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="size-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-foreground"
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" /> {L.working}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>
            )}

            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && !busy && (
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {suggested.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="border border-border bg-card px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-foreground/70 transition-colors hover:border-primary hover:text-primary"
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
                className="max-h-32 min-h-11 flex-1 resize-none border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <Button
                type="submit"
                size="icon"
                disabled={busy || !input.trim()}
                className="size-11 shrink-0 rounded-none"
                aria-label={locale === "bn" ? "পাঠান" : "Send"}
              >
                <Send className="size-4.5" />
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
