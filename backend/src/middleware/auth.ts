import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../server';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        isAdmin: boolean;
      };
    }
  }
}

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'gamepact-dev-secret-key-2024';

/**
 * 验证 JWT Token 中间件
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 从 Authorization header 获取 token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    // 验证 token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      username: string;
      isAdmin: boolean;
    };

    // 查询用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, isAdmin: true },
    });

    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    // 将用户信息附加到请求对象
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: '令牌已过期' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: '无效的令牌' });
    }
    return res.status(500).json({ error: '认证失败' });
  }
};

/**
 * 验证管理员权限中间件
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: '未认证' });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }

  next();
};

/**
 * 可选的认证中间件（不强制要求 token）
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        username: string;
        isAdmin: boolean;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, username: true, isAdmin: true },
      });

      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // 静默失败，继续处理请求
    next();
  }
};
