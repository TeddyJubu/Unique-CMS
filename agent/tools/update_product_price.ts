import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { db } from "../lib/db.js";

export default defineTool({
  description: "Update a product's price (and optionally compare-at price) in Taka. Requires owner confirmation before calling.",
  approval: always(),
  inputSchema: z.object({
    product_id: z.string().uuid(),
    product_name: z.string().describe("Product name, echoed back for the confirmation prompt"),
    old_price: z.number().describe("Current price, echoed for the confirmation prompt"),
    price: z.number().min(0),
  }),
  async execute({ product_id, price }) {
    const { error } = await db()
      .from("products")
      .update({ price, updated_at: new Date().toISOString() })
      .eq("id", product_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
});
