<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useUserStore } from './stores/user';
import { ElNotification } from 'element-plus';
import { connectSocket, disconnectSocket, onNotification, offNotification, joinUserRoom } from './utils/socket';

const router = useRouter();
const userStore = useUserStore();

// 保存通知回调引用，用于正确移除监听器
let notificationCallback: ((data: any) => void) | null = null;

// 刷新事件 - 使用自定义事件
const emitRefreshEvent = () => {
  window.dispatchEvent(new CustomEvent('gamepact:refresh'));
};

// 连接 Socket
const connectToSocket = () => {
  if (userStore.token && userStore.user) {
    const socket = connectSocket(userStore.token);
    joinUserRoom(userStore.user.id);

    // 先移除旧的监听器（如果有）
    if (notificationCallback) {
      offNotification(notificationCallback);
    }

    // 创建新的监听器
    notificationCallback = (data) => {
      ElNotification({
        title: '新活动通知',
        message: data.message,
        type: 'info',
        duration: 5000,
        onClick: () => {
          router.push(`/sessions/${data.sessionId}`);
        },
      });

      // 触发刷新事件
      emitRefreshEvent();
    };

    // 添加新的监听器
    onNotification(notificationCallback);
  }
};

const disconnectFromSocket = () => {
  if (notificationCallback) {
    offNotification(notificationCallback);
    notificationCallback = null;
  }
  disconnectSocket();
};

watch(() => userStore.isAuthenticated, (isAuthenticated) => {
  if (isAuthenticated) {
    connectToSocket();
  } else {
    disconnectFromSocket();
  }
});

onMounted(async () => {
  if (userStore.token) {
    try {
      const { authApi } = await import('./api');
      const response = await authApi.getMe();
      userStore.setUser(response.data.user);
      connectToSocket();
    } catch (error) {
      userStore.logout();
    }
  }
});
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--bg-primary);">
    <!-- 导航栏 -->
    <nav class="nav-container">
      <div class="nav-inner">
        <!-- Logo -->
        <div class="flex items-center">
          <router-link to="/" class="flex items-center space-x-3 group">
            <div class="relative">
              <Icon icon="mdi:game-controller-variant" class="h-8 w-8 text-[#c4941f] transition-colors group-hover:text-[#d4a017]" />
              <div class="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#c4941f] scale-x-0 group-hover:scale-x-100 transition-transform duration-150"></div>
            </div>
            <span class="nav-logo">GamePact</span>
          </router-link>
          <span class="nav-tagline">「不鸽，才是真爱」</span>
        </div>

        <!-- 导航链接 -->
        <div class="nav-links">
          <router-link
            v-if="userStore.isAuthenticated"
            to="/dashboard"
            class="nav-link"
            :class="{ 'active': $route.path === '/dashboard' }"
          >
            <Icon icon="mdi:monitor-dashboard" class="mr-2 h-4 w-4" />
            控制台
          </router-link>
          <router-link
            v-if="userStore.isAdmin"
            to="/admin"
            class="nav-link"
            :class="{ 'active': $route.path === '/admin' }"
          >
            <Icon icon="mdi:cog" class="mr-2 h-4 w-4" />
            管理
          </router-link>
        </div>

        <!-- 用户菜单 -->
        <div class="flex items-center space-x-3">
          <template v-if="userStore.isAuthenticated">
            <div class="hidden md:flex items-center space-x-3 px-4 py-2 border-2 border-[#6b5a45] bg-[#1a1814]">
              <span class="font-mono-retro text-sm text-[#f5f0e6]">{{ userStore.user?.displayName }}</span>
              <div class="h-4 w-[2px] bg-[#6b5a45]"></div>
              <div v-if="userStore.isAdmin" class="flex items-center">
                <span class="text-xs text-[#c4941f] font-mono-retro font-bold uppercase tracking-widest">Admin</span>
              </div>
              <div v-else class="flex items-center space-x-2">
                <span class="badge-primary">{{ userStore.user?.rp }}</span>
                <span class="text-xs text-[#8b8178] font-mono-retro">RP</span>
              </div>
            </div>
            <button
              @click="() => { userStore.logout(); router.push('/'); }"
              class="btn btn-ghost"
            >
              <Icon icon="mdi:logout" class="h-4 w-4 mr-2" />
              <span class="hidden md:inline">登出</span>
            </button>
          </template>
          <template v-else>
            <router-link to="/login" class="btn btn-ghost">
              登录
            </router-link>
            <router-link to="/register" class="btn btn-primary">
              注册
            </router-link>
          </template>
        </div>
      </div>
    </nav>

    <!-- 主内容 -->
    <main class="relative">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
/* 覆盖 Element Plus 通知样式 */
:deep(.el-notification) {
  background-color: #242220 !important;
  border: 2px solid #6b5a45 !important;
  box-shadow: 3px 3px 0 0 rgba(107, 90, 69, 0.5) !important;
}

:deep(.el-notification__title) {
  color: #f5f0e6 !important;
  font-family: 'Space Grotesk', sans-serif !important;
  font-weight: 700 !important;
}

:deep(.el-notification__content) {
  color: #c4b8a8 !important;
  font-family: 'Courier Prime', monospace !important;
}

:deep(.el-notification__closeBtn) {
  color: #8b8178 !important;
}

:deep(.el-notification__closeBtn:hover) {
  color: #c4941f !important;
}
</style>
