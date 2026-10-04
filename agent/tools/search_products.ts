import { defineTool } from "eve/tools";
import { z } from "zod";
import { db } from "../lib/db.js";

export default defineTool({
  description: "Search products by name (partial match). Returns matching products with id, name, price, stock, sizes, colors, featured/active flags.",
  inputSchema: z.object({
    query: z.string().min(1).describe("Product name or part of it"),
  }),
  async execute({ query }) {
    const { data, error } = await db()
      .from("products")
      .select("id, name, price, compare_price, stock, sizes, colors, is_featured, is_active")
      .ilike("name", `%${query}%`)
      .limit(10);
    if (error) throw new Error(error.message);
    return { products: data ?? [] };
  },
});
