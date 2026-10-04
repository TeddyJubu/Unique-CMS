import { useState, useEffect, useCallback } from "react"

export type Route = {
  path: string
  params: Record<string, string>
}

function parseHash(): Route {
  const hash = window.location.hash.slice(1) || "/"
  const [pathPart, queryPart] = hash.split("?")
  const params: Record<string, string> = {}
  if (queryPart) {
    new URLSearchParams(queryPart).forEach((v, k) => {
      params[k] = v
    })
  }
  return { path: pathPart || "/", params }
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash)

  useEffect(() => {
    const handler = () => {
      setRoute(parseHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener("hashchange", handler)
    return () => window.removeEventListener("hashchange", handler)
  }, [])

  const navigate = useCallback((path: string) => {
    window.location.hash = path
  }, [])

  return { route, navigate }
}

export function navigate(path: string) {
  window.location.hash = path
}
