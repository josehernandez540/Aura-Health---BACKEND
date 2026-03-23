import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { env } from "./src/config/env";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env.databaseUrl,
  },
  migrate: {
    adapter: async () => {
      const pool = new pg.Pool({ connectionString: env.databaseUrl });
      return new PrismaPg(pool);
    },
  },
});