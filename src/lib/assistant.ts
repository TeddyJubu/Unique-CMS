import { supabase } from "@/lib/supabase"

export type PendingApproval = {
  requestId: string
  prompt: string
  kind: string
  toolName?: string
  toolInput?: Record<string, unknown> | null
  options?: { id: string; label: string; style?: string; description?: string }[] | null
}

export type AssistantReply = {
  text: string
  pending: PendingApproval[]
}

type BridgeResult = {
  sessionId?: string
  configured?: boolean
  message?: string
  text?: string
  pending?: PendingApproval[]
  error?: string
}

async function callBridge(body: Record<string, unknown>): Promise<BridgeResult> {
  const { data, error } = await supabase.functions.invoke("assistant-bridge", { body })
  if (error) {
    const status = (error as { status?: number }).status
    if (status === 401) return { error: "unauthorized" }
    return { error: "network" }
  }
  return (data ?? {}) as BridgeResult
}

export function getChatKey(): string {
  let key = localStorage.getItem("ucp-assistant-chat-key")
  if (!key) {
    key = `chat-${crypto.randomUUID()}`
    localStorage.setItem("ucp-assistant-chat-key", key)
  }
  return key
}

function getCustomerChatKey(): string {
  let key = localStorage.getItem("ucp-customer-chat-key")
  if (!key) {
    key = `cust-${crypto.randomUUID()}`
    localStorage.setItem("ucp-customer-chat-key", key)
  }
  return key
}

export async function checkCustomerAssistant(): Promise<{ configured: boolean; shopName?: string }> {
  const { data, error } = await supabase.functions.invoke("assistant-bridge", {
    // The bridge requires chatKey on every customer action, including status.
    body: { action: "status", mode: "customer", chatKey: getCustomerChatKey() },
  })
  if (error) return { configured: false }
  return { configured: Boolean((data as any)?.configured), shopName: (data as any)?.shopName }
}

export type ProductCard = {
  id: string
  name: string
  price: number
  image: string | null
  stock: number | null
}

export async function sendCustomerMessage(message: string): Promise<BridgeResult & { products?: ProductCard[]; whatsapp?: string }> {
  const { data, error } = await supabase.functions.invoke("assistant-bridge", {
    body: { action: "send", mode: "customer", chatKey: getCustomerChatKey(), message },
  })
  if (error) {
    const status = (error as { status?: number }).status
    if (status === 429) return { error: "rate_limited" }
    return { error: "network" }
  }
  return (data ?? {}) as BridgeResult
}

export async function checkAssistantConfigured(phone: string, pin: string): Promise<boolean> {
  const res = await callBridge({ action: "status", phone, pin })
  return res.configured === true
}

export async function startAssistantSession(phone: string, pin: string): Promise<BridgeResult> {
  return callBridge({ action: "start", phone, pin, chatKey: getChatKey() })
}

export async function sendMessage(
  phone: string,
  pin: string,
  _sessionId: string,
  message: string
): Promise<BridgeResult> {
  return callBridge({ action: "send", phone, pin, chatKey: getChatKey(), message })
}

export async function respondApproval(
  phone: string,
  pin: string,
  _sessionId: string,
  requestId: string,
  optionId: string
): Promise<BridgeResult> {
  return callBridge({
    action: "respond",
    phone,
    pin,
    chatKey: getChatKey(),
    inputResponses: [{ requestId, optionId }],
  })
}
