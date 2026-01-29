<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useUserStore } from './stores/user';
import { connectSocket, disconnectSocket, onNotification, offNotification, joinUserRoom } from './utils/socket';
import NotificationBar from './components/NotificationBar.vue';

const router = useRouter();
const userStore = useUserStore();

// 当前时间逻辑
const currentTime = ref('');
let timer: number | null = null;

const updateTime = () => {
  const date = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  currentTime.value = `${HH}:${mm}:${ss}`;
};

// 通知栏组件引用
const notificationBarRef = ref<InstanceType<typeof NotificationBar> | null>(null);

// 保存通知回调引用，用于正确移除监听器
let notificationCallback: ((data: any) => void) | null = null;

// 标记：防止重复设置监听器
let hasSetupNotification = false;

// 刷新事件 - 使用自定义事件
const emitRefreshEvent = () => {
  window.dispatchEvent(new CustomEvent('gamepact:refresh'));
};

// 连接 Socket
const connectToSocket = () => {
  if (!userStore.token || !userStore.user) {
    return;
  }

  const socket = connectSocket(userStore.token);
  joinUserRoom(userStore.user.id);

  // 防止重复设置监听器
  if (hasSetupNotification) {
    return;
  }

  // 创建通知监听器
  notificationCallback = (data) => {
    // 调用通知栏组件显示通知
    if (notificationBarRef.value) {
      notificationBarRef.value.showNotification(data);
    }

    // 触发刷新事件
    emitRefreshEvent();
  };

  // 添加监听器
  onNotification(notificationCallback);
  hasSetupNotification = true;
};

const disconnectFromSocket = () => {
  if (notificationCallback) {
    offNotification(notificationCallback);
    notificationCallback = null;
  }
  hasSetupNotification = false;
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
  // 启动时钟
  updateTime();
  timer = window.setInterval(updateTime, 1000);

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

  // 监听模拟通知事件（用于测试）
  window.addEventListener('gamepact:notification', ((event: CustomEvent) => {
    if (notificationBarRef.value) {
      notificationBarRef.value.showNotification(event.detail);
    }
  }) as EventListener);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<template>
  <div class="min-h-screen flex flex-col" style="background-color: var(--bg-primary);">
    <!-- 导航栏 -->
    <nav class="nav-container">
      <div class="nav-inner">
        <!-- Logo -->
        <div class="flex flex-col">
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
          <!-- 通知栏 -->
          <NotificationBar ref="notificationBarRef" />
        </div>

        <!-- 导航链接 -->
        <div class="nav-links flex-1 flex justify-center">
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
          <!-- 系统时间 -->
          <div class="hidden md:block font-mono-retro text-sm text-[#8b8178] mr-2">
            {{ currentTime }}
          </div>

          <template v-if="userStore.isAuthenticated">
            <router-link
              :to="`/profile/${userStore.user?.id}`"
              class="hidden md:flex items-center space-x-3 px-4 py-2 border-2 border-[#6b5a45] bg-[#1a1814] hover:border-[#c4941f] transition-colors cursor-pointer"
            >
              <span class="font-mono-retro text-sm text-[#f5f0e6]">{{ userStore.user?.displayName }}</span>
              <div class="h-4 w-[2px] bg-[#6b5a45]"></div>
              <div v-if="userStore.isAdmin" class="flex items-center">
                <span class="text-xs text-[#c4941f] font-mono-retro font-bold uppercase tracking-widest">Admin</span>
              </div>
              <div v-else class="flex items-center space-x-2">
                <span class="badge-primary">{{ userStore.user?.rp }}</span>
                <span class="text-xs text-[#8b8178] font-mono-retro">RP</span>
              </div>
            </router-link>
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
    <main class="relative flex-grow" style="padding-top: 120px;">
      <router-view />
    </main>

    <!-- 页脚 -->
    <footer class="py-6 text-center border-t border-[#2d2a26] mt-auto">
      <p class="font-mono-retro text-xs text-[#5c5550]">
        由 <a href="https://github.com/Masaicker" target="_blank" rel="noopener noreferrer" class="text-[#8b7355] hover:text-[#c4941f] transition-colors font-bold no-underline">@Masaicker</a> 开发，
        <a href="https://space.bilibili.com/1704421" target="_blank" rel="noopener noreferrer" class="text-[#8b7355] hover:text-[#c4941f] transition-colors font-bold no-underline">@尤里的猫-卡里普索</a> 提供服务器和美术指导
      </p>
    </footer>
  </div>
</template>

<style scoped>
</style>
