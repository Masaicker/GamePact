import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 大部分路由需要认证
router.use(authenticateToken);

/**
 * GET /api/users
 * 获取用户列表（按 RP 降序排列）
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        isAdmin: false, // 不显示管理员
        deletedAt: null, // 不显示已删除用户
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        rp: true,
        createdAt: true,
      },
      orderBy: {
        rp: 'desc', // 按 RP 降序排列
      },
    });

    res.json(users);
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

/**
 * GET /api/users/:id
 * 获取用户详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        id,
        deletedAt: null, // 不返回已删除用户
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        rp: true,
        createdAt: true,
        isAdmin: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 计算统计数据
    const totalGames = await prisma.sessionParticipant.count({
      where: {
        userId: id,
        isPresent: true,
      },
    });

    const pigeonCount = await prisma.sessionParticipant.count({
      where: {
        userId: id,
        isPresent: false,
        isExcused: false,
      },
    });

    const excuseCount = await prisma.sessionParticipant.count({
      where: {
        userId: id,
        isExcused: true,
      },
    });

    res.json({
      ...user,
      totalGames,
      pigeonCount,
      excuseCount,
    });
  } catch (error) {
    console.error('获取用户详情错误:', error);
    res.status(500).json({ error: '获取用户详情失败' });
  }
});

/**
 * GET /api/users/:id/history
 * 获取用户积分历史
 */
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const history = await prisma.scoreHistory.findMany({
      where: {
        userId: id,
        isDeleted: false, // 不包括软删除的记录
      },
      orderBy: {
        createdAt: 'desc',
      },
      // take: 50, // 只返回最近50条 - 已移除限制，前端分页
    });

    res.json(history);
  } catch (error) {
    console.error('获取积分历史错误:', error);
    res.status(500).json({ error: '获取积分历史失败' });
  }
});

module.exports = router;
