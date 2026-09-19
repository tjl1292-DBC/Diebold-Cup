import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import path from "node:path";
import * as schema from "./schema";

/**
 * DATABASE_URL defaults to the SQLite file the import script writes. Point it
 * at a Turso URL (libsql://...) plus DATABASE_AUTH_TOKEN to move off the
 * bundled file without changing any query code.
 */
const url = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "data", "diebold.db")}`;
const authToken = process.env.DATABASE_AUTH_TOKEN;

export const client = createClient(authToken ? { url, authToken } : { url });
export const db = drizzle(client, { schema });
export type Db = typeof db;
export { schema };
