import { describe, expect, it, vi } from "vitest";
import {
  isTransientDbError,
  withDbRetry,
} from "../../api/_lib/dbRetry.js";
import { withConnectionParams } from "../../api/_lib/databaseUrl.js";

function prismaError(code: string, message: string) {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

describe("isTransientDbError", () => {
  it("classifies transient Prisma codes", () => {
    expect(isTransientDbError(prismaError("P1001", "Can't reach database server"))).toBe(true);
    expect(isTransientDbError(prismaError("P1017", "Server has closed the connection"))).toBe(true);
    expect(isTransientDbError(prismaError("P2024", "Timed out fetching a connection"))).toBe(true);
  });

  it("does not retry permanent errors", () => {
    expect(isTransientDbError(prismaError("P2002", "Unique constraint failed"))).toBe(false);
    expect(isTransientDbError(prismaError("P2025", "Record not found"))).toBe(false);
    expect(isTransientDbError(null)).toBe(false);
  });

  it("classifies raw socket failures by message", () => {
    expect(isTransientDbError(new Error("db socket hang up"))).toBe(true);
    expect(isTransientDbError(new Error("ECONNRESET while reading"))).toBe(true);
  });
});

describe("withDbRetry", () => {
  it("returns the result without retrying on success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withDbRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries transient errors and recovers", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(prismaError("P1001", "Can't reach database server"))
      .mockResolvedValueOnce("recovered");
    await expect(withDbRetry(fn, { baseDelayMs: 1 })).resolves.toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry permanent errors", async () => {
    const fn = vi.fn().mockRejectedValue(prismaError("P2002", "Unique constraint failed"));
    await expect(withDbRetry(fn, { baseDelayMs: 1 })).rejects.toMatchObject({ code: "P2002" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after exhausting retries", async () => {
    const fn = vi.fn().mockRejectedValue(prismaError("P1001", "Can't reach database server"));
    await expect(withDbRetry(fn, { retries: 1, baseDelayMs: 1 })).rejects.toMatchObject({
      code: "P1001",
    });
    expect(fn).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
  });
});

describe("withConnectionParams", () => {
  it("adds pool-friendly defaults while preserving existing params", () => {
    const url =
      "postgresql://user:pass@host:6543/postgres?pgbouncer=true&sslmode=require";
    const out = new URL(withConnectionParams(url));
    expect(out.searchParams.get("connect_timeout")).toBe("15");
    expect(out.searchParams.get("pool_timeout")).toBe("15");
    expect(out.searchParams.get("connection_limit")).toBe("5");
    expect(out.searchParams.get("pgbouncer")).toBe("true");
    expect(out.searchParams.get("sslmode")).toBe("require");
  });

  it("respects caller-provided values and ignores non-postgres urls", () => {
    const out = new URL(
      withConnectionParams("postgresql://u:p@h:6543/db?connection_limit=2"),
    );
    expect(out.searchParams.get("connection_limit")).toBe("2");

    expect(withConnectionParams("mysql://u:p@h/db")).toBe("mysql://u:p@h/db");
    expect(withConnectionParams("")).toBe("");
  });
});
