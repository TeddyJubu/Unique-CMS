import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { db } from "../lib/db.js";

export default defineTool({
  description: "Create a new product. Use when the owner asks to add a product or publish a post. Requires owner confirmation before calling.",
  approval: always(),
  inputSchema: z.object({
    name: z.string().min(1),
    price: z.number().min(0).describe("Price in Taka; 0 means price on request"),
    category_id: z.string().uuid().nullable().optional(),
    description: z.string().nullable().optional(),
    sizes: z.array(z.string()).default(["2Y", "4Y", "6Y", "8Y", "10Y", "12Y"]),
    colors: z.array(z.string()).default(["Coral", "Pink", "Blue"]),
    stock: z.number().int().min(0).default(10),
    is_featured: z.boolean().default(true),
    image_url: z.string().url().nullable().optional().describe("Photo link for the product"),
  }),
  async execute(input) {
    const { category_id, description, sizes, colors, stock, is_featured, image_url, ...rest } = input;
    const dbp = db();
    const { data, error } = await dbp
      .from("products")
      .insert({
        ...rest,
        category_id: category_id ?? null,
        description: description ?? null,
        sizes,
        colors,
        stock,
        is_featured,
      })
      .select("id, name")
      .single();
    if (error) throw new Error(error.message);
    if (image_url) {
      let parsed: URL;
      try {
        parsed = new URL(image_url);
      } catch {
        throw new Error("Photo link is not a valid URL");
      }
      if (parsed.protocol !== "https:") {
        throw new Error("Photo link must start with https://");
      }
      await dbp.from("product_images").insert({ product_id: data.id, image_url, sort_order: 0 });
    }
    return { created: data };
  },
});
