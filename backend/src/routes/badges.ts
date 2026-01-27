import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 获取所有徽章
router.get('/', authenticateToken, async (req, res) => {
  try {
    const badges = await prisma.badge.findMany({
      orderBy: [
        { category: 'asc' },
        { rarity: 'asc' },
      ],
    });
    res.json(badges);
  } catch (error) {
    console.error('获取徽章列表失败:', error);
    res.status(500).json({ error: '获取徽章列表失败' });
  }
});

// 获取用户的徽章
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: true,
      },
      orderBy: {
        unlockedAt: 'desc',
      },
    });

    // 按类别分组
    const grouped = {
      rank: userBadges.filter(ub => ub.badge.category === 'rank').map(ub => ub.badge),
      achievement: userBadges.filter(ub => ub.badge.category === 'achievement').map(ub => ub.badge),
      behavior: userBadges.filter(ub => ub.badge.category === 'behavior').map(ub => ub.badge),
    };

    res.json(grouped);
  } catch (error) {
    console.error('获取用户徽章失败:', error);
    res.status(500).json({ error: '获取用户徽章失败' });
  }
});

// 获取用户的等级徽章（基于当前RP）
router.get('/user/:userId/rank', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const rp = user.rp;
    let rankBadge = null;

    // 根据RP查找对应的等级徽章
    const rankBadges = await prisma.badge.findMany({
      where: { category: 'rank' },
    });

    for (const badge of rankBadges) {
      const condition = JSON.parse(badge.unlockCondition);

      if (condition.minRp !== undefined && rp >= condition.minRp) {
        if (!rankBadge || condition.minRp > JSON.parse(rankBadge.unlockCondition).minRp) {
          rankBadge = badge;
        }
      } else if (condition.maxRp !== undefined && rp <= condition.maxRp) {
        rankBadge = badge;
      }
    }

    // 如果没有匹配的徽章，返回"失踪人口"徽章
    if (!rankBadge) {
      rankBadge = await prisma.badge.findUnique({
        where: { code: 'missing' },
      });
    }

    res.json(rankBadge);
  } catch (error) {
    console.error('获取用户等级徽章失败:', error);
    res.status(500).json({ error: '获取用户等级徽章失败' });
  }
});

// 解锁行为徽章（结算时调用）
router.post('/unlock-behavior', authenticateToken, async (req, res) => {
  try {
    const schema = z.object({
      userId: z.string().uuid(),
      badgeCode: z.string(),
      sessionId: z.string().uuid().optional(),
    });

    const { userId, badgeCode, sessionId } = schema.parse(req.body);

    // 检查徽章是否存在
    const badge = await prisma.badge.findUnique({
      where: { code: badgeCode },
    });

    if (!badge) {
      return res.status(404).json({ error: '徽章不存在' });
    }

    if (badge.category !== 'behavior') {
      return res.status(400).json({ error: '只能解锁行为徽章' });
    }

    // 检查是否已解锁
    const existing = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId: badge.id,
        },
      },
    });

    if (existing) {
      return res.json({ message: '徽章已解锁', badge });
    }

    // 解锁徽章
    const userBadge = await prisma.userBadge.create({
      data: {
        userId,
        badgeId: badge.id,
        sessionId,
      },
      include: {
        badge: true,
      },
    });

    res.json({ message: '徽章解锁成功', userBadge });
  } catch (error) {
    console.error('解锁行为徽章失败:', error);
    res.status(500).json({ error: '解锁行为徽章失败' });
  }
});

// 检查并解锁成就徽章（结算时调用）
router.post('/check-achievements', authenticateToken, async (req, res) => {
  try {
    const schema = z.object({
      userId: z.string().uuid(),
      sessionId: z.string().uuid(),
    });

    const { userId, sessionId } = schema.parse(req.body);

    // 获取用户的所有参与记录
    const userSessions = await prisma.sessionParticipant.findMany({
      where: { userId },
      include: {
        session: true,
      },
    });

    // 获取用户当前信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 获取所有成就徽章
    const achievementBadges = await prisma.badge.findMany({
      where: { category: 'achievement' },
    });

    const newlyUnlocked = [];

    for (const badge of achievementBadges) {
      // 检查是否已解锁
      const existing = await prisma.userBadge.findUnique({
        where: {
          userId_badgeId: {
            userId,
            badgeId: badge.id,
          },
        },
      });

      if (existing) continue;

      // 检查解锁条件
      const condition = JSON.parse(badge.unlockCondition);
      let shouldUnlock = false;

      switch (condition.type) {
        case 'consecutive_attended':
          // 连续参加次数
          const consecutive = await calculateConsecutiveAttended(userId);
          shouldUnlock = consecutive >= condition.count;
          break;

        case 'attended_sessions':
          // 累计参加次数
          const attendedCount = userSessions.filter(
            sp => sp.isPresent === true && !sp.isExcused
          ).length;
          shouldUnlock = attendedCount >= condition.count;
          break;

        case 'initiated_sessions':
          // 发起活动次数
          const initiatedCount = await prisma.session.count({
            where: { initiatorId: userId, status: 'settled' },
          });
          shouldUnlock = initiatedCount >= condition.count;
          break;

        case 'first_attended':
          // 第一次参加
          shouldUnlock = userSessions.some(sp => sp.isPresent === true);
          break;

        case 'first_initiated':
          // 第一次发起
          const initiatedAny = await prisma.session.count({
            where: { initiatorId: userId },
          });
          shouldUnlock = initiatedAny > 0;
          break;

        case 'rp_below':
          // RP跌破某个值
          shouldUnlock = user.rp < condition.threshold;
          break;

        case 'comeback':
          // 从低分回升到高分
          const allHistory = await prisma.scoreHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
          });

          // 模拟RP变化，找出历史最低值
          let currentRp = 100; // 假设初始RP为100
          let minRp = currentRp;
          for (const record of allHistory) {
            currentRp += record.scoreChange;
            if (currentRp < minRp) {
              minRp = currentRp;
            }
          }

          shouldUnlock = minRp < condition.from && user.rp >= condition.to;
          break;

        case 'caused_cancellation':
          // 导致活动流局的次数
          const cancelledSessions = await prisma.session.findMany({
            where: { status: 'cancelled' },
            include: {
              participants: {
                where: { userId, isPresent: false, isExcused: false },
              },
            },
          });
          const causedCancellation = cancelledSessions.filter(
            s => s.participants.length > 0 && s.participants.length < s.minPlayers
          ).length;
          shouldUnlock = causedCancellation >= condition.count;
          break;

        default:
          break;
      }

      if (shouldUnlock) {
        const userBadge = await prisma.userBadge.create({
          data: {
            userId,
            badgeId: badge.id,
            sessionId,
          },
          include: {
            badge: true,
          },
        });
        newlyUnlocked.push(userBadge);
      }
    }

    res.json({
      message: `检查完成，解锁 ${newlyUnlocked.length} 个新徽章`,
      newlyUnlocked,
    });
  } catch (error) {
    console.error('检查成就徽章失败:', error);
    res.status(500).json({ error: '检查成就徽章失败' });
  }
});

// 计算连续参加次数
async function calculateConsecutiveAttended(userId: string): Promise<number> {
  const sessions = await prisma.sessionParticipant.findMany({
    where: {
      userId,
      isPresent: true,
    },
    include: {
      session: {
        select: {
          startTime: true,
        },
      },
    },
    orderBy: {
      session: {
        startTime: 'desc',
      },
    },
  });

  if (sessions.length === 0) return 0;

  let consecutive = 0;
  let currentDate: Date | null = null;

  for (const sp of sessions) {
    const sessionDate = new Date(sp.session.startTime).toDateString();

    if (!currentDate) {
      currentDate = new Date(sessionDate);
      consecutive++;
    } else {
      const diffDays = Math.floor(
        (currentDate.getTime() - new Date(sessionDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays <= 1) {
        consecutive++;
        currentDate = new Date(sessionDate);
      } else {
        break;
      }
    }
  }

  return consecutive;
}

module.exports = router;
