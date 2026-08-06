import { config } from "dotenv";
import type { Config } from "drizzle-kit";

// drizzle-kitはNext.jsの.env.localを自動で読まないため手動でロード
config({ path: ".env.local" });

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
