import { reactive } from 'vue';
import { steamApi } from '../api';

const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps';

// 全局图片缓存 (Reactive)
// 结构: { [appid]: { header: '...', hero: '...', portrait: '...', page_bg: '...' } }
const imageCache = reactive<Record<string, any>>({});

// 正在加载的队列 (防止重复请求)
const loadingQueue = new Set<string>();

/**
 * 从 Steam 商店 URL 提取 appid
 */
export function extractSteamAppId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/store\.steampowered\.com\/app\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * 获取游戏图片数据 (核心逻辑)
 * 自动处理缓存、API 请求和兜底
 */
function useGameImages(link?: string) {
  const appid = extractSteamAppId(link || '');
  if (!appid) return null;

  // 1. 缓存命中
  if (imageCache[appid]) {
    return imageCache[appid];
  }

  // 2. 发起请求 (如果未在请求中)
  if (!loadingQueue.has(appid)) {
    loadingQueue.add(appid);
    
    steamApi.getGameInfo(appid)
      .then(res => {
        // 后端返回的数据结构: { header, hero, portrait, page_bg, ... }
        // 直接存入缓存，Vue 会自动触发更新
        imageCache[appid] = res.data;
      })
      .catch(err => {
        console.error(`[Steam] Failed to load info for ${appid}`, err);
        // 可以选择标记为失败，或者就让它保持兜底状态
      })
      .finally(() => {
        loadingQueue.delete(appid);
      });
  }

  // 3. 返回临时兜底数据 (标准 CDN 路径)
  // 这样在 API 返回前用户也能看到图 (如果 CDN 有效)
  return {
    header: `${STEAM_CDN}/${appid}/header.jpg`,
    hero: `${STEAM_CDN}/${appid}/library_hero.jpg`,
    portrait: `${STEAM_CDN}/${appid}/library_600x900.jpg`,
    page_bg: `${STEAM_CDN}/${appid}/page_bg_generated_v6b.jpg`
  };
}

/**
 * 获取游戏卡片背景样式 (Header - 横图 460x215)
 */
export function getGameCardBackground(link?: string): Record<string, string> {
  const images = useGameImages(link);
  if (!images) return {};

  return {
    backgroundImage: `url(${images.header})`, // 后端统一定义为 header, hero, portrait
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}

/**
 * 获取游戏竖版封面背景样式 (Portrait - 竖图 600x900)
 */
export function getGamePortraitBackground(link?: string): Record<string, string> {
  const images = useGameImages(link);
  if (!images) return {};

  return {
    backgroundImage: `url(${images.portrait})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}

/**
 * 获取活动标题背景样式 (Hero - 超大横幅)
 */
export function getSessionHeaderBackground(link?: string): Record<string, string> {
  const images = useGameImages(link);
  if (!images) return {};

  return {
    backgroundImage: `url(${images.hero})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}

/**
 * 获取商店页背景样式 (Page BG - 氛围大图)
 */
export function getGamePageBackground(link?: string): Record<string, string> {
  const images = useGameImages(link);
  if (!images) return {};

  return {
    backgroundImage: `url(${images.page_bg || images.background})`,
    backgroundSize: 'cover',
    backgroundPosition: 'right center',
  };
}
