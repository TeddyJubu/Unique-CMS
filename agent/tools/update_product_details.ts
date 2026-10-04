import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { db } from "../lib/db.js";

export default defineTool({
  description: "Update a product's name, description, sizes, colors or main photo. Requires owner confirmation before calling.",
  approval: always(),
  inputSchema: z.object({
    product_id: z.string().uuid(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    sizes: z.array(z.string()).nullable().optional(),
    colors: z.array(z.string()).nullable().optional(),
    image_url: z.string().url().nullable().optional().describe("Replace the product's main photo"),
  }),
  async execute({ product_id, name, description, sizes, colors, image_url }) {
    const dbp = db();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== null && name !== undefined) update.name = name;
    if (description !== null && description !== undefined) update.description = description;
    if (sizes !== null && sizes !== undefined) update.sizes = sizes;
    if (colors !== null && colors !== undefined) update.colors = colors;
    if (Object.keys(update).length > 1) {
      const { error } = await dbp.from("products").update(update).eq("id", product_id);
      if (error) throw new Error(error.message);
    }
    if (image_url) {
      // Only allow https image links: the value can originate from text the
      // assistant read out of customer-supplied order data.
      let parsed: URL;
      try {
        parsed = new URL(image_url);
      } catch {
        throw new Error("Photo link is not a valid URL");
      }
      if (parsed.protocol !== "https:") {
        throw new Error("Photo link must start with https://");
      }
      await dbp.from("product_images").delete().eq("product_id", product_id);
      await dbp.from("product_images").insert({ product_id, image_url, sort_order: 0 });
    }
    return { ok: true };
  },
});
