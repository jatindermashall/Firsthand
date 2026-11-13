import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../db/schema.js";
import { config } from "./config.js";

export const pool = mysql.createPool({ uri: config.databaseUrl, connectionLimit: 10, timezone: "Z", dateStrings: false });
export const db = drizzle(pool, { schema, mode: "default" });
export type DB = typeof db;
export { schema };
