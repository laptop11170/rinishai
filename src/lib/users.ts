import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";

// Use Railway persistent volume mount path, fallback to .data in cwd
const RAILWAY_VOLUME_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH || "";
const DATA_BASE_DIR = RAILWAY_VOLUME_PATH
  ? path.join(RAILWAY_VOLUME_PATH, ".data")
  : path.join(process.cwd(), ".data");

const DATA_DIR = path.join(DATA_BASE_DIR, "users");

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: number;
  quotaLimitTokens?: number;
  quotaWindowHours?: number;
}

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

export async function getUsers(): Promise<User[]> {
  await ensureDir();
  const filePath = path.join(DATA_DIR, "users.json");
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveUsers(users: User[]): Promise<void> {
  await ensureDir();
  const filePath = path.join(DATA_DIR, "users.json");
  await fs.writeFile(filePath, JSON.stringify(users, null, 2), "utf-8");
}

export async function createUser(username: string, password: string): Promise<User> {
  const users = await getUsers();
  const existingUser = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (existingUser) {
    throw new Error("Username already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user: User = {
    id: `user_${Date.now()}`,
    username,
    passwordHash,
    createdAt: Date.now(),
  };

  users.push(user);
  await saveUsers(users);
  return user;
}

export async function validatePassword(username: string, password: string): Promise<User | null> {
  const users = await getUsers();
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  return isValid ? user : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers();
  return users.find((u) => u.id === id) || null;
}

export async function deleteUser(id: string): Promise<boolean> {
  const users = await getUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return false;

  users.splice(index, 1);
  await saveUsers(users);
  return true;
}