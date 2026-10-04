type Entry = { value: unknown; expires: number }

const store = new Map<string, Entry>()
const inflight = new Map<string, Promise<unknown>>()

const DEFAULT_TTL = 2 * 60 * 1000

export async function cached<T>(key: string, fetcher: () => Promise<T>, ttl = DEFAULT_TTL): Promise<T> {
  const hit = store.get(key)
  if (hit && hit.expires > Date.now()) return hit.value as T

  const pending = inflight.get(key)
  if (pending) return pending as Promise<T>

  const promise = fetcher()
    .then((value) => {
      store.set(key, { value, expires: Date.now() + ttl })
      inflight.delete(key)
      return value
    })
    .catch((err) => {
      inflight.delete(key)
      throw err
    })

  inflight.set(key, promise)
  return promise
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    store.clear()
    return
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
