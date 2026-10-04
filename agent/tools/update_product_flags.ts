import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { db } from "../lib/db.js";

export default defineTool({
  description: "Update a product's homepage visibility (is_featured) or availability (is_active). Requires owner confirmation before calling.",
  approval: always(),
  inputSchema: z.object({
    product_id: z.string().uuid(),
    is_featured: z.boolean().nullable().optional(),
    is_active: z.boolean().nullable().optional(),
  }),
  async execute({ product_id, is_featured, is_active }) {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (is_featured !== null && is_featured !== undefined) update.is_featured = is_featured;
    if (is_active !== null && is_active !== undefined) update.is_active = is_active;
    const { error } = await db().from("products").update(update).eq("id", product_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
});
