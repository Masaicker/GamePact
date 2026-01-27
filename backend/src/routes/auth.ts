import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { hashPassword, verifyPassword, generateToken, generateInviteCode } from '../utils/auth';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/register
 * 用户注册（需要邀请码）
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, displayName, password, inviteCode } = req.body;

    // 验证输入
    if (!username || !displayName || !password || !inviteCode) {
      return res.status(400).json({
        error: '用户名、昵称、密码和邀请码不能为空',
      });
    }

    // 密码强度校验：至少8位，包含字母和数字
    if (!password || password.length < 8) {
      return res.status(400).json({ error: '密码长度至少8位' });
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    if (!hasLetter || !hasNumber) {
      return res.status(400).json({ error: '密码必须包含字母和数字' });
    }
    // 禁止中文和非ASCII字符
    if (/[^\x00-\x7F]/.test(password)) {
      return res.status(400).json({ error: '密码不能包含中文或非法字符' });
    }
    // 禁止包含空格
    if (/\s/.test(password)) {
      return res.status(400).json({ error: '密码不能包含空格' });
    }

    // 验证邀请码
    const invitation = await prisma.invitation.findUnique({
      where: { code: inviteCode },
    });

    if (!invitation) {
      return res.status(400).json({ error: '无效的邀请码' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: '邀请码已使用或已过期' });
    }

    // 检查邀请码是否过期
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      return res.status(400).json({ error: '邀请码已过期' });
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 检查昵称是否已存在
    const existingDisplayName = await prisma.user.findFirst({
      where: { displayName },
    });

    if (existingDisplayName) {
      return res.status(400).json({ error: '昵称已被使用' });
    }

    // 哈希密码
    const passwordHash = await hashPassword(password);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        displayName,
        passwordHash,
        rp: 100, // 初始信誉点数
      },
    });

    // 标记邀请码为已使用
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'used',
        usedBy: { connect: { id: user.id } },
        usedAt: new Date(),
      },
    });

    // 生成 JWT
    const token = generateToken({
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    });

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        rp: user.rp,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    // 生成 JWT
    const token = generateToken({
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    });

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        rp: user.rp,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

/**
 * POST /api/auth/logout
 * 用户登出（客户端删除 token 即可）
 */
router.post('/logout', (req: Request, res: Response) => {
  // JWT 是无状态的，登出只需客户端删除 token
  res.json({ message: '登出成功' });
});

/**
 * GET /api/auth/me
 * 获取当前用户信息
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const { verifyToken } = require('../utils/auth');
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        rp: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ user });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(401).json({ error: '无效的令牌' });
  }
});

/**
 * POST /api/auth/change-password
 * 修改密码（需要登录）
 */
router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '旧密码和新密码不能为空' });
    }

    // 密码强度校验
    if (newPassword.length < 8) {
      return res.status(400).json({ error: '新密码长度至少8位' });
    }
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      return res.status(400).json({ error: '新密码必须包含字母和数字' });
    }
    if (/[^\x00-\x7F]/.test(newPassword)) {
      return res.status(400).json({ error: '新密码不能包含中文或非法字符' });
    }
    if (/\s/.test(newPassword)) {
      return res.status(400).json({ error: '新密码不能包含空格' });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({ error: '新密码不能与旧密码相同' });
    }

    // 获取当前用户密码哈希
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 验证旧密码
    const isValid = await verifyPassword(oldPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: '旧密码错误' });
    }

    // 更新密码
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

module.exports = router;
