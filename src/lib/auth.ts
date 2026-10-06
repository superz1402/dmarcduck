import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { db } from "./db";

const SESSION_COOKIE = "dd_session";
const SESSION_DAYS = 30;

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 11);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string) {
  const id = nanoid(40);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await db.session.create({ data: { id, userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (id) {
    await db.session.deleteMany({ where: { id } });
    jar.delete(SESSION_COOKIE);
  }
}

export async function currentUser() {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const session = await db.session.findUnique({
    where: { id },
    include: { user: { include: { subscription: true, domains: true } } },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.deleteMany({ where: { id } }).catch(() => {});
    return null;
  }
  return session.user;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 200) return "That password is suspiciously long (max 200).";
  return null;
}

export function validateDomain(name: string): string | null {
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(name)) {
    return "Enter a domain like example.com (lowercase, no protocol, no path).";
  }
  if (name.length > 253) return "Domain name is too long.";
  return null;
}
