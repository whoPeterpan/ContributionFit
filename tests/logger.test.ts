import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/logger";

describe("lib/logger", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts sensitive fields like token, secret, password", () => {
    logger.info("auth_attempt", {
      route: "/api/login",
      token: "secret123",
      password: "my-password",
      email: "user@example.com",
    });

    expect(consoleLogSpy).toHaveBeenCalled();
    const loggedMessage = String(consoleLogSpy.mock.calls[0]?.[0]);
    expect(loggedMessage).toContain("[REDACTED]");
    expect(loggedMessage).not.toContain("secret123");
    expect(loggedMessage).not.toContain("my-password");
  });

  it("logs errors via console.error", () => {
    logger.error("system_error", { status: "500" });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
