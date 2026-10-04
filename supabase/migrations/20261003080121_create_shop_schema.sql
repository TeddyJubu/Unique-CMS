/*
# Unique Collection By Princess — E-commerce Schema

1. New Tables
- `categories` — product categories (Saree, Three-Piece, Panjabi, etc.)
- `products` — clothing products with images, sizes, colors, pricing
- `product_images` — multiple images per product
- `orders` — customer orders with COD/bKash payment
- `order_items` — individual items within an order
- `shop_settings` — shop-wide config (bkash number, whatsapp number, delivery charges)
- `admin_session` — simple owner login tracking (phone + PIN)

2. Security
- Enable RLS on all tables.
- Public (anon) can: read categories, products, product_images, shop_settings; create orders; track orders by phone.
- Owner actions (create/edit products, manage orders, settings) are done via service role from edge functions or owner panel with PIN auth.
- Use `TO anon, authenticated` since this is a no-auth storefront.
*/

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_bn text,
  slug text UNIQUE NOT NULL,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_categories" ON categories;
CREATE POLICY "public_read_categories" ON categories FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_categories" ON categories;
CREATE POLICY "public_insert_categories" ON categories FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_categories" ON categories;
CREATE POLICY "public_update_categories" ON categories FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_categories" ON categories;
CREATE POLICY "public_delete_categories" ON categories FOR DELETE
TO anon, authenticated USING (true);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  name_bn text,
  description text,
  description_bn text,
  price numeric NOT NULL DEFAULT 0,
  compare_price numeric,
  sizes text[] NOT NULL DEFAULT '{}',
  colors text[] NOT NULL DEFAULT '{}',
  stock int NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_products" ON products;
CREATE POLICY "public_read_products" ON products FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_products" ON products;
CREATE POLICY "public_insert_products" ON products FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_products" ON products;
CREATE POLICY "public_update_products" ON products FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_products" ON products;
CREATE POLICY "public_delete_products" ON products FOR DELETE
TO anon, authenticated USING (true);

-- Product Images
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_product_images" ON product_images;
CREATE POLICY "public_read_product_images" ON product_images FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_product_images" ON product_images;
CREATE POLICY "public_insert_product_images" ON product_images FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_product_images" ON product_images;
CREATE POLICY "public_update_product_images" ON product_images FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_product_images" ON product_images;
CREATE POLICY "public_delete_product_images" ON product_images FOR DELETE
TO anon, authenticated USING (true);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL DEFAULT ('UCP' || lpad(extract(epoch from now())::bigint::text, 10, '0')),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text NOT NULL,
  district text NOT NULL,
  area_type text NOT NULL DEFAULT 'inside_dhaka',
  payment_method text NOT NULL DEFAULT 'cod',
  payment_status text NOT NULL DEFAULT 'pending',
  bkash_trx_id text,
  subtotal numeric NOT NULL DEFAULT 0,
  delivery_charge numeric NOT NULL DEFAULT 60,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_orders" ON orders;
CREATE POLICY "public_read_orders" ON orders FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_orders" ON orders;
CREATE POLICY "public_insert_orders" ON orders FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_orders" ON orders;
CREATE POLICY "public_update_orders" ON orders FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_orders" ON orders;
CREATE POLICY "public_delete_orders" ON orders FOR DELETE
TO anon, authenticated USING (true);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  size text,
  color text,
  quantity int NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_order_items" ON order_items;
CREATE POLICY "public_read_order_items" ON order_items FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_order_items" ON order_items;
CREATE POLICY "public_insert_order_items" ON order_items FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_order_items" ON order_items;
CREATE POLICY "public_update_order_items" ON order_items FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_order_items" ON order_items;
CREATE POLICY "public_delete_order_items" ON order_items FOR DELETE
TO anon, authenticated USING (true);

-- Shop Settings (single row)
CREATE TABLE IF NOT EXISTS shop_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name text NOT NULL DEFAULT 'Unique Collection By Princess',
  shop_name_bn text NOT NULL DEFAULT 'ইউনিক কালেকশন বাই প্রিন্সেস',
  whatsapp_number text NOT NULL DEFAULT '+8801700000000',
  bkash_number text NOT NULL DEFAULT '01XXXXXXXXX',
  delivery_inside_dhaka numeric NOT NULL DEFAULT 60,
  delivery_outside_dhaka numeric NOT NULL DEFAULT 120,
  owner_phone text NOT NULL DEFAULT '+8801700000000',
  owner_pin text NOT NULL DEFAULT '1234',
  hero_title text NOT NULL DEFAULT 'New Season Drop',
  hero_title_bn text NOT NULL DEFAULT 'নতুন সিজন ড্রপ',
  hero_subtitle text NOT NULL DEFAULT 'Premium clothing for every occasion',
  hero_subtitle_bn text NOT NULL DEFAULT 'প্রতিটি অনুষ্ঠানের জন্য প্রিমিয়াম পোশাক',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_shop_settings" ON shop_settings;
CREATE POLICY "public_read_shop_settings" ON shop_settings FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_update_shop_settings" ON shop_settings;
CREATE POLICY "public_update_shop_settings" ON shop_settings FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

-- Insert default settings if not exists
INSERT INTO shop_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM shop_settings);

-- Insert default categories
INSERT INTO categories (name, name_bn, slug, sort_order)
SELECT 'Saree', 'শাড়ি', 'saree', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'saree');

INSERT INTO categories (name, name_bn, slug, sort_order)
SELECT 'Three-Piece', 'থ্রি-পিস', 'three-piece', 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'three-piece');

INSERT INTO categories (name, name_bn, slug, sort_order)
SELECT 'Panjabi', 'পাঞ্জাবি', 'panjabi', 3
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'panjabi');

INSERT INTO categories (name, name_bn, slug, sort_order)
SELECT 'Kurti', 'কুর্তি', 'kurti', 4
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'kurti');

INSERT INTO categories (name, name_bn, slug, sort_order)
SELECT 'Kids', 'বাচ্চাদের', 'kids', 5
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'kids');

INSERT INTO categories (name, name_bn, slug, sort_order)
SELECT 'Eid Collection', 'ঈদ কালেকশন', 'eid-collection', 6
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'eid-collection');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
