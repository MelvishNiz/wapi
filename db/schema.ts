import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const phoneNumbers = sqliteTable("phone_numbers", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
});
