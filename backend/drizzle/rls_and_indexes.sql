-- ==============================================================================
-- PHASE 2: ROW-LEVEL SECURITY & FOREIGN KEY INDEXES
-- Execute this script in the Supabase SQL Editor AFTER running 'drizzle-kit push'
-- ==============================================================================

-- 1. Foreign Key Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- 2. Enable Row-Level Security on all sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. PRODUCTS POLICIES
-- ==========================================
-- Public can view active products
CREATE POLICY "Public can view active products" 
ON products FOR SELECT 
USING (is_active = true);

-- Managers and Admins can manage all products
CREATE POLICY "Managers and Admins can manage products" 
ON products FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
);

-- ==========================================
-- 4. USERS (AUTH) POLICIES
-- ==========================================
-- Customers can only SELECT their own row to prevent privilege escalation
CREATE POLICY "Users can view own auth data" 
ON users FOR SELECT 
USING (id = auth.uid());

-- Admins have full access to all users
CREATE POLICY "Admins have full access to users" 
ON users FOR ALL 
USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ==========================================
-- 5. USER PROFILES POLICIES
-- ==========================================
-- Users can read/update their own profile data
CREATE POLICY "Users can manage own profile" 
ON user_profiles FOR ALL 
USING (user_id = auth.uid());

-- Admins have full access to user profiles
CREATE POLICY "Admins have full access to user profiles" 
ON user_profiles FOR ALL 
USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ==========================================
-- 6. CART ITEMS POLICIES
-- ==========================================
-- Users can only see and modify their own cart
CREATE POLICY "Users can manage own cart" 
ON cart_items FOR ALL 
USING (user_id = auth.uid());

-- ==========================================
-- 7. ORDERS POLICIES
-- ==========================================
-- Users can view their own orders
CREATE POLICY "Users can view own orders" 
ON orders FOR SELECT 
USING (user_id = auth.uid());

-- Users can insert their own orders
CREATE POLICY "Users can insert own orders" 
ON orders FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Managers can view/update all orders
CREATE POLICY "Managers can manage all orders" 
ON orders FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
);

-- ==========================================
-- 8. ORDER ITEMS POLICIES
-- ==========================================
-- Users can view items belonging to their own orders
CREATE POLICY "Users can view own order items" 
ON order_items FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
);

-- Users can insert items into their own orders
CREATE POLICY "Users can insert own order items" 
ON order_items FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
);

-- Managers can manage all order items
CREATE POLICY "Managers can manage all order items" 
ON order_items FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
);
