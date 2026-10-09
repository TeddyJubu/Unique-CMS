import { useState } from "react"
import { useI18n } from "@/lib/i18n"
import { ownerErrorMessage } from "@/lib/owner-errors"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function OwnerError({ message, retry }: { message: string | null; retry?: () => void }) {
  const { t } = useI18n()
  if (!message) return null
  return <div role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
    <p>{message}</p>
    {retry && <Button type="button" variant="outline" className="mt-3 rounded-lg" onClick={retry}>{t("retry")}</Button>}
  </div>
}

export function OwnerConfirmation({ open, onClose, title, description, actionLabel, onConfirm, errorMessage, destructive = false }: {
  open: boolean; onClose: () => void; title: string; description: string; actionLabel: string;
  onConfirm: () => Promise<void>; errorMessage: string; destructive?: boolean;
}) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return <AlertDialog open={open} onOpenChange={(value) => { if (!value && !busy) { setError(null); onClose() } }}>
    <AlertDialogContent className="cms-light rounded-2xl">
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <OwnerError message={error} />
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy} className="rounded-xl">{t("keepUnchanged")}</AlertDialogCancel>
        <AlertDialogAction disabled={busy} className={`rounded-xl ${destructive ? "bg-destructive text-white hover:bg-destructive/90" : ""}`} onClick={async (event) => {
          event.preventDefault()
          if (busy) return
          setBusy(true); setError(null)
          try { await onConfirm(); onClose() }
          catch (err) { setError(ownerErrorMessage(err, errorMessage, t("ownerSessionError"))) }
          finally { setBusy(false) }
        }}>{busy ? t("saving") : actionLabel}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}
