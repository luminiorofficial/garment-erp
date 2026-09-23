import * as argon2 from "argon2";

export function hashPassword(plainText: string): Promise<string> {
  return argon2.hash(plainText, { type: argon2.argon2id });
}

export async function verifyPassword(
  hash: string,
  plainText: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainText);
  } catch {
    // argon2.verify throws on a malformed/foreign hash rather than
    // returning false — treat that the same as a failed verification.
    return false;
  }
}
