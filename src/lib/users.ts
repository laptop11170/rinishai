import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: number;
  quotaLimitTokens?: number;
  quotaWindowHours?: number;
}

export async function getUsers(): Promise<User[]> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      passwordHash: true,
      createdAt: true,
      quotaLimit: true,
      quotaWindowHours: true,
    },
  });
  return users.map((u) => ({
    id: u.id,
    username: u.username,
    passwordHash: u.passwordHash,
    createdAt: u.createdAt.getTime(),
    quotaLimitTokens: u.quotaLimit ?? undefined,
    quotaWindowHours: u.quotaWindowHours ?? undefined,
  }));
}

export async function saveUsers(users: User[]): Promise<void> {
  // This is now handled by individual user operations
  // Kept for compatibility but does nothing
}

export async function createUser(username: string, password: string): Promise<User> {
  const existingUser = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUser) {
    throw new Error("Username already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      id: `user_${Date.now()}`,
      username,
      passwordHash,
    },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      createdAt: true,
      quotaLimit: true,
      quotaWindowHours: true,
    },
  });

  return {
    id: user.id,
    username: user.username,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt.getTime(),
    quotaLimitTokens: user.quotaLimit ?? undefined,
    quotaWindowHours: user.quotaWindowHours ?? undefined,
  };
}

export async function validatePassword(username: string, password: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      createdAt: true,
      quotaLimit: true,
      quotaWindowHours: true,
    },
  });
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;

  return {
    id: user.id,
    username: user.username,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt.getTime(),
    quotaLimitTokens: user.quotaLimit ?? undefined,
    quotaWindowHours: user.quotaWindowHours ?? undefined,
  };
}

export async function getUserById(id: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      createdAt: true,
      quotaLimit: true,
      quotaWindowHours: true,
    },
  });
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt.getTime(),
    quotaLimitTokens: user.quotaLimit ?? undefined,
    quotaWindowHours: user.quotaWindowHours ?? undefined,
  };
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await prisma.user.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
