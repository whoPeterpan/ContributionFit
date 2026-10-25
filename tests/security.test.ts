/**
 * tests/security.test.ts — Unit tests for security utilities and open-redirect protection.
 *
 * Validates that `getSafeRedirectUrl` permits valid relative paths and rejects
 * external domains, protocol-relative URLs, schemes, backslashes, and control characters.
 */

import { describe, expect, it } from "vitest";
import { getSafeRedirectUrl } from "@/lib/security";

describe("getSafeRedirectUrl (Open Redirect Protection)", () => {
  it("allows safe internal relative paths", () => {
    expect(getSafeRedirectUrl("/saved")).toBe("/saved");
    expect(getSafeRedirectUrl("/issues/facebook/react/123")).toBe(
      "/issues/facebook/react/123"
    );
    expect(getSafeRedirectUrl("/search?q=beginner&page=2")).toBe(
      "/search?q=beginner&page=2"
    );
    expect(getSafeRedirectUrl("/")).toBe("/");
  });

  it("rejects absolute external URLs and schemes", () => {
    expect(getSafeRedirectUrl("https://malicious.com")).toBe("/");
    expect(getSafeRedirectUrl("http://evil.com/phish")).toBe("/");
    expect(getSafeRedirectUrl("javascript:alert(1)")).toBe("/");
    expect(getSafeRedirectUrl("data:text/html,<script>alert(1)</script>")).toBe(
      "/"
    );
  });

  it("rejects protocol-relative URLs (//evil.com)", () => {
    expect(getSafeRedirectUrl("//evil.com")).toBe("/");
    expect(getSafeRedirectUrl("///evil.com/saved")).toBe("/");
  });

  it("rejects backslash evasion attempts", () => {
    expect(getSafeRedirectUrl("/\\evil.com")).toBe("/");
    expect(getSafeRedirectUrl("\\\\evil.com")).toBe("/");
    expect(getSafeRedirectUrl("/path\\evil.com")).toBe("/");
  });

  it("rejects colon-in-path evasion attempts", () => {
    expect(getSafeRedirectUrl("/https://evil.com")).toBe("/");
    expect(getSafeRedirectUrl("/javascript:alert(1)")).toBe("/");
  });

  it("rejects control characters and newlines", () => {
    expect(getSafeRedirectUrl("/saved\nhttps://evil.com")).toBe("/");
    expect(getSafeRedirectUrl("/saved\r\nLocation: https://evil.com")).toBe(
      "/"
    );
    expect(getSafeRedirectUrl("/saved\x00")).toBe("/");
  });

  it("handles null, undefined, empty, or whitespace-only inputs safely", () => {
    expect(getSafeRedirectUrl(null)).toBe("/");
    expect(getSafeRedirectUrl(undefined)).toBe("/");
    expect(getSafeRedirectUrl("")).toBe("/");
    expect(getSafeRedirectUrl("   ")).toBe("/");
  });
});
