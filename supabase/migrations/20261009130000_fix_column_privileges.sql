/*
# Fix column privileges for growth-features tables

1. `product_reviews.customer_phone` was readable by anon: a column-level
   REVOKE is ineffective while a table-level SELECT grant exists (Postgres
   checks the table grant first). Replace the table grant with an explicit
   per-column SELECT list — the same pattern `shop_settings` already uses.
   INSERT stays table-wide (phones must be writable) and is still bounded by
   the RLS WITH CHECK policy.

2. Grant the new `shop_settings.announcement_*` columns to anon/authenticated,
   plus the previously-missed `ai_api_url` / `ai_model` columns: the client
   selects them in SETTINGS_COLUMNS, and a single ungranted column makes the
   whole PostgREST query fail (falling back to demo settings).
*/

REVOKE ALL ON product_reviews FROM anon, authenticated;
GRANT SELECT (
  id, product_id, customer_name, rating, title, body, photos,
  is_approved, is_verified, created_at
) ON product_reviews TO anon, authenticated;
GRANT INSERT ON product_reviews TO anon, authenticated;

GRANT SELECT (
  announcement_text, announcement_text_bn, announcement_enabled,
  ai_api_url, ai_model
) ON shop_settings TO anon, authenticated;
