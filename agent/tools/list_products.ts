import { defineTool } from "eve/tools";
import { z } from "zod";
import { db } from "../lib/db.js";

export default defineTool({
  description: "List the newest products in the shop (name, price, stock, flags).",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(50).default(10),
  }),
  async execute({ limit }) {
    const { data, error } = await db()
      .from("products")
      .select("id, name, price, stock, is_featured, is_active")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return { products: data ?? [] };
  },
});
