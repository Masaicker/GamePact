import { reactive } from 'vue';
import { steamApi } from '../api';

const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps';

// 兜底数据常量（与后端保持一致）
const getDefaultImages = (appid: string) => ({
  header: `${STEAM_CDN}/${appid}/header.jpg`,
  hero: `${STEAM_CDN}/${appid}/library_hero.jpg`,
  portrait: `${STEAM_CDN}/${appid}/library_600x900.jpg`,
  page_bg: `${STEAM_CDN}/${appid}/page_bg_generated_v6b.jpg`,
});

// 全局图片缓存 (Reactive)
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
 * 获取游戏图片数据
 * 数据流：默认值 → 异步更新 → Vue 自动触发 UI 更新
 */
function getGameImages(link?: string) {
  const appid = extractSteamAppId(link || '');
  if (!appid) return null;

  // 1. 缓存命中 → 直接返回
  if (imageCache[appid]) {
    return imageCache[appid];
  }

  // 2. 缓存未命中 → 立即设置默认值
  imageCache[appid] = getDefaultImages(appid);

  // 3. 异步获取真实数据并更新缓存
  if (!loadingQueue.has(appid)) {
    loadingQueue.add(appid);

    steamApi.getGameInfo(appid)
      .then(res => {
        imageCache[appid] = res.data; // Vue 自动触发 UI 更新
      })
      .catch(err => {
        console.error(`[Steam] Failed to load info for ${appid}`, err);
        // 保持默认值不变
      })
      .finally(() => {
        loadingQueue.delete(appid);
      });
  }

  // 4. 立即返回默认值（UI 不用等待）
  return imageCache[appid];
}

/**
 * 获取游戏卡片背景样式 (Header - 横图 460x215)
 */
export function getGameCardBackground(link?: string, manualImages?: string[]): Record<string, string> {
  // 1. 如果是 Steam 游戏，优先使用 Steam 图片
  const images = getGameImages(link);
  if (images) {
    return {
      backgroundImage: `url(${images.header})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  // 2. 否则使用手动图片 (Index 0: Header)
  if (manualImages && manualImages.length > 0 && manualImages[0]) {
    return {
      backgroundImage: `url(${manualImages[0]})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  return {};
}

/**
 * 获取游戏竖版封面背景样式 (Portrait - 竖图 600x900)
 */
export function getGamePortraitBackground(link?: string, manualImages?: string[]): Record<string, string> {
  // 1. 如果是 Steam 游戏，优先使用 Steam 图片
  const images = getGameImages(link);
  if (images) {
    return {
      backgroundImage: `url(${images.portrait})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  // 2. 否则使用手动图片 (Index 1: Portrait)
  if (manualImages && manualImages.length > 0) {
    // 优先用 index 1，没有则 fallback 到 index 0
    const url = manualImages[1] || manualImages[0];
    if (url) {
      return {
        backgroundImage: `url(${url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
  }

  return {};
}

/**
 * 获取活动标题背景样式 (Hero - 超大横幅)
 */
export function getSessionHeaderBackground(link?: string, manualImages?: string[]): Record<string, string> {
  // 1. 如果是 Steam 游戏，优先使用 Steam 图片
  const images = getGameImages(link);
  if (images) {
    return {
      backgroundImage: `url(${images.hero})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  // 2. 否则使用手动图片 (Index 2: Hero/Page BG)
  if (manualImages && manualImages.length > 0) {
    // 优先用 index 2，没有则 fallback 到 index 0
    const url = manualImages[2] || manualImages[0];
    if (url) {
      return {
        backgroundImage: `url(${url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
  }

  return {};
}

/**
 * 获取商店页背景样式 (Page BG - 氛围大图)
 */
export function getGamePageBackground(link?: string, manualImages?: string[]): Record<string, string> {
  // 1. 如果是 Steam 游戏，优先使用 Steam 图片
  const images = getGameImages(link);
  if (images) {
    return {
      backgroundImage: `url(${images.page_bg || images.background})`,
      backgroundSize: 'cover',
      backgroundPosition: 'right center',
    };
  }

  // 2. 否则使用手动图片 (Index 2: Hero/Page BG)
  if (manualImages && manualImages.length > 0) {
    // 优先用 index 2，没有则 fallback 到 index 0
    const url = manualImages[2] || manualImages[0];
    if (url) {
      return {
        backgroundImage: `url(${url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'right center',
      };
    }
  }

  return {};
}
