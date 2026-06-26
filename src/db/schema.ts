import {
  pgTable,
  serial,
  varchar,
  text,
  doublePrecision,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

// スポット（犬関連施設・情報）テーブル
export const spots = pgTable("spots", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  // カテゴリ：dogrun / hospital / hotel / restaurant / petshop / adoption
  category: varchar("category", { length: 50 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  prefecture: varchar("prefecture", { length: 50 }),
  phone: varchar("phone", { length: 20 }),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  google_place_id: varchar("google_place_id", { length: 255 }),
  description: text("description"),
  // 管理者による確認済みフラグ
  is_verified: boolean("is_verified").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export type Spot = typeof spots.$inferSelect;
export type NewSpot = typeof spots.$inferInsert;
