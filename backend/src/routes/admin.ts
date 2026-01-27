import { Router, Request, Response } from 'express';
import { prisma, io } from '../server';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { hashPassword } from '../utils/auth';
import { randomBytes } from 'crypto';

const router = Router();

// 所有管理员路由需要认证和管理员权限
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/admin/invites
 * 获取邀请码列表
 */
router.get('/invites', async (req: Request, res: Response) => {
  try {
    // 自动清理：将所有已过期但状态仍为 pending 的邀请码标记为 expired
    await prisma.invitation.updateMany({
      where: {
        status: 'pending',
        expiresAt: {
          lt: new Date(), // 小于当前时间
        },
      },
      data: {
        status: 'expired',
      },
    });

    const invitations = await prisma.invitation.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        usedBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(invitations);
  } catch (error) {
    console.error('获取邀请码列表错误:', error);
    res.status(500).json({ error: '获取邀请码列表失败' });
  }
});

/**
 * POST /api/admin/invites
 * 生成邀请码
 * body: { count?: number, expiresIn?: number } count是生成数量，expiresIn是过期天数
 */
router.post('/invites', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { count = 1, expiresIn = 30 } = req.body; // 默认生成1个，30天过期

    if (count < 1 || count > 100) {
      return res.status(400).json({ error: '生成数量必须在1-100之间' });
    }

    // 允许 0 作为测试用例（30秒过期）
    if (expiresIn < 0 || expiresIn > 365) {
      return res.status(400).json({ error: '过期时间必须在0-365天之间' });
    }

    const invitations = [];
    const expiresAt = new Date();
    
    if (expiresIn === 0) {
      // 测试模式：30秒后过期
      expiresAt.setSeconds(expiresAt.getSeconds() + 30);
    } else {
      expiresAt.setDate(expiresAt.getDate() + expiresIn);
    }

    for (let i = 0; i < count; i++) {
      // 生成12位随机邀请码
      const code = randomBytes(6).toString('base64').replace(/[+/=]/g, '').substring(0, 12);

      const invitation = await prisma.invitation.create({
        data: {
          code,
          status: 'pending',
          createdById: userId,
          expiresAt,
        },
      });

      invitations.push(invitation);
    }

    res.status(201).json({
      message: `成功生成 ${count} 个邀请码`,
      invitations,
    });
  } catch (error) {
    console.error('生成邀请码错误:', error);
    res.status(500).json({ error: '生成邀请码失败' });
  }
});

/**
 * DELETE /api/admin/invites/:id
 * 删除邀请码（软删除，标记为expired）
 */
router.delete('/invites/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invitation = await prisma.invitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return res.status(404).json({ error: '邀请码不存在' });
    }

    if (invitation.status === 'used') {
      return res.status(400).json({ error: '已使用的邀请码不能删除' });
    }

    await prisma.invitation.update({
      where: { id },
      data: {
        status: 'deleted',
      },
    });

    res.json({ message: '邀请码已删除' });
  } catch (error) {
    console.error('删除邀请码错误:', error);
    res.status(500).json({ error: '删除邀请码失败' });
  }
});

/**
 * POST /api/admin/users/:id/score
 * 调整用户积分
 * body: { scoreChange: number, reason: string }
 */
router.post('/users/:id/score', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.id;
    const { id } = req.params;
    const { scoreChange, reason } = req.body;

    if (!scoreChange || scoreChange === 0) {
      return res.status(400).json({ error: '积分变化不能为0' });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: '请填写调整原因' });
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 记录积分历史
    await prisma.scoreHistory.create({
      data: {
        userId: id,
        scoreChange,
        reason: 'admin_adjust',
        description: `管理员调整：${reason}`,
      },
    });

    // 更新用户积分
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        rp: { increment: scoreChange },
      },
    });

    // 记录审计日志
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'adjust_score',
        targetType: 'user',
        targetId: id,
        details: JSON.stringify({
          scoreChange,
          reason,
          oldRp: user.rp,
          newRp: updatedUser.rp,
        }),
      },
    });

    res.json({
      message: '积分调整成功',
      user: updatedUser,
    });
  } catch (error) {
    console.error('调整积分错误:', error);
    res.status(500).json({ error: '调整积分失败' });
  }
});

/**
 * GET /api/admin/audit
 * 获取审计日志
 */
router.get('/audit', async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const logs = await prisma.adminAuditLog.findMany({
      include: {
        // 这里可以扩展包含更多关联信息
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Number(limit),
      skip: Number(offset),
    });

    res.json(logs);
  } catch (error) {
    console.error('获取审计日志错误:', error);
    res.status(500).json({ error: '获取审计日志失败' });
  }
});

/**
 * DELETE /api/admin/score-history/:id
 * 软删除积分记录
 */
router.delete('/score-history/:id', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.id;
    const { id } = req.params;

    const record = await prisma.scoreHistory.findUnique({
      where: { id },
    });

    if (!record) {
      return res.status(404).json({ error: '积分记录不存在' });
    }

    if (record.isDeleted) {
      return res.status(400).json({ error: '该记录已被删除' });
    }

    await prisma.scoreHistory.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: adminId,
        deletedAt: new Date(),
      },
    });

    // 如果是管理员调整的记录，需要回退积分变化
    if (record.reason === 'admin_adjust') {
      await prisma.user.update({
        where: { id: record.userId },
        data: {
          rp: { decrement: record.scoreChange },
        },
      });
    }

    // 记录审计日志（不包含敏感信息）
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'delete_record',
        targetType: 'score_history',
        targetId: id,
        details: JSON.stringify({
          recordType: 'score_history',
        }),
      },
    });

    res.json({ message: '积分记录已删除' });
  } catch (error) {
    console.error('删除积分记录错误:', error);
    res.status(500).json({ error: '删除积分记录失败' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * 删除用户（软删除）
 */
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.id;
    const { id } = req.params;

    // 不允许删除自己
    if (id === adminId) {
      return res.status(400).json({ error: '不能删除自己' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 软删除用户（设置 deletedAt 标记）
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // 记录审计日志（不包含敏感信息）
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'delete_user',
        targetType: 'user',
        targetId: id,
        details: JSON.stringify({
          recordType: 'user',
        }),
      },
    });

    res.json({ message: '用户已删除' });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

/**
 * GET /api/admin/export
 * 导出数据备份
 * query: { range: 'all' | '30days' | 'custom', startDate?: string, endDate?: string }
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { range = 'all', startDate, endDate } = req.query;

    let dateFilter: any = {};
    const now = new Date();

    if (range === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      dateFilter = {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      };
    } else if (range === 'custom' && startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(String(startDate)),
          lte: new Date(String(endDate)),
        },
      };
    }

    // 并行获取数据
    const [users, sessions, scoreHistory, userBadges, invitations] = await Promise.all([
      // 用户数据（始终导出所有用户，不带敏感信息）
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          displayName: true,
          rp: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      }),
      // 活动数据（应用时间过滤）
      prisma.session.findMany({
        where: dateFilter,
        include: {
          participants: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      // 积分变动记录（应用时间过滤）
      prisma.scoreHistory.findMany({
        where: dateFilter,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      // 用户徽章（应用时间过滤）
      prisma.userBadge.findMany({
        where: {
          unlockedAt: dateFilter.createdAt, // 使用相同的过滤逻辑
        },
      }),
      // 邀请码（始终导出所有）
      prisma.invitation.findMany(),
    ]);

    const exportData = {
      meta: {
        exportedAt: now,
        range,
        adminId: (req as any).user.id,
      },
      users,
      sessions,
      scoreHistory,
      userBadges,
      invitations,
    };

    res.json(exportData);
  } catch (error) {
    console.error('导出数据错误:', error);
    res.status(500).json({ error: '导出数据失败' });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * 重置用户密码（管理员）
 * body: { newPassword: string }
 */
router.post('/users/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.id;
    const { id } = req.params;
    const { newPassword } = req.body;

    // 密码强度校验
    if (!newPassword || newPassword.length < 8) {
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

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 更新密码
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    // 记录审计日志
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'reset_password',
        targetType: 'user',
        targetId: id,
        details: JSON.stringify({
          message: 'Admin reset password',
        }),
      },
    });

    res.json({ message: '密码重置成功' });
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({ error: '重置密码失败' });
  }
});

module.exports = router;
