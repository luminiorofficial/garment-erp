import { describe, expect, it } from "vitest";
import { normalizeEmail } from "./normalize-email.js";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Owner@Example.COM  ")).toBe("owner@example.com");
  });
});
