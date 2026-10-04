import { defineTool } from "eve/tools";
import { z } from "zod";
import { db } from "../lib/db.js";

export default defineTool({
  description: "Look up orders. Filter by status (pending/confirmed/shipped/delivered/cancelled), payment status, or order number. Returns order details including items and totals.",
  inputSchema: z.object({
    status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]).nullable().optional(),
    order_number: z.string().nullable().optional(),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  async execute({ status, order_number, limit }) {
    let q = db()
      .from("orders")
      // Explicit projection: the bKash transaction reference is never needed to
      // answer a question about orders, so it is not sent out of the database.
      .select(
        [
          "id",
          "order_number",
          "customer_name",
          "customer_phone",
          "customer_address",
          "district",
          "area_type",
          "payment_method",
          "payment_status",
          "subtotal",
          "delivery_charge",
          "total",
          "status",
          "notes",
          "created_at",
          "order_items(product_name, size, color, quantity, price)",
        ].join(", "),
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    if (order_number) q = q.eq("order_number", order_number);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const orders = data ?? [];
    const revenue = orders
      .filter((o: { status: string }) => o.status !== "cancelled")
      .reduce((s: number, o: { total: number }) => s + Number(o.total), 0);
    return { count: orders.length, revenue, orders };
  },
});
