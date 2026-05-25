import { describe, expect, it } from "vitest";
import { signUpSchema, displayNameSchema } from "./schemas";

describe("auth schemas", () => {
  it("accepts valid sign-up input", () => {
    const result = signUpSchema.safeParse({
      email: "player@example.com",
      password: "password123",
      username: "player_one",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short usernames", () => {
    const result = signUpSchema.safeParse({
      email: "player@example.com",
      password: "password123",
      username: "ab",
    });
    expect(result.success).toBe(false);
  });

  it("validates guest display names", () => {
    expect(displayNameSchema.safeParse("Ace").success).toBe(true);
    expect(displayNameSchema.safeParse("").success).toBe(false);
  });
});
