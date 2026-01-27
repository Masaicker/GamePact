import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gamepact-dev-secret-key-2024';
const SALT_ROUNDS = 10;

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 验证密码
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 生成 JWT Token
 */
export function generateToken(payload: {
  id: string;
  username: string;
  isAdmin: boolean;
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

/**
 * 验证 JWT Token
 */
export function verifyToken(token: string): {
  id: string;
  username: string;
  isAdmin: boolean;
} {
  return jwt.verify(token, JWT_SECRET) as {
    id: string;
    username: string;
    isAdmin: boolean;
  };
}

/**
 * 生成随机邀请码
 */
export function generateInviteCode(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
