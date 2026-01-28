import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 所有路由需要认证
router.use(authenticateToken);

/**
 * GET /api/preset-games
 * 获取预设游戏列表（支持搜索）
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    const where = search
      ? {
          name: {
            contains: search as string,
          },
        }
      : {};

    const games = await prisma.presetGame.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
    });

    res.json(games);
  } catch (error) {
    console.error('获取预设游戏列表错误:', error);
    res.status(500).json({ error: '获取预设游戏列表失败' });
  }
});

/**
 * POST /api/preset-games
 * 创建预设游戏（仅管理员）
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const isAdmin = (req as any).user.isAdmin;

    if (!isAdmin) {
      return res.status(403).json({ error: '只有管理员可以创建预设游戏' });
    }

    const { name, link } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: '游戏名称不能为空' });
    }

    const game = await prisma.presetGame.create({
      data: {
        name: name.trim(),
        link: link?.trim() || null,
      },
    });

    res.status(201).json(game);
  } catch (error) {
    console.error('创建预设游戏错误:', error);
    res.status(500).json({ error: '创建预设游戏失败' });
  }
});

/**
 * PUT /api/preset-games/:id
 * 修改预设游戏（仅管理员）
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const isAdmin = (req as any).user.isAdmin;

    if (!isAdmin) {
      return res.status(403).json({ error: '只有管理员可以修改预设游戏' });
    }

    const { id } = req.params;
    const { name, link } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: '游戏名称不能为空' });
    }

    const game = await prisma.presetGame.update({
      where: { id },
      data: {
        name: name.trim(),
        link: link?.trim() || null,
      },
    });

    res.json(game);
  } catch (error) {
    console.error('修改预设游戏错误:', error);
    res.status(500).json({ error: '修改预设游戏失败' });
  }
});

/**
 * DELETE /api/preset-games/:id
 * 删除预设游戏（仅管理员）
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const isAdmin = (req as any).user.isAdmin;

    if (!isAdmin) {
      return res.status(403).json({ error: '只有管理员可以删除预设游戏' });
    }

    const { id } = req.params;

    await prisma.presetGame.delete({
      where: { id },
    });

    res.json({ message: '预设游戏已删除' });
  } catch (error) {
    console.error('删除预设游戏错误:', error);
    res.status(500).json({ error: '删除预设游戏失败' });
  }
});

/**
 * POST /api/preset-games/import
 * 批量导入预设游戏（仅管理员）
 */
router.post('/import', async (req: Request, res: Response) => {
  try {
    const isAdmin = (req as any).user.isAdmin;

    if (!isAdmin) {
      return res.status(403).json({ error: '只有管理员可以导入预设游戏' });
    }

    const { games } = req.body;

    if (!Array.isArray(games)) {
      return res.status(400).json({ error: '导入数据格式错误' });
    }

    const results = [];
    const errors = [];

    for (const game of games) {
      try {
        if (!game.name || game.name.trim() === '') {
          errors.push({ game, error: '游戏名称不能为空' });
          continue;
        }

        const created = await prisma.presetGame.create({
          data: {
            name: game.name.trim(),
            link: game.link?.trim() || null,
          },
        });

        results.push(created);
      } catch (error) {
        errors.push({ game, error: '创建失败' });
      }
    }

    res.json({
      message: `成功导入 ${results.length} 个游戏`,
      imported: results.length,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    console.error('导入预设游戏错误:', error);
    res.status(500).json({ error: '导入预设游戏失败' });
  }
});

module.exports = router;
