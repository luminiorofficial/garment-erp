import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters");

export const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(30).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().min(1).max(30).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const assignRoleSchema = z.object({
  roleId: z.string().uuid(),
});

export type AssignRoleInput = z.infer<typeof assignRoleSchema>;

export const createRoleSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z][a-z0-9_]*$/, "code must be lowercase snake_case"),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const assignPermissionSchema = z.object({
  permissionId: z.string().uuid(),
});

export type AssignPermissionInput = z.infer<typeof assignPermissionSchema>;
