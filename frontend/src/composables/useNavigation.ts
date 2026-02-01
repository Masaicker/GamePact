import { useRouter } from 'vue-router';

export function useNavigation() {
  const router = useRouter();

  /**
   * 智能返回：有历史记录时返回，否则跳转到fallback页面
   * @param fallback 无历史记录时的回退路径，默认为控制台
   */
  const goBack = (fallback = '/dashboard') => {
    // 检查是否有历史记录可以返回
    if (window.history.state && window.history.state.back) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return { goBack };
}
