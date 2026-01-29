import { Router } from 'express';

const router = Router();

// 简单内存缓存
// Key: appid, Value: { data: any, timestamp: number }
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7天

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
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    // console.log(`[Steam] Cache hit for ${appid}`);
    return res.json(cached.data);
  }

  // 2. 请求 Steam API
  try {
    // console.log(`[Steam] Fetching ${appid} from Steam API...`);
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
      // 尝试构建高清图 (使用旧 CDN 规则，但我们会验证它)
      const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps';
      const potentialHero = `${STEAM_CDN}/${appid}/library_hero.jpg`;
      const potentialPortrait = `${STEAM_CDN}/${appid}/library_600x900.jpg`;

      // 并行验证 (这是后端做验证的关键步骤)
      const [hasHero, hasPortrait] = await Promise.all([
        isValidUrl(potentialHero),
        isValidUrl(potentialPortrait)
      ]);
      
      const result = {
        name: gameData.name,
        // 基础图 (API 保证存在)
        header: gameData.header_image,
        
        // 高清图 (带自动兜底)
        // 如果有 hero 就用 hero，没有就用 header 兜底
        hero: hasHero ? potentialHero : gameData.header_image,
        
        // 竖版图 (带自动兜底)
        // 如果有 portrait 就用 portrait，没有就用 header 兜底
        portrait: hasPortrait ? potentialPortrait : gameData.header_image,
        
        // 背景图
        page_bg: gameData.background_raw || gameData.background
      };

      // 4. 写入缓存
      cache.set(appid, { data: result, timestamp: Date.now() });

      // 5. 清理过期缓存（每次写入时都清理）
      const now = Date.now();
      for (const [key, val] of cache) {
        if (now - val.timestamp > CACHE_DURATION) {
          cache.delete(key);
        }
      }

      return res.json(result);
    } else {
      return res.status(404).json({ error: 'Game not found on Steam' });
    }
  } catch (error) {
    console.error(`[Steam] Error fetching ${appid}:`, error);
    
    // 降级策略：网络错误时，返回标准 CDN 路径兜底
    // 这样即使服务器连不上 Steam，前端用户如果能连上 CDN 依然能看图
    const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps';
    const fallbackResult = {
      name: 'Unknown Game', // 前端通常已经有名字了，这个可能用不上
      header: `${STEAM_CDN}/${appid}/header.jpg`,
      hero: `${STEAM_CDN}/${appid}/library_hero.jpg`,
      portrait: `${STEAM_CDN}/${appid}/library_600x900.jpg`,
      page_bg: `${STEAM_CDN}/${appid}/page_bg_generated_v6b.jpg`
    };
    
    // 缓存失败结果 5 分钟，避免频繁重试超时请求
    cache.set(appid, {
      data: fallbackResult,
      timestamp: Date.now() - CACHE_DURATION + 5 * 60 * 1000
    });

    return res.json(fallbackResult);
  }
});

export default router;
