import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { db } from "../lib/db.js";

export default defineTool({
  description: "Permanently delete a product. Requires owner confirmation before calling.",
  approval: always(),
  inputSchema: z.object({
    product_id: z.string().uuid(),
    product_name: z.string().describe("Product name, echoed back for the confirmation prompt"),
  }),
  async execute({ product_id }) {
    const { error } = await db().from("products").delete().eq("id", product_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
});
