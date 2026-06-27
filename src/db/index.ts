import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

// ビルド時はDATABASE_URLが未定義のためneon()を呼ばない
// force-dynamicページはビルド時に実行されないため、dbがnullになることはない
export const db = connectionString
  ? drizzle(neon(connectionString), { schema })
  : (null as unknown as ReturnType<typeof drizzle<typeof schema>>);
