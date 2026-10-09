export function throwOwnerError(error: { message?: string; code?: string }, fallback: string): never {
  if (/unauthorized|invalid.owner|not.authorized/i.test(error.message ?? "") || error.code === "42501") {
    throw new Error("owner_session")
  }
  throw new Error(fallback)
}

export function ownerErrorMessage(error: unknown, fallback: string, sessionMessage: string): string {
  return error instanceof Error && error.message === "owner_session" ? sessionMessage : fallback
}
