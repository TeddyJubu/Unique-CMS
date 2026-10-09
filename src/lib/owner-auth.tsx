import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import { fetchOwnerSettings, verifyOwnerLogin, type OwnerCredentials } from "@/lib/shop"
import type { ShopSettings } from "@/lib/supabase"

type OwnerAuthContextType = {
  isAuthed: boolean
  settings: ShopSettings | null
  settingsError: boolean
  /** Credentials for privileged calls. The server re-verifies them every time. */
  credentials: OwnerCredentials | null
  login: (phone: string, pin: string) => Promise<boolean>
  logout: () => void
  refreshSettings: () => Promise<void>
}

const CREDS_KEY = "ucp-owner-creds"

function readStoredCredentials(): OwnerCredentials | null {
  try {
    const raw = sessionStorage.getItem(CREDS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as OwnerCredentials
    return parsed?.phone && parsed?.pin ? parsed : null
  } catch {
    return null
  }
}

const OwnerAuthContext = createContext<OwnerAuthContextType | undefined>(undefined)

export function OwnerAuthProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] = useState<OwnerCredentials | null>(readStoredCredentials)
  // Holding credentials is what proves the owner signed in. Every privileged
  // action re-sends them and the server checks them against a hashed PIN, so a
  // forged local flag no longer grants anything.
  const isAuthed = credentials !== null
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [settingsError, setSettingsError] = useState(false)

  const refreshSettings = async () => {
    setSettingsError(false)
    try {
      const s = await fetchOwnerSettings()
      setSettings(s)
    } catch (e) {
      setSettingsError(true)
      throw e
    }
  }

  useEffect(() => {
    void refreshSettings().catch(() => {})
  }, [])

  const login = async (phone: string, pin: string): Promise<boolean> => {
    const ok = await verifyOwnerLogin(phone, pin)
    if (!ok) return false
    const creds: OwnerCredentials = { phone, pin }
    sessionStorage.setItem(CREDS_KEY, JSON.stringify(creds))
    setCredentials(creds)
    return true
  }

  const logout = () => {
    sessionStorage.removeItem(CREDS_KEY)
    sessionStorage.removeItem("ucp-owner-authed")
    setCredentials(null)
  }

  return (
    <OwnerAuthContext.Provider value={{ isAuthed, settings, settingsError, credentials, login, logout, refreshSettings }}>
      {children}
    </OwnerAuthContext.Provider>
  )
}

export function useOwnerAuth() {
  const ctx = useContext(OwnerAuthContext)
  if (!ctx) throw new Error("useOwnerAuth must be used within OwnerAuthProvider")
  return ctx
}
