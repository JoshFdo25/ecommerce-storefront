import { pgTable, pgEnum, uuid, varchar, text, boolean, timestamp, integer, bigint, jsonb, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum('user_role', ['guest', 'customer', 'manager', 'admin']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'shipped', 'delivered', 'cancelled']);
export const reservationStatusEnum = pgEnum('reservation_status', ['reserved', 'sold', 'released']);

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: userRoleEnum('role').default('customer'),
    isDeleted: boolean('is_deleted').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const userProfiles = pgTable('user_profiles', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    phone: varchar('phone', { length: 50 }),
    avatarUrl: varchar('avatar_url', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const categories = pgTable('categories', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).unique().notNull(),
    parentId: uuid('parent_id')
});

export const products = pgTable('products', {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id').references(() => categories.id),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    description: text('description'),
    price: bigint('price', { mode: 'number' }).notNull(), // Minor units (cents), must be >= 0
    stockQuantity: integer('stock_quantity').default(0), // Must be >= 0
    attributes: jsonb('attributes'),
    images: jsonb('images'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const cartItems = pgTable('cart_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
    quantity: integer('quantity').notNull().default(1), // Must be > 0
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
    unq: unique().on(t.userId, t.productId)
}));

export const orders = pgTable('orders', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }).unique(),
    status: orderStatusEnum('status').default('pending'),
    totalAmount: bigint('total_amount', { mode: 'number' }).notNull(), // Must be >= 0
    shippingAddress: jsonb('shipping_address').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const orderItems = pgTable('order_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
    productId: uuid('product_id').references(() => products.id),
    productNameAtPurchase: varchar('product_name_at_purchase', { length: 255 }).notNull(),
    quantity: integer('quantity').notNull(), // Must be > 0
    priceAtPurchase: bigint('price_at_purchase', { mode: 'number' }).notNull(), // Must be >= 0
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const stripeEvents = pgTable('stripe_events', {
    id: varchar('id', { length: 255 }).primaryKey(),
    type: varchar('type', { length: 255 }),
    status: varchar('status', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const inventoryReservations = pgTable('inventory_reservations', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    productId: uuid('product_id').references(() => products.id),
    quantity: integer('quantity').notNull(), // Must be > 0
    status: reservationStatusEnum('status').default('reserved'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Relations for relational queries
export const usersRelations = relations(users, ({ one, many }) => ({
    profile: one(userProfiles, {
        fields: [users.id],
        references: [userProfiles.userId]
    }),
    cartItems: many(cartItems),
    orders: many(orders),
    inventoryReservations: many(inventoryReservations),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
    user: one(users, {
        fields: [userProfiles.userId],
        references: [users.id]
    }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
    parent: one(categories, {
        fields: [categories.parentId],
        references: [categories.id],
    }),
    children: many(categories),
    products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
    category: one(categories, {
        fields: [products.categoryId],
        references: [categories.id]
    }),
    cartItems: many(cartItems),
    orderItems: many(orderItems),
    inventoryReservations: many(inventoryReservations),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
    user: one(users, {
        fields: [cartItems.userId],
        references: [users.id]
    }),
    product: one(products, {
        fields: [cartItems.productId],
        references: [products.id]
    }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
    user: one(users, {
        fields: [orders.userId],
        references: [users.id]
    }),
    items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    order: one(orders, {
        fields: [orderItems.orderId],
        references: [orders.id]
    }),
    product: one(products, {
        fields: [orderItems.productId],
        references: [products.id]
    }),
}));

export const inventoryReservationsRelations = relations(inventoryReservations, ({ one }) => ({
    user: one(users, {
        fields: [inventoryReservations.userId],
        references: [users.id]
    }),
    product: one(products, {
        fields: [inventoryReservations.productId],
        references: [products.id]
    }),
}));
