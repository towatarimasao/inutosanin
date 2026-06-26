import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// NeonのHTTPドライバーを使用（Edge Runtime対応）
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
