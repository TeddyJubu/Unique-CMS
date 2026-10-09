import { useI18n } from "@/lib/i18n"
import type { Order } from "@/lib/supabase"
import { OwnerConfirmation } from "@/components/site/owner-feedback"

export function OrderConfirmation({ action, order, onClose, onConfirm }: {
  action: string | null; order: Order | undefined; onClose: () => void; onConfirm: () => Promise<void>;
}) {
  const { t } = useI18n()
  const labels: Record<string, string> = { confirm: "confirm", ship: "ship", deliver: "deliver", cancel: "cancel", markPaid: "markPaid" }
  const help: Record<string, string> = { confirm: "orderConfirmHelp", ship: "orderShipHelp", deliver: "orderDeliverHelp", cancel: "orderCancelHelp", markPaid: "orderPaidHelp" }
  const label = t(labels[action ?? ""] ?? "confirm")
  return <OwnerConfirmation open={!!action && !!order} onClose={onClose}
    title={label + " — " + (order?.order_number ?? "")}
    description={t(help[action ?? ""] ?? "orderConfirmHelp")} actionLabel={label}
    onConfirm={onConfirm} errorMessage={t("orderUpdateError")} destructive={action === "cancel"} />
}
