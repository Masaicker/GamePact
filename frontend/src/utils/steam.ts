/**
 * Steam CDN 工具函数
 * 用于从 Steam 商店 URL 解析游戏图片
 */

const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps';

/**
 * 从 Steam 商店 URL 提取 appid
 * @param url - Steam 商店链接 (如: https://store.steampowered.com/app/730/CounterStrike2/)
 * @returns appid 或 null
 */
export function extractSteamAppId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/store\.steampowered\.com\/app\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * 获取 Steam 图片 URL
 * @param appid - Steam 游戏 ID
 * @param type - 图片类型
 */
export function getSteamImageUrl(
  appid: string,
  type: 'header' | 'portrait' | 'background' | 'hero' | 'page_bg' = 'header'
): string {
  const images = {
    header: `${STEAM_CDN}/${appid}/header.jpg`,
    portrait: `${STEAM_CDN}/${appid}/library_600x900.jpg`,
    background: `${STEAM_CDN}/${appid}/page_bg_raw.jpg`,
    hero: `${STEAM_CDN}/${appid}/library_hero.jpg`,
    page_bg: `${STEAM_CDN}/${appid}/page_bg_generated_v6b.jpg`,
  };
  return images[type];
}

/**
 * 获取游戏卡片背景样式（用于投票卡片 - 横图）
 */
export function getGameCardBackground(link?: string): Record<string, string> {
  const appid = extractSteamAppId(link || '');
  if (!appid) return {};

  const imageUrl = getSteamImageUrl(appid, 'header');
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}

/**
 * 获取游戏竖版封面背景样式（用于进度条容器）
 */
export function getGamePortraitBackground(link?: string): Record<string, string> {
  const appid = extractSteamAppId(link || '');
  if (!appid) return {};

  const imageUrl = getSteamImageUrl(appid, 'portrait');
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}

/**
 * 获取游戏高清商店页背景图样式（用于卡片右侧背景）
 */
export function getGamePageBackground(link?: string): Record<string, string> {
  const appid = extractSteamAppId(link || '');
  if (!appid) return {};

  const imageUrl = getSteamImageUrl(appid, 'page_bg');
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'right center', // 因为是放右边，背景位置也微调一下
  };
}

/**
 * 获取活动标题背景样式（用于大图展示）
 */
export function getSessionHeaderBackground(link?: string): Record<string, string> {
  const appid = extractSteamAppId(link || '');
  if (!appid) return {};

  // 优先使用 library_hero.jpg (1920x620)，如果没有则回退到 header.jpg
  // 由于 CSS background 无法直接设置 fallback，我们这里使用 hero
  // 大多数现代游戏都有 hero 图
  const imageUrl = getSteamImageUrl(appid, 'hero');
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}
