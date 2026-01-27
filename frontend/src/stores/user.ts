import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface User {
  id: string;
  username: string;
  displayName: string;
  rp: number;
  isAdmin: boolean;
}

export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<User | null>(null);

  // 计算属性
  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => user.value?.isAdmin ?? false);

  // 方法
  function setToken(newToken: string | null) {
    token.value = newToken;
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
  }

  function setUser(newUser: User | null) {
    user.value = newUser;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    setToken,
    setUser,
    logout,
  };
});
