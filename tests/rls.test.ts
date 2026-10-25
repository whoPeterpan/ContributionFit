/**
 * tests/rls.test.ts — Automated test ensuring Row Level Security (RLS) is enabled on all tables.
 *
 * This test parses all SQL migration files in `supabase/migrations/` and extracts every
 * table created in the `public` schema. It asserts that every single public table has an
 * accompanying `alter table public.<table_name> enable row level security;` directive.
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("Database Migrations Row Level Security (RLS)", () => {
  it("enforces RLS on every table defined in the public schema", () => {
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
    expect(fs.existsSync(migrationsDir)).toBe(true);

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

      // Match all create table public.<name> statements
      const createTableRegex =
        /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-zA-Z0-9_]+)/gi;
      const tables: string[] = [];
      let match: RegExpExecArray | null;

      while ((match = createTableRegex.exec(sql)) !== null) {
        tables.push(match[1].toLowerCase());
      }

      expect(tables.length).toBeGreaterThan(0);

      // Verify each table has `alter table public.<name> enable row level security`
      for (const table of tables) {
        const rlsRegex = new RegExp(
          `alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,
          "i"
        );
        const hasRls = rlsRegex.test(sql);
        expect(
          hasRls,
          `Table "public.${table}" in "${file}" must have RLS enabled via 'alter table public.${table} enable row level security;'`
        ).toBe(true);
      }
    }
  });
});
