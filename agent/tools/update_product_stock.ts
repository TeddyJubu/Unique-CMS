import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { db } from "../lib/db.js";

export default defineTool({
  description: "Update a product's stock quantity. Requires owner confirmation before calling.",
  approval: always(),
  inputSchema: z.object({
    product_id: z.string().uuid(),
    stock: z.number().int().min(0),
  }),
  async execute({ product_id, stock }) {
    const { error } = await db()
      .from("products")
      .update({ stock, updated_at: new Date().toISOString() })
      .eq("id", product_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
});
