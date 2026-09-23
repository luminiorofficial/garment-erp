import type { LoginInput } from "@garment-erp/validation";
import { db } from "../../db/client.js";
import { securityEvents } from "../../db/schema/index.js";
import { ApiErrors } from "../../lib/api-error.js";
import { normalizeEmail } from "../../lib/normalize-email.js";
import { verifyPassword } from "../../lib/password.js";
import { createSession, revokeSession, type SessionMeta } from "../../lib/session.js";
import { getPermissionCodesForUser, getRoleCodesForUser } from "../roles/roles.repository.js";
import { findUserByEmail, findUserById, updateUser } from "../users/users.repository.js";

export async function login(input: LoginInput, meta: SessionMeta) {
  const email = normalizeEmail(input.email);
  const [user] = await findUserByEmail(email);

  if (!user || !user.isActive) {
    await db.insert(securityEvents).values({
      eventType: "login_failure",
      emailAttempted: email,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    throw ApiErrors.invalidCredentials();
  }

  const passwordValid = await verifyPassword(user.passwordHash, input.password);

  if (!passwordValid) {
    await db.insert(securityEvents).values({
      eventType: "login_failure",
      userId: user.id,
      emailAttempted: email,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    throw ApiErrors.invalidCredentials();
  }

  const { token, expiresAt } = await createSession(user.id, meta);

  await updateUser(user.id, { lastLoginAt: new Date() });

  await db.insert(securityEvents).values({
    eventType: "login_success",
    userId: user.id,
    emailAttempted: email,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return {
    token,
    expiresAt,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  };
}

export async function logout(token: string, meta: SessionMeta, userId?: string) {
  await revokeSession(token);
  await db.insert(securityEvents).values({
    eventType: "logout",
    userId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
}

export async function getCurrentUser(userId: string) {
  const [user] = await findUserById(userId);
  if (!user) throw ApiErrors.unauthenticated();

  const [roleCodes, permissionCodes] = await Promise.all([
    getRoleCodesForUser(userId),
    getPermissionCodesForUser(userId),
  ]);

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: roleCodes,
    permissions: Array.from(permissionCodes),
  };
}
