import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { db } from "../lib/db.js";

export default defineTool({
  description: "Update an order's status. Requires owner confirmation before calling.",
  approval: always(),
  inputSchema: z.object({
    order_id: z.string().uuid(),
    status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]),
  }),
  async execute({ order_id, status }) {
    const { error } = await db()
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", order_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
});
