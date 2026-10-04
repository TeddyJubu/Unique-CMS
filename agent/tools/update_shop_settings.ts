import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { db } from "../lib/db.js";

export default defineTool({
  description: "Update shop settings: delivery charges, WhatsApp number, bKash number, or homepage hero text (English/Bangla). Requires owner confirmation before calling. Only include the fields to change.",
  approval: always(),
  inputSchema: z.object({
    delivery_inside_dhaka: z.number().min(0).nullable().optional(),
    delivery_outside_dhaka: z.number().min(0).nullable().optional(),
    whatsapp_number: z.string().nullable().optional(),
    bkash_number: z.string().nullable().optional(),
    hero_title: z.string().nullable().optional(),
    hero_title_bn: z.string().nullable().optional(),
    hero_subtitle: z.string().nullable().optional(),
    hero_subtitle_bn: z.string().nullable().optional(),
    shop_name: z.string().nullable().optional(),
    shop_name_bn: z.string().nullable().optional(),
  }),
  async execute(input) {
    const update: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v !== null && v !== undefined) update[k] = v;
    }
    if (Object.keys(update).length === 0) return { ok: false, reason: "nothing to update" };
    const dbp = db();
    const { data: existing } = await dbp.from("shop_settings").select("id").limit(1).maybeSingle();
    if (!existing) {
      const { error } = await dbp.from("shop_settings").insert(update);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await dbp.from("shop_settings").update(update).eq("id", existing.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true, updated: Object.keys(update) };
  },
});
