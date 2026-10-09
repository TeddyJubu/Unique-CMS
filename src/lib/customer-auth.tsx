import { createContext, useContext, useState, type ReactNode } from "react"
import { supabase, type CustomerProfile } from "@/lib/supabase"

type CustomerContextType = {
  customer: CustomerProfile | null
  login: (name: string, phone: string) => Promise<void>
  logout: () => void
  saveProfile: (profile: CustomerProfile) => Promise<void>
}

const STORAGE_KEY = "ucp-customer"

function readStored(): CustomerProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CustomerProfile
    return parsed?.phone ? parsed : null
  } catch {
    return null
  }
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined)

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(readStored)

  const persist = (profile: CustomerProfile) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    setCustomer(profile)
  }

  // Server sync is best-effort: the account works fully offline / pre-migration.
  const syncToServer = async (profile: CustomerProfile) => {
    try {
      await supabase.from("customers").upsert(
        {
          phone: profile.phone,
          name: profile.name,
          address: profile.address,
          district: profile.district,
          area_type: profile.area_type,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "phone" }
      )
    } catch {
      // ignore — local profile is authoritative
    }
  }

  const login = async (name: string, phone: string) => {
    const cleanPhone = phone.replace(/[^\d+]/g, "").slice(0, 32)
    if (cleanPhone.replace(/\D/g, "").length < 6) throw new Error("invalid_phone")
    const cleanName = name.trim().slice(0, 120)
    if (!cleanName) throw new Error("invalid_name")

    let profile: CustomerProfile = {
      phone: cleanPhone,
      name: cleanName,
      address: null,
      district: null,
      area_type: "inside_dhaka",
    }
    try {
      const { data } = await supabase
        .from("customers")
        .select("phone, name, address, district, area_type")
        .eq("phone", cleanPhone)
        .maybeSingle()
      if (data) {
        profile = {
          phone: data.phone,
          name: cleanName,
          address: data.address,
          district: data.district,
          area_type: data.area_type === "outside_dhaka" ? "outside_dhaka" : "inside_dhaka",
        }
      }
    } catch {
      // ignore — start fresh locally
    }
    persist(profile)
    syncToServer(profile)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setCustomer(null)
  }

  const saveProfile = async (profile: CustomerProfile) => {
    const cleaned: CustomerProfile = {
      ...profile,
      name: profile.name.trim().slice(0, 120),
      address: profile.address?.trim().slice(0, 500) || null,
      district: profile.district?.trim().slice(0, 120) || null,
      updated_at: new Date().toISOString(),
    }
    persist(cleaned)
    syncToServer(cleaned)
  }

  return (
    <CustomerContext.Provider value={{ customer, login, logout, saveProfile }}>
      {children}
    </CustomerContext.Provider>
  )
}

export function useCustomer() {
  const ctx = useContext(CustomerContext)
  if (!ctx) throw new Error("useCustomer must be used within CustomerAuthProvider")
  return ctx
}
