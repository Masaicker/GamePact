import { Router } from 'express';

const router = Router();

const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

// 兜底数据常量（前后端复用）
const getDefaultImages = (appid: string) => ({
  header: `${STEAM_CDN}/${appid}/header.jpg`,
  hero: `${STEAM_CDN}/${appid}/library_hero.jpg`,
  portrait: `${STEAM_CDN}/${appid}/library_600x900.jpg`,
  page_bg: `${STEAM_CDN}/${appid}/page_bg_generated_v6b.jpg`,
});

// 简单内存缓存
// Key: appid, Value: { data: any, expire: number }
const cache = new Map<string, { data: any; expire: number }>();

// 定时清理过期缓存（每小时执行一次）
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of cache) {
    if (now > val.expire) {
      cache.delete(key);
    }
  }
}, 60 * 60 * 1000);

// 辅助函数：检测 URL 是否有效 (HEAD 请求)
async function isValidUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

router.get('/game/:appid', async (req, res) => {
  const { appid } = req.params;

  if (!appid || !/^\d+$/.test(appid)) {
    return res.status(400).json({ error: 'Invalid App ID' });
  }

  // 1. 检查缓存
  const cached = cache.get(appid);
  if (cached && Date.now() < cached.expire) {
    return res.json(cached.data);
  }

  // 2. 请求 Steam API
  try {
    const steamUrl = `https://store.steampowered.com/api/appdetails?appids=${appid}`;
    const response = await fetch(steamUrl);

    if (!response.ok) {
      throw new Error(`Steam API responded with ${response.status}`);
    }

    const data: any = await response.json();

    // 检查数据有效性
    if (data && data[appid] && data[appid].success) {
      const gameData = data[appid].data;

      // 3. 构建并验证高清图
      const potentialHero = `${STEAM_CDN}/${appid}/library_hero.jpg`;
      const potentialPortrait = `${STEAM_CDN}/${appid}/library_600x900.jpg`;

      // 并行验证
      const [hasHero, hasPortrait] = await Promise.all([
        isValidUrl(potentialHero),
        isValidUrl(potentialPortrait)
      ]);

      const result = {
        name: gameData.name,
        header: gameData.header_image,
        hero: hasHero ? potentialHero : gameData.header_image,
        portrait: hasPortrait ? potentialPortrait : gameData.header_image,
        page_bg: gameData.background_raw || gameData.background
      };

      // 4. 写入缓存（O(1) 操作）
      cache.set(appid, { data: result, expire: Date.now() + CACHE_DURATION });

      return res.json(result);
    } else {
      return res.status(404).json({ error: 'Game not found on Steam' });
    }
  } catch (error: any) {
    // 区分网络错误和其他错误，简化日志
    if (error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.code === 'UND_ERR_SOCKET' || error.message?.includes('fetch failed')) {
      console.warn(`[Steam] Network error fetching app ${appid}: ${error.code || error.message} (Using fallback)`);
    } else {
      console.error(`[Steam] Unexpected error fetching ${appid}:`, error);
    }

    // 降级策略：返回标准 CDN 路径
    const fallbackResult = {
      name: 'Unknown Game',
      ...getDefaultImages(appid)
    };

    // 缓存失败结果 5 分钟，避免频繁重试
    cache.set(appid, {
      data: fallbackResult,
      expire: Date.now() + 5 * 60 * 1000
    });

    return res.json(fallbackResult);
  }
});

export default router;
