/**
 * tests/auth.test.ts — Unit tests for authentication policies, client configuration, and protected routes.
 *
 * Verifies that the SQL migration sets up comprehensive per-user RLS policies on saved_issues
 * and that server-only tables have RLS enabled with zero client policies.
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { config as proxyConfig } from "@/middleware";

describe("Authentication & RLS Policy Configuration", () => {
  const migrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "001_init.sql"
  );
  const migrationSql = fs.readFileSync(migrationPath, "utf8");

  it("defines all four per-user CRUD policies on saved_issues", () => {
    // 1. SELECT policy
    expect(migrationSql).toMatch(
      /create\s+policy\s+"saved_issues_select_own"\s+on\s+public\.saved_issues\s+for\s+select\s+to\s+authenticated\s+using\s*\(\s*user_id\s*=\s*\(\s*select\s+auth\.uid\(\)\s*\)\s*\)/i
    );

    // 2. INSERT policy
    expect(migrationSql).toMatch(
      /create\s+policy\s+"saved_issues_insert_own"\s+on\s+public\.saved_issues\s+for\s+insert\s+to\s+authenticated\s+with\s+check\s*\(\s*user_id\s*=\s*\(\s*select\s+auth\.uid\(\)\s*\)\s*\)/i
    );

    // 3. UPDATE policy
    expect(migrationSql).toMatch(
      /create\s+policy\s+"saved_issues_update_own"\s+on\s+public\.saved_issues\s+for\s+update\s+to\s+authenticated\s+using\s*\(\s*user_id\s*=\s*\(\s*select\s+auth\.uid\(\)\s*\)\s*\)\s+with\s+check\s*\(\s*user_id\s*=\s*\(\s*select\s+auth\.uid\(\)\s*\)\s*\)/i
    );

    // 4. DELETE policy
    expect(migrationSql).toMatch(
      /create\s+policy\s+"saved_issues_delete_own"\s+on\s+public\.saved_issues\s+for\s+delete\s+to\s+authenticated\s+using\s*\(\s*user_id\s*=\s*\(\s*select\s+auth\.uid\(\)\s*\)\s*\)/i
    );
  });

  it("ensures issue_summaries and newsletter_subscribers have RLS enabled with NO client policies", () => {
    expect(migrationSql).toMatch(
      /alter\s+table\s+public\.issue_summaries\s+enable\s+row\s+level\s+security;/i
    );
    expect(migrationSql).toMatch(
      /alter\s+table\s+public\.newsletter_subscribers\s+enable\s+row\s+level\s+security;/i
    );

    // Assert that no policies exist for issue_summaries or newsletter_subscribers
    expect(migrationSql).not.toMatch(
      /create\s+policy\s+["\w]+\s+on\s+public\.issue_summaries/i
    );
    expect(migrationSql).not.toMatch(
      /create\s+policy\s+["\w]+\s+on\s+public\.newsletter_subscribers/i
    );
  });

  it("configures proxy matcher to exclude static assets", () => {
    expect(proxyConfig.matcher).toBeDefined();
    expect(proxyConfig.matcher.length).toBeGreaterThan(0);
    const pattern = proxyConfig.matcher[0];
    expect(pattern).toContain("_next/static");
    expect(pattern).toContain("_next/image");
    expect(pattern).toContain("favicon.ico");
  });
});
