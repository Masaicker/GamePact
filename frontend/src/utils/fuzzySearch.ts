/**
 * 模糊搜索时忽略的字符集合
 * 添加新符号：直接在正则字符类中追加即可
 */
const IGNORED_CHARS = '[\\s._]';

/**
 * 模糊搜索工具函数
 * 支持忽略空格、半角句号(.)、下划线(_)进行双向匹配
 *
 * @example
 * fuzzyMatch("repo", "R.E.P.O.") // true
 * fuzzyMatch(".. ap  ex", "Apex") // true
 */
export function fuzzyMatch(query: string, target: string): boolean {
  const normalize = (str: string) =>
    str.toLowerCase().replace(new RegExp(IGNORED_CHARS, 'g'), '');

  return normalize(target).includes(normalize(query));
}
