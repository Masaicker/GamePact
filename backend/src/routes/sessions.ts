import { Router, Request, Response } from 'express';
import { prisma, io } from '../server';
import { authenticateToken, authenticateAdmin } from '../middleware/auth';
import {
  broadcastNotification,
  createNotificationData,
  NotificationType,
} from '../utils/notifications';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 辅助函数：从游戏选项中提取游戏名称
 * 兼容字符串数组 [{name: string, link?: string}] 和简单字符串数组
 */
function getGameName(option: string | { name: string }): string {
  return typeof option === 'string' ? option : option.name;
}

/**
 * 计算投票结果（包括平票处理）
 * @param session - 活动对象（包含参与者）
 * @returns 最终游戏索引和游戏名称
 */
function calculateVotingResult(session: any): { gameIndex: number; gameName: string } {
  const gameOptions = JSON.parse(session.gameOptions);
  const initiatorId = session.initiatorId;

  // 统计每个游戏的得票数
  const voteCounts: Record<number, number> = {};
  const initiatorVotes: Record<number, number> = {}; // 发起人给每个游戏的投票

  // 初始化
  gameOptions.forEach((_: any, index: number) => {
    voteCounts[index] = 0;
    initiatorVotes[index] = 0;
  });

  // 统计投票
  session.participants.forEach((p: any) => {
    if (p.voteRanking && !p.isExcused) {
      try {
        const ranking = JSON.parse(p.voteRanking);
        if (Array.isArray(ranking) && ranking.length > 0) {
          const votedIndex = ranking[0];
          voteCounts[votedIndex]++;

          // 记录发起人的投票
          if (p.userId === initiatorId) {
            initiatorVotes[votedIndex] = 1;
          }
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
  });

  // 找出最高票数
  const maxVotes = Math.max(...Object.values(voteCounts));

  // 找出所有获得最高票数的游戏
  const winners = Object.keys(voteCounts)
    .map(key => parseInt(key))
    .filter(index => voteCounts[index] === maxVotes);

  // 如果只有一个获胜者，直接返回
  if (winners.length === 1) {
    return {
      gameIndex: winners[0],
      gameName: getGameName(gameOptions[winners[0]]),
    };
  }

  // 平票处理：发起人的投票权重为 0.5
  // 计算加权后的票数
  const weightedCounts: Record<number, number> = {};
  gameOptions.forEach((_: any, index: number) => {
    weightedCounts[index] = voteCounts[index] + (initiatorVotes[index] ? 0.5 : 0);
  });

  // 找出加权后的最高票数
  const maxWeightedVotes = Math.max(...Object.values(weightedCounts));

  // 找出加权后的获胜者
  const weightedWinner = Object.keys(weightedCounts)
    .map(key => parseInt(key))
    .find(index => weightedCounts[index] === maxWeightedVotes);

  if (weightedWinner !== undefined) {
    return {
      gameIndex: weightedWinner,
      gameName: getGameName(gameOptions[weightedWinner]),
    };
  }

  // 如果仍然平票（理论上不应该发生），返回第一个
  return {
    gameIndex: 0,
    gameName: getGameName(gameOptions[0]),
  };
}

/**
 * GET /api/sessions
 * 获取活动列表（只返回未结算的活动）
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        status: {
          in: ['voting', 'confirmed', 'playing'],
        },
      },
      include: {
        initiator: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 解析 JSON 字符串为数组
    const sessionsWithParsedOptions = sessions.map(session => ({
      ...session,
      gameOptions: JSON.parse(session.gameOptions as string),
    }));

    res.json(sessionsWithParsedOptions);
  } catch (error) {
    console.error('获取活动列表错误:', error);
    res.status(500).json({ error: '获取活动列表失败' });
  }
});

/**
 * GET /api/sessions/history
 * 获取历史活动列表（已结算的活动）
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        status: {
          in: ['settled', 'cancelled'],
        },
      },
      include: {
        initiator: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // 解析 JSON 字符串为数组
    const sessionsWithParsedOptions = sessions.map(session => ({
      ...session,
      gameOptions: JSON.parse(session.gameOptions as string),
    }));

    res.json(sessionsWithParsedOptions);
  } catch (error) {
    console.error('获取历史活动错误:', error);
    res.status(500).json({ error: '获取历史活动失败' });
  }
});

/**
 * POST /api/sessions
 * 发起活动
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const isAdmin = (req as any).user.isAdmin;

    // 检查是否是管理员
    if (isAdmin) {
      return res.status(403).json({ error: '管理员不能发起活动' });
    }

    const { gameOptions, startTime, endVotingTime, minPlayers = 2 } = req.body;

    // 验证输入
    if (!gameOptions || !Array.isArray(gameOptions) || gameOptions.length < 1) {
      return res.status(400).json({ error: '至少需要一个游戏选项' });
    }

    if (!startTime) {
      return res.status(400).json({ error: '请选择开始时间' });
    }

    if (!endVotingTime) {
      return res.status(400).json({ error: '请设置投票截止时间' });
    }

    if (minPlayers < 2) {
      return res.status(400).json({ error: '最小成行人数不能少于2人' });
    }

    // 验证时间
    const startDate = new Date(startTime);
    const endDate = new Date(endVotingTime);

    if (endDate >= startDate) {
      return res.status(400).json({ error: '投票截止时间必须早于开始时间' });
    }

    if (endDate <= new Date()) {
      return res.status(400).json({ error: '投票截止时间必须是将来的时间' });
    }

    // 创建活动
    const session = await prisma.session.create({
      data: {
        initiatorId: userId,
        gameOptions: JSON.stringify(gameOptions), // 序列化为 JSON 字符串
        startTime: startDate,
        endVotingTime: endDate,
        minPlayers,
        status: 'voting',
      },
      include: {
        initiator: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    // 发起人自动参与
    await prisma.sessionParticipant.create({
      data: {
        sessionId: session.id,
        userId,
      },
    });

    // 发起活动 +2 分（边缘检测：同一活动只能给一次）
    const existingInitScore = await prisma.scoreHistory.findFirst({
      where: {
        sessionId: session.id,
        userId,
        reason: 'initiated',
      },
    });

    if (!existingInitScore) {
      const gameNames = gameOptions.map((opt: any) => getGameName(opt)).join('、');
      await prisma.scoreHistory.create({
        data: {
          userId,
          sessionId: session.id,
          scoreChange: 2,
          reason: 'initiated',
          description: `发起活动：${gameNames}`,
        },
      });

      // 更新用户积分
      await prisma.user.update({
        where: { id: userId },
        data: {
          rp: { increment: 2 },
        },
      });
    }

    // 发送通知
    const notification = createNotificationData(
      NotificationType.SESSION_CREATED,
      session.id,
      getGameName(gameOptions[0]),
      userId,
      session.initiator.displayName,
      `${session.initiator.displayName} 发起了新活动：${getGameName(gameOptions[0])}`
    );
    broadcastNotification(io, notification);

    res.status(201).json(session);
  } catch (error) {
    console.error('发起活动错误:', error);
    res.status(500).json({ error: '发起活动失败' });
  }
});

/**
 * GET /api/sessions/:id
 * 获取活动详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        initiator: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                rp: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: '活动不存在' });
    }

    // 解析 JSON 字符串为数组
    const sessionWithParsedOptions = {
      ...session,
      gameOptions: JSON.parse(session.gameOptions as string),
    };

    res.json(sessionWithParsedOptions);
  } catch (error) {
    console.error('获取活动详情错误:', error);
    res.status(500).json({ error: '获取活动详情失败' });
  }
});

/**
 * PUT /api/sessions/:id
 * 修改活动（仅发起人）
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { gameOptions, startTime, endVotingTime, minPlayers } = req.body;

    // 检查活动是否存在
    const session = await prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ error: '活动不存在' });
    }

    // 检查是否是发起人
    if (session.initiatorId !== userId) {
      return res.status(403).json({ error: '只有发起人可以修改活动' });
    }

    // 检查活动状态
    if (session.status !== 'voting') {
      return res.status(400).json({ error: '只能修改投票中的活动' });
    }

    // 更新活动
    const updatedSession = await prisma.session.update({
      where: { id },
      data: {
        ...(gameOptions && { gameOptions: JSON.stringify(gameOptions) }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endVotingTime && { endVotingTime: new Date(endVotingTime) }),
        ...(minPlayers && { minPlayers }),
      },
      include: {
        initiator: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    // 解析 JSON 字符串为数组
    const sessionWithParsedOptions = {
      ...updatedSession,
      gameOptions: JSON.parse(updatedSession.gameOptions as string),
    };

    res.json(sessionWithParsedOptions);
  } catch (error) {
    console.error('修改活动错误:', error);
    res.status(500).json({ error: '修改活动失败' });
  }
});

/**
 * DELETE /api/sessions/:id
 * 删除活动（仅发起人或管理员）
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const isAdmin = (req as any).user.isAdmin;
    const { id } = req.params;

    // 检查活动是否存在
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        initiator: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: '活动不存在' });
    }

    // 检查权限（发起人或管理员）
    if (session.initiatorId !== userId && !isAdmin) {
      return res.status(403).json({ error: '只有发起人或管理员可以删除活动' });
    }

    // 检查是否已经撤销过发起分了
    const existingRevert = await prisma.scoreHistory.findFirst({
      where: {
        sessionId: id,
        userId: session.initiatorId,
        reason: 'initiated_revert',
      },
    });

    // 如果有发起分记录，且还没撤销过，则撤销发起分
    if (!existingRevert) {
      const existingInitScore = await prisma.scoreHistory.findFirst({
        where: {
          sessionId: id,
          userId: session.initiatorId,
          reason: 'initiated',
        },
      });

      if (existingInitScore) {
        // 撤销发起活动 +2 分
        const gameNames = JSON.parse(session.gameOptions);
        const gameNameList = Array.isArray(gameNames) ? gameNames.map((g: any) => typeof g === 'string' ? g : g.name) : [gameNames];

        await prisma.scoreHistory.create({
          data: {
            userId: session.initiatorId,
            sessionId: id,
            scoreChange: -2,
            reason: 'initiated_revert',
            description: `删除活动撤销发起分：${gameNameList.join('、')}`,
          },
        });

        // 更新用户积分
        await prisma.user.update({
          where: { id: session.initiatorId },
          data: {
            rp: { increment: -2 },
          },
        });
      }
    }

    // 删除参与记录
    await prisma.sessionParticipant.deleteMany({
      where: { sessionId: id },
    });

    // 删除积分历史
    await prisma.scoreHistory.deleteMany({
      where: { sessionId: id },
    });

    // 删除活动
    await prisma.session.delete({
      where: { id },
    });

    // 获取当前操作用户信息（用于通知）
    const actor = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });

    // 发送通知
    const gameOptions = JSON.parse(session.gameOptions);
    const notification = createNotificationData(
      NotificationType.SESSION_DELETED,
      id,
      getGameName(gameOptions[0]),
      userId,
      actor?.displayName || '未知用户',
      `${actor?.displayName || '未知用户'} 删除了活动：${getGameName(gameOptions[0])}`
    );
    broadcastNotification(io, notification);

    res.json({ message: '活动已删除' });
  } catch (error) {
    console.error('删除活动错误:', error);
    res.status(500).json({ error: '删除活动失败' });
  }
});

/**
 * POST /api/sessions/:id/vote
 * 投票（单选模式）
 */
router.post('/:id/vote', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const isAdmin = (req as any).user.isAdmin;

    // 检查是否是管理员
    if (isAdmin) {
      return res.status(403).json({ error: '管理员不能参与活动投票' });
    }

    const { id } = req.params;
    const { gameIndex } = req.body; // 游戏索引（0-based）

    // 验证输入
    if (typeof gameIndex !== 'number' || gameIndex < 0) {
      return res.status(400).json({ error: '请选择一个游戏' });
    }

    // 检查活动是否存在
    const session = await prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ error: '活动不存在' });
    }

    // 解析游戏选项并验证索引
    const gameOptions = JSON.parse(session.gameOptions as string);
    if (gameIndex >= gameOptions.length) {
      return res.status(400).json({ error: '无效的游戏选项' });
    }

    // 检查活动状态
    if (session.status !== 'voting') {
      return res.status(400).json({ error: '投票已结束' });
    }

    // 检查投票是否截止
    if (new Date() > new Date(session.endVotingTime)) {
      return res.status(400).json({ error: '投票已截止' });
    }

    // 查找或创建参与记录
    let participant = await prisma.sessionParticipant.findUnique({
      where: {
        sessionId_userId: {
          sessionId: id,
          userId: userId,
        },
      },
    });

    if (!participant) {
      // 首次投票，创建参与记录
      participant = await prisma.sessionParticipant.create({
        data: {
          sessionId: id,
          userId,
        },
      });
    }

    // 检查是否已请假
    if (participant.isExcused) {
      return res.status(400).json({ error: '已请假，无法投票' });
    }

    // 更新投票（存储为单元素数组保持兼容性）
    await prisma.sessionParticipant.update({
      where: { id: participant.id },
      data: {
        voteRanking: JSON.stringify([gameIndex]),
        votedAt: new Date(),
      },
    });

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });

    // 发送通知
    if (user) {
      const selectedGameName = getGameName(gameOptions[gameIndex]);
      const notification = createNotificationData(
        NotificationType.SESSION_VOTED,
        session.id,
        selectedGameName,
        userId,
        user.displayName,
        `${user.displayName} 投票了：${selectedGameName}`
      );
      broadcastNotification(io, notification);
    }

    res.json({ message: '投票成功' });
  } catch (error) {
    console.error('投票错误:', error);
    res.status(500).json({ error: '投票失败' });
  }
});

/**
 * POST /api/sessions/:id/excuse
 * 请假
 */
router.post('/:id/excuse', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const isAdmin = (req as any).user.isAdmin;

    // 检查是否是管理员
    if (isAdmin) {
      return res.status(403).json({ error: '管理员不能参与活动' });
    }

    const { id } = req.params;
    const { reason } = req.body;

    // 检查活动是否存在
    const session = await prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ error: '活动不存在' });
    }

    // 检查活动状态
    if (session.status !== 'voting') {
      return res.status(400).json({ error: '活动不在投票中' });
    }

    // 检查是否是发起人（发起人不能请假）
    if (session.initiatorId === userId) {
      return res.status(403).json({ error: '发起人不能请假，如需取消活动请删除活动' });
    }

    // 计算剩余时间
    const hoursUntilStart = (new Date(session.startTime).getTime() - new Date().getTime()) / (1000 * 60 * 60);

    // 检查是否在活动开始前（不能对已开始的活动请假）
    if (hoursUntilStart <= 0) {
      return res.status(400).json({ error: '活动已开始，无法请假' });
    }

    // 判断是否超时请假（2小时内）
    const isLateExcuse = hoursUntilStart < 2;

    // 查找参与记录
    let participant = await prisma.sessionParticipant.findUnique({
      where: {
        sessionId_userId: {
          sessionId: id,
          userId: userId,
        },
      },
    });

    if (!participant) {
      return res.status(400).json({ error: '请先参与活动再请假' });
    }

    // 检查是否已请假
    if (participant.isExcused) {
      return res.status(400).json({ error: '已经请过假了' });
    }

    // 检查是否已投票
    const hasVoted = !!participant.voteRanking;

    // 已投票的用户：在2小时限制时间内不允许请假
    if (hasVoted && isLateExcuse) {
      return res.status(403).json({ error: '已投票用户在活动开始前2小时内不允许请假' });
    }

    // 计算积分变化
    const excuseText = reason || '临时有事';
    let scoreChange = 0;
    let scoreReason = 'excused';
    let description = `请假：${excuseText}`;

    if (isLateExcuse) {
      scoreChange = -2;
      scoreReason = 'late_excuse';
      description = `超时请假：${excuseText}`;
    }

    // 更新为请假状态
    await prisma.sessionParticipant.update({
      where: { id: participant.id },
      data: {
        isExcused: true,
        excusedAt: new Date(),
        excuseReason: excuseText,
      },
    });

    // 记录积分历史（仅超时请假需要记录）
    if (isLateExcuse) {
      await prisma.scoreHistory.create({
        data: {
          userId,
          sessionId: id,
          scoreChange,
          reason: scoreReason,
          description,
        },
      });

        // 更新用户积分
      await prisma.user.update({
        where: { id: userId },
        data: {
          rp: { increment: scoreChange },
        },
      });
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });

    // 解析游戏选项
    const gameOptions = JSON.parse(session.gameOptions as string);

    // 发送通知
    if (user) {
      const notification = createNotificationData(
        NotificationType.SESSION_EXCUSED,
        session.id,
        getGameName(gameOptions[0]),
        userId,
        user.displayName,
        `${user.displayName} 请假了`
      );
      broadcastNotification(io, notification);
    }

    const hasVotedMessage = hasVoted ? '（已作废投票）' : '';

    res.json({
      message: isLateExcuse
        ? `请假成功（超时请假扣2分${hasVotedMessage}）`
        : `请假成功${hasVotedMessage}`,
      scoreChange,
    });
  } catch (error) {
    console.error('请假错误:', error);
    res.status(500).json({ error: '请假失败' });
  }
});

/**
 * PUT /api/sessions/:id/settle
 * 结算活动（仅发起人）
 */
router.put('/:id/settle', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { attendances } = req.body; // [{ userId: string, isPresent: boolean }]

    // 验证输入
    if (!attendances || !Array.isArray(attendances)) {
      return res.status(400).json({ error: '请提供参与者到场情况' });
    }

    // 检查活动是否存在
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        participants: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: '活动不存在' });
    }

    // 检查是否是发起人
    if (session.initiatorId !== userId) {
      return res.status(403).json({ error: '只有发起人可以结算活动' });
    }

    // 计算投票结果（包括平票处理）
    const votingResult = calculateVotingResult(session);
    const finalGame = votingResult.gameName;

    // 检查活动状态
    if (session.status !== 'voting') {
      return res.status(400).json({ error: '只能结算投票中的活动' });
    }

    // 验证所有参与者都在 attendances 中
    const participantIds = session.participants.map(p => p.userId);
    const attendanceIds = attendances.map((a: any) => a.userId);
    const missingIds = participantIds.filter(id => !attendanceIds.includes(id));
    if (missingIds.length > 0) {
      return res.status(400).json({ error: '请为所有参与者设置到场情况' });
    }

    // 检查参与者数量 - 至少需要2人才能结算
    if (session.participants.length < 2) {
      return res.status(400).json({ error: '至少需要2名参与者才能结算活动' });
    }

    // 【关键验证】实际到场人数必须 ≥ 最低人数才能结算
    // 请假和放鸽子都是"人没来"，都不能用来满足最低人数要求
    const actualAttendees = attendances.filter(a => a.isPresent).length;

    if (actualAttendees < session.minPlayers) {
      return res.status(400).json({
        error: `实际到场只有${actualAttendees}人，不足最低人数${session.minPlayers}人，活动无法结算`
      });
    }

    // 批量更新参与者到场状态
    for (const attendance of attendances) {
      await prisma.sessionParticipant.update({
        where: {
          sessionId_userId: {
            sessionId: id,
            userId: attendance.userId,
          },
        },
        data: {
          isPresent: attendance.isPresent,
          settledBy: userId,
          settledAt: new Date(),
        },
      });
    }

    // 计算并记录积分变化
    for (const attendance of attendances) {
      const participant = session.participants.find(p => p.userId === attendance.userId);
      if (!participant) continue;

      let scoreChange = 0;
      let reason = '';
      let description = '';
      let badgeCode = '';

      if (participant.isExcused) {
        // 请假成功：0 分
        scoreChange = 0;
        reason = 'excused';
        description = `请假：${participant.excuseReason || '临时有事'}（${finalGame}）`;
        // 根据请假时间判断徽章
        const excuseTime = participant.excusedAt ? new Date(participant.excusedAt) : new Date();
        const hoursUntilStart = (new Date(session.startTime).getTime() - excuseTime.getTime()) / (1000 * 60 * 60);
        badgeCode = hoursUntilStart >= 2 ? 'excused' : 'late_excuse';
      } else if (attendance.isPresent) {
        // 到场参与：+5 分
        scoreChange = 5;
        reason = 'attended';
        description = `参与活动：${finalGame}`;
        badgeCode = 'attended';
      } else {
        // 放鸽子：-20 分
        scoreChange = -20;
        reason = 'no_show';
        description = `放鸽子：${finalGame}`;
        badgeCode = 'no_show';
      }

      // 记录积分历史
      await prisma.scoreHistory.create({
        data: {
          userId: attendance.userId,
          sessionId: id,
          scoreChange,
          reason,
          description,
        },
      });

      // 更新用户积分
      await prisma.user.update({
        where: { id: attendance.userId },
        data: {
          rp: { increment: scoreChange },
        },
      });

      // 解锁行为徽章
      if (badgeCode) {
        try {
          await fetch(`${process.env.BASE_URL}/api/badges/unlock-behavior`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.authorization || '',
            },
            body: JSON.stringify({
              userId: attendance.userId,
              badgeCode,
              sessionId: id,
            }),
          });
        } catch (badgeError) {
          console.error('解锁行为徽章失败:', badgeError);
        }
      }
    }

    // 为发起人解锁发起活动徽章
    try {
      await fetch(`${process.env.BASE_URL}/api/badges/unlock-behavior`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || '',
        },
        body: JSON.stringify({
          userId,
          badgeCode: 'initiated',
          sessionId: id,
        }),
      });
    } catch (badgeError) {
      console.error('解锁发起活动徽章失败:', badgeError);
    }

    // 为所有参与者检查成就徽章
    for (const participant of session.participants) {
      try {
        await fetch(`${process.env.BASE_URL}/api/badges/check-achievements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization || '',
          },
          body: JSON.stringify({
            userId: participant.userId,
            sessionId: id,
          }),
        });
      } catch (badgeError) {
        console.error(`检查用户 ${participant.userId} 成就徽章失败:`, badgeError);
      }
    }

    // 更新活动状态为已结算，并记录最终游戏
    await prisma.session.update({
      where: { id },
      data: {
        status: 'settled',
        finalGame,
      },
    });

    // 获取发起人信息
    const initiator = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });

    // 发送通知
    if (initiator) {
      const notification = createNotificationData(
        NotificationType.SESSION_SETTLED,
        session.id,
        finalGame,
        userId,
        initiator.displayName,
        `${initiator.displayName} 完成了活动结算：${finalGame}`
      );
      broadcastNotification(io, notification);
    }

    res.json({ message: '结算成功' });
  } catch (error) {
    console.error('结算错误:', error);
    res.status(500).json({ error: '结算失败' });
  }
});

/**
 * PUT /api/sessions/:id/cancel
 * 流局（人数不足时的特殊结算）
 */
router.put('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { attendances } = req.body; // [{ userId: string, isPresent: boolean }]

    // 验证输入
    if (!attendances || !Array.isArray(attendances)) {
      return res.status(400).json({ error: '请提供参与者到场情况' });
    }

    // 检查活动是否存在
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        participants: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: '活动不存在' });
    }

    // 检查是否是发起人
    if (session.initiatorId !== userId) {
      return res.status(403).json({ error: '只有发起人可以流局活动' });
    }

    // 计算投票结果（包括平票处理）
    const votingResult = calculateVotingResult(session);
    const finalGame = votingResult.gameName;

    // 检查活动状态
    if (session.status !== 'voting') {
      return res.status(400).json({ error: '只能流局投票中的活动' });
    }

    // 验证所有参与者都在 attendances 中
    const participantIds = session.participants.map(p => p.userId);
    const attendanceIds = attendances.map((a: any) => a.userId);
    const missingIds = participantIds.filter(id => !attendanceIds.includes(id));
    if (missingIds.length > 0) {
      return res.status(400).json({ error: '请为所有参与者设置到场情况' });
    }

    // 检查参与者数量 - 至少需要2人才能流局
    if (session.participants.length < 2) {
      return res.status(400).json({ error: '至少需要2名参与者才能流局活动' });
    }

    // 【流局不检查最低人数，因为这就是流局的原因】

    // 批量更新参与者到场状态
    for (const attendance of attendances) {
      await prisma.sessionParticipant.update({
        where: {
          sessionId_userId: {
            sessionId: id,
            userId: attendance.userId,
          },
        },
        data: {
          isPresent: attendance.isPresent,
          settledBy: userId,
          settledAt: new Date(),
        },
      });
    }

    // 计算并记录积分变化（与结算相同）
    for (const attendance of attendances) {
      const participant = session.participants.find(p => p.userId === attendance.userId);
      if (!participant) continue;

      let scoreChange = 0;
      let reason = '';
      let description = '';
      let badgeCode = '';

      if (participant.isExcused) {
        // 请假成功：0 分
        scoreChange = 0;
        reason = 'excused';
        description = `请假：${participant.excuseReason || '临时有事'}（${finalGame}）`;
        const excuseTime = participant.excusedAt ? new Date(participant.excusedAt) : new Date();
        const hoursUntilStart = (new Date(session.startTime).getTime() - excuseTime.getTime()) / (1000 * 60 * 60);
        badgeCode = hoursUntilStart >= 2 ? 'excused' : 'late_excuse';
      } else if (attendance.isPresent) {
        // 到场参与：+5 分
        scoreChange = 5;
        reason = 'attended';
        description = `参与活动：${finalGame}`;
        badgeCode = 'attended';
      } else {
        // 放鸽子：-20 分（流局也要惩罚！）
        scoreChange = -20;
        reason = 'no_show';
        description = `放鸽子：${finalGame}`;
        badgeCode = 'no_show';
      }

      // 记录积分历史
      await prisma.scoreHistory.create({
        data: {
          userId: attendance.userId,
          sessionId: id,
          scoreChange,
          reason,
          description,
        },
      });

      // 更新用户积分
      await prisma.user.update({
        where: { id: attendance.userId },
        data: {
          rp: { increment: scoreChange },
        },
      });

      // 解锁行为徽章
      if (badgeCode) {
        try {
          await fetch(`${process.env.BASE_URL}/api/badges/unlock-behavior`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.authorization || '',
            },
            body: JSON.stringify({
              userId: attendance.userId,
              badgeCode,
              sessionId: id,
            }),
          });
        } catch (badgeError) {
          console.error('解锁行为徽章失败:', badgeError);
        }
      }
    }

    // 为发起人解锁发起活动徽章
    try {
      await fetch(`${process.env.BASE_URL}/api/badges/unlock-behavior`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || '',
        },
        body: JSON.stringify({
          userId,
          badgeCode: 'initiated',
          sessionId: id,
        }),
      });
    } catch (badgeError) {
      console.error('解锁发起活动徽章失败:', badgeError);
    }

    // 为所有参与者检查成就徽章
    for (const participant of session.participants) {
      try {
        await fetch(`${process.env.BASE_URL}/api/badges/check-achievements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization || '',
          },
          body: JSON.stringify({
            userId: participant.userId,
            sessionId: id,
          }),
        });
      } catch (badgeError) {
        console.error(`检查用户 ${participant.userId} 成就徽章失败:`, badgeError);
      }
    }

    // 更新活动状态为已流局，并记录最终游戏
    await prisma.session.update({
      where: { id },
      data: {
        status: 'cancelled',
        finalGame,
      },
    });

    // 获取发起人信息
    const initiator = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });

    // 发送通知
    if (initiator) {
      const notification = createNotificationData(
        NotificationType.SESSION_SETTLED,
        session.id,
        finalGame,
        userId,
        initiator.displayName,
        `${initiator.displayName} 流局了活动：${finalGame}`
      );
      broadcastNotification(io, notification);
    }

    res.json({ message: '活动已流局' });
  } catch (error) {
    console.error('流局错误:', error);
    res.status(500).json({ error: '流局失败' });
  }
});

module.exports = router;
