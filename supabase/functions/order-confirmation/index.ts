import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type OrderItem = {
  product_name: string;
  size: string | null;
  color: string | null;
  quantity: number;
  price: number;
};

type Order = {
  order_number: string;
  customer_name: string;
  customer_email: string;
  subtotal: number;
  discount: number;
  delivery_charge: number;
  total: number;
  coupon_code: string | null;
  area_type: string;
  payment_method: string;
  created_at: string;
  order_items: OrderItem[];
};

const Shop = { name: "Unique Collection by Princess" };

function tk(amount: number): string {
  return `Tk ${Number(amount).toLocaleString("en-US")}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderEmail(order: Order): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const name = e(order.customer_name);
  const number = e(order.order_number);

  const itemsHtml = order.order_items
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eaeaea;color:#111;font-size:14px;">
          ${e(i.product_name)}${i.size ? ` — ${e(i.size)}` : ""}${i.color ? ` · ${e(i.color)}` : ""}
          &nbsp;<span style="color:#777;">× ${i.quantity}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #eaeaea;color:#111;font-size:14px;text-align:right;white-space:nowrap;">
          ${tk(i.price * i.quantity)}
        </td>
      </tr>`
    )
    .join("");

  const discountRow =
    order.discount > 0
      ? `<tr>
          <td style="padding:6px 0;color:#666;font-size:13px;">Discount${order.coupon_code ? ` (${e(order.coupon_code)})` : ""}</td>
          <td style="padding:6px 0;color:#0a7d33;font-size:13px;text-align:right;">−${tk(order.discount)}</td>
        </tr>`
      : "";

  const subject = `Order ${number} confirmed — ${Shop.name}`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f6f6f7;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border:1px solid #eaeaea;border-radius:12px;overflow:hidden;">
        <div style="background:#111;color:#fff;padding:24px 28px;">
          <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#bbb;">${Shop.name}</p>
          <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;">Thank you, ${name}!</h1>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 4px;font-size:14px;color:#111;">
            Your order <strong>${number}</strong> is confirmed.
          </p>
          <p style="margin:0 0 20px;font-size:13px;color:#666;">
            We will call you shortly at the number you provided to confirm delivery.
          </p>

          <table style="width:100%;border-collapse:collapse;">
            ${itemsHtml}
          </table>

          <table style="width:100%;border-collapse:collapse;margin-top:16px;">
            <tr>
              <td style="padding:6px 0;color:#666;font-size:13px;">Subtotal</td>
              <td style="padding:6px 0;color:#111;font-size:13px;text-align:right;">${tk(order.subtotal)}</td>
            </tr>
            ${discountRow}
            <tr>
              <td style="padding:6px 0;color:#666;font-size:13px;">Delivery (${order.area_type === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka"})</td>
              <td style="padding:6px 0;color:#111;font-size:13px;text-align:right;">${tk(order.delivery_charge)}</td>
            </tr>
            <tr>
              <td style="padding:12px 0 0;color:#111;font-size:16px;font-weight:700;">Total</td>
              <td style="padding:12px 0 0;color:#111;font-size:16px;font-weight:700;text-align:right;">${tk(order.total)}</td>
            </tr>
          </table>

          <div style="margin-top:24px;padding:14px 16px;background:#f6f6f7;border-radius:8px;font-size:13px;color:#555;">
            <p style="margin:0 0 6px;"><strong>Payment:</strong> ${order.payment_method === "bkash" ? "bKash" : "Cash on Delivery"}</p>
            <p style="margin:0;"><strong>Order number:</strong> ${number}</p>
          </div>

          <p style="margin:24px 0 0;font-size:13px;color:#666;">
            Track your order any time on our website using your phone number.
          </p>
        </div>
        <div style="padding:18px 28px;border-top:1px solid #eaeaea;">
          <p style="margin:0;font-size:12px;color:#999;">
            You are receiving this email because you placed an order at ${Shop.name}.
          </p>
        </div>
      </div>
    </div>
  </body>
</html>`;

  const text = [
    `Thank you, ${order.customer_name}!`,
    ``,
    `Your order ${order.order_number} is confirmed.`,
    ``,
    ...order.order_items.map(
      (i) => `- ${i.product_name}${i.size ? ` (${i.size})` : ""} x${i.quantity} = ${tk(i.price * i.quantity)}`
    ),
    ``,
    `Subtotal: ${tk(order.subtotal)}`,
    ...(order.discount > 0 ? [`Discount: -${tk(order.discount)}`] : []),
    `Delivery: ${tk(order.delivery_charge)}`,
    `Total: ${tk(order.total)}`,
    `Payment: ${order.payment_method === "bkash" ? "bKash" : "Cash on Delivery"}`,
  ].join("\n");

  return { subject, html, text };
}

async function sendViaResend(apiKey: string, order: Order): Promise<{ id: string }> {
  const { subject, html, text } = renderEmail(order);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${Shop.name} <onboarding@resend.dev>`,
      to: [order.customer_email],
      subject,
      html,
      text,
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body as { message?: string } | null)?.message ?? `HTTP ${res.status}`;
    throw new Error(`resend_error: ${message}`);
  }
  return body as { id: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return json({ error: "Email is not configured yet.", configured: false }, 503);
    }

    // Validate the caller's key by using it against the database — robust to
    // legacy JWT vs new publishable key formats.
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerKey = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!callerKey) {
      return json({ error: "Unauthorized" }, 401);
    }
    {
      const { error: authErr } = await createClient(
        Deno.env.get("SUPABASE_URL")!,
        callerKey,
      ).from("shop_settings").select("id", { count: "exact", head: true });
      if (authErr) {
        return json({ error: "Unauthorized" }, 401);
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);

    // POST { order_id } — send confirmation for one order.
    if (req.method === "POST") {
      const payload = await req.json().catch(() => null);
      const orderId = (payload as { order_id?: string } | null)?.order_id;
      if (!orderId || typeof orderId !== "string" || orderId.length > 64) {
        return json({ error: "order_id is required" }, 400);
      }

      const { data: order, error } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_email, subtotal, discount, delivery_charge, total, coupon_code, area_type, payment_method, created_at, confirmation_email_sent_at, order_items(product_name, size, color, quantity, price)")
        .eq("id", orderId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!order) return json({ error: "Order not found" }, 404);
      if (!order.customer_email) return json({ error: "Order has no email address" }, 400);
      if (order.confirmation_email_sent_at) {
        return json({ ok: true, skipped: "already_sent", order_number: order.order_number });
      }

      await sendViaResend(resendKey, order as unknown as Order);

      await supabase
        .from("orders")
        .update({ confirmation_email_sent_at: new Date().toISOString() })
        .eq("id", orderId);

      return json({ ok: true, order_number: order.order_number });
    }

    // GET — retry sweep for orders placed while the key was missing/down.
    if (req.method === "GET") {
      const { data: pending, error } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_email, subtotal, discount, delivery_charge, total, coupon_code, area_type, payment_method, created_at, confirmation_email_sent_at, order_items(product_name, size, color, quantity, price)")
        .not("customer_email", "is", null)
        .is("confirmation_email_sent_at", null)
        .order("created_at", { ascending: true })
        .limit(10);

      if (error) throw new Error(error.message);

      let sent = 0;
      const failures: { order_number: string; error: string }[] = [];
      for (const order of pending ?? []) {
        try {
          await sendViaResend(resendKey, order as unknown as Order);
          await supabase
            .from("orders")
            .update({ confirmation_email_sent_at: new Date().toISOString() })
            .eq("id", order.id);
          sent++;
        } catch (err) {
          failures.push({ order_number: order.order_number, error: String(err).slice(0, 200) });
        }
      }
      return json({ ok: true, sent, failures });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("order-confirmation error:", err);
    return json({ error: "Failed to send confirmation email." }, 500);
  }
});
