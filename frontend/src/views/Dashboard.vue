<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { useUserStore } from '../stores/user';
import { usersApi, sessionsApi, authApi } from '../api';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { getGameCardBackground } from '../utils/steam';

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

const leaderboard = ref<any[]>([]);
const sessions = ref<any[]>([]);
const historySessions = ref<any[]>([]);
const loading = ref(false);

// 历史记录分页
const HISTORY_PAGE_KEY = 'gamepact_history_page';
const historyCurrentPage = ref(Number(localStorage.getItem(HISTORY_PAGE_KEY)) || 1);
const historyPageSize = 10;

// 监听页码变化，保存到 localStorage
watch(historyCurrentPage, (newPage) => {
  localStorage.setItem(HISTORY_PAGE_KEY, String(newPage));
});

// 历史记录总页数
const historyTotalPages = computed(() => Math.ceil(historySessions.value.length / historyPageSize));

// 当前页的历史记录
const paginatedHistory = computed(() => {
  const start = (historyCurrentPage.value - 1) * historyPageSize;
  const end = start + historyPageSize;
  return historySessions.value.slice(start, end);
});

// 历史记录翻页
const goToHistoryPage = (page: number) => {
  if (page >= 1 && page <= historyTotalPages.value) {
    historyCurrentPage.value = page;
  }
};

const prevHistoryPage = () => goToHistoryPage(historyCurrentPage.value - 1);
const nextHistoryPage = () => goToHistoryPage(historyCurrentPage.value + 1);

// 解析游戏选项（获取第一个游戏的名称和链接）
const parseFirstGameOption = (session: any) => {
  if (!session.gameOptions || session.gameOptions.length === 0) {
    return { name: '未定游戏', link: null };
  }

  const firstOption = session.gameOptions[0];
  if (typeof firstOption === 'string') {
    return { name: firstOption, link: null };
  }
  return { name: firstOption.name, link: firstOption.link || null };
};

// 从 sessionStorage 读取标签状态，如果没有则默认为 'current'
const savedTab = sessionStorage.getItem('dashboardTab');
const activeTab = ref<'current' | 'history'>(savedTab === 'history' ? 'history' : 'current');

// 监听标签变化，保存到 sessionStorage
watch(activeTab, (newTab) => {
  sessionStorage.setItem('dashboardTab', newTab);
});

// 刷新数据的处理函数
const handleRefresh = () => {
  fetchLeaderboard();
  fetchSessions();
  fetchHistorySessions();
};

// 获取排行榜（排除管理员）
const fetchLeaderboard = async () => {
  try {
    const response = await usersApi.list();
    leaderboard.value = response.data.filter((user: any) => !user.isAdmin);
  } catch (error) {
    console.error('获取排行榜失败:', error);
  }
};

// 获取活动列表
const fetchSessions = async () => {
  loading.value = true;
  try {
    const response = await sessionsApi.list();
    sessions.value = response.data;
  } catch (error) {
    console.error('获取活动列表失败:', error);
  } finally {
    loading.value = false;
  }
};

// 获取历史活动列表
const fetchHistorySessions = async () => {
  try {
    const response = await sessionsApi.listHistory();
    historySessions.value = response.data;
  } catch (error) {
    console.error('获取历史活动失败:', error);
  }
};

// 格式化时间
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
};

// 计算剩余时间
const getTimeRemaining = (endTime: string) => {
  const end = new Date(endTime);
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return '已截止';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
};

// 判断投票是否已截止
const isVotingExpired = (endTime: string) => {
  const end = new Date(endTime);
  return end < new Date();
};

// 获取显示状态（考虑截止时间）
const getDisplayStatus = (session: any) => {
  if (session.status === 'voting' && isVotingExpired(session.endVotingTime)) {
    return 'expired';
  }
  return session.status;
};

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    voting: '投票中',
    expired: '已截止',
    confirmed: '已成行',
    playing: '游玩中',
    settled: '已结算',
    cancelled: '已流局',
  };
  return statusMap[status] || status;
};

// 获取状态颜色类
const getStatusBadgeClass = (status: string) => {
  const map: Record<string, string> = {
    voting: 'badge-accent',
    expired: 'badge-secondary',
    confirmed: 'badge-success',
    playing: 'badge-primary',
    settled: 'badge-success',
    cancelled: 'badge-danger',
  };
  return map[status] || 'badge-secondary';
};

// 获取状态图标
const getStatusIcon = (status: string) => {
  const iconMap: Record<string, string> = {
    voting: 'mdi:vote',
    expired: 'mdi:clock-alert',
    confirmed: 'mdi:check-circle',
    playing: 'mdi:play',
    settled: 'mdi:check',
    cancelled: 'mdi:alert-circle',
  };
  return iconMap[status] || 'mdi:help-circle';
};

// 获取紧急程度颜色
const getUrgencyColor = (endTime: string) => {
  const hours = parseFloat(getTimeRemaining(endTime));
  if (hours < 2) return 'text-[#c45c26]'; // 紧急 - 焦糖色
  if (hours < 6) return 'text-[#c4941f]'; // 一般 - 芥末黄
  return 'text-[#6b9b7a]'; // 充足 - 绿色
};

// 进入活动详情
const goToSession = (sessionId: string) => {
  router.push(`/sessions/${sessionId}`);
};

// 获取排名样式
function getRankClass(index: number): string {
  const classes = [
    'bg-[#c4941f] text-[#1a1814]',     // 第1名 - 芥末黄
    'bg-[#8b7355] text-[#f5f0e6]',     // 第2名 - 暖灰
    'bg-[#a34d1d] text-[#f5f0e6]',     // 第3名 - 焦糖色
    'bg-[#4a4540] text-[#c4b8a8]',     // 其他
  ];
  return classes[index] || classes[3];
}

// 获取徽章名称
function getBadgeName(rp: number): string {
  if (rp >= 500) return '传说缔约者';
  if (rp >= 350) return '钻石战神';
  if (rp >= 250) return '黄金大腿';
  if (rp >= 180) return '白银骑士';
  if (rp >= 120) return '青铜玩家';
  if (rp >= 80) return '扑棱鸽子';
  if (rp >= 50) return '老鸽子';
  if (rp >= 20) return '鸽王之王';
  return '失踪人口';
}

// 获取等级徽章图标
function getRankIcon(rp: number): string {
  if (rp >= 500) return 'mdi:crown';
  if (rp >= 350) return 'mdi:gem';
  if (rp >= 250) return 'mdi:medal';
  if (rp >= 180) return 'mdi:shield';
  if (rp >= 120) return 'mdi:award';
  if (rp >= 80) return 'mdi:bird';
  if (rp >= 50) return 'mdi:alert-triangle';
  if (rp >= 20) return 'mdi:skull';
  return 'mdi:user-minus';
}

// 获取等级徽章图标颜色
function getRankIconColor(rp: number): string {
  if (rp >= 500) return 'text-[#c4941f]'; // 金色
  if (rp >= 350) return 'text-[#9333ea]'; // 紫色
  if (rp >= 250) return 'text-[#fbbf24]'; // 橙金色
  if (rp >= 180) return 'text-[#e5e7eb]'; // 银色
  if (rp >= 120) return 'text-[#cd7f32]'; // 铜色
  if (rp >= 80) return 'text-[#9ca3af]'; // 灰色
  if (rp >= 50) return 'text-[#fb923c]'; // 橙色
  if (rp >= 20) return 'text-[#ef4444]'; // 红色
  return 'text-[#6b7280]'; // 深灰
}

// 格式化历史记录为一句话（带颜色）
const formatHistoryRecord = (session: any): string => {
  const gameOption = session.finalGame || session.gameOptions?.[0] || '未知游戏';
  const game = typeof gameOption === 'object' ? gameOption.name : gameOption;
  const time = formatTime(session.updatedAt || session.createdAt);
  const initiator = session.initiator?.displayName || '未知';

  // 分类参与者
  const participants = session.participants || [];
  const present = participants.filter((p: any) => p.isPresent && !p.isExcused).map((p: any) => p.user.displayName);
  const excused = participants.filter((p: any) => p.isExcused).map((p: any) => p.user.displayName);
  const pigeon = participants.filter((p: any) => p.isPresent === false && !p.isExcused).map((p: any) => p.user.displayName);

  // 发起人和游戏名加颜色（比默认色稍白）
  const coloredInitiator = `<span class="text-[#e8dcc8] font-medium">${initiator}</span>`;
  const coloredGame = `<span class="text-[#ffe8cc] font-medium">${game}</span>`;

  // 状态标识
  let statusBadge = '';
  if (session.status === 'settled') {
    statusBadge = `<span class="inline-flex items-center px-2 py-0.5 text-xs font-bold border-2 border-[#6b9b7a] bg-[#6b9b7a]/10 text-[#6b9b7a] mr-2">✓ 成功</span>`;
  } else if (session.status === 'cancelled') {
    statusBadge = `<span class="inline-flex items-center px-2 py-0.5 text-xs font-bold border-2 border-[#a34d1d] bg-[#a34d1d]/10 text-[#a34d1d] mr-2">✗ 流局</span>`;
  }

  let result = `${time} ${statusBadge}由 ${coloredInitiator} 发起玩《${coloredGame}》`;

  const parts = [];
  if (present.length > 0) {
    const coloredNames = present.map(name => `<span class="text-[#6b9b7a] font-medium">${name}</span>`).join('、');
    parts.push(`${coloredNames} <span class="text-[#8b8178]">参与</span>`);
  }
  if (excused.length > 0) {
    const coloredNames = excused.map(name => `<span class="text-[#c4941f] font-medium">${name}</span>`).join('、');
    parts.push(`${coloredNames} <span class="text-[#8b8178]">请假</span>`);
  }
  if (pigeon.length > 0) {
    const coloredNames = pigeon.map(name => `<span class="text-[#a34d1d] font-medium">${name}</span>`).join('、');
    parts.push(`${coloredNames} <span class="text-[#8b8178]">放鸽子</span>`);
  }

  if (parts.length > 0) {
    result += '，' + parts.join('，');
  }

  return result;
};

// 修改密码相关
const showPasswordDialog = ref(false);
const showOldPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});
const changingPassword = ref(false);

const openPasswordDialog = () => {
  passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' };
  showOldPassword.value = false;
  showNewPassword.value = false;
  showConfirmPassword.value = false;
  showPasswordDialog.value = true;
};

const handleChangePassword = async () => {
  const { oldPassword, newPassword, confirmPassword } = passwordForm.value;

  if (!oldPassword || !newPassword || !confirmPassword) {
    ElMessage.warning('请填写所有密码字段');
    return;
  }

  if (newPassword !== confirmPassword) {
    ElMessage.warning('新密码和确认密码不一致');
    return;
  }

  // 密码强度校验
  if (newPassword.length < 8) {
    ElMessage.warning('新密码长度不能少于8位');
    return;
  }
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  if (!hasLetter || !hasNumber) {
    ElMessage.warning('新密码必须包含字母和数字');
    return;
  }
  if (/[^\x00-\x7F]/.test(newPassword)) {
    ElMessage.warning('新密码不能包含中文或非法字符');
    return;
  }
  if (/\s/.test(newPassword)) {
    ElMessage.warning('新密码不能包含空格');
    return;
  }

  if (oldPassword === newPassword) {
    ElMessage.warning('新密码不能与旧密码相同');
    return;
  }

  changingPassword.value = true;
  try {
    await authApi.changePassword({ oldPassword, newPassword });
    ElMessage.success('密码修改成功');
    showPasswordDialog.value = false;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '密码修改失败');
  } finally {
    changingPassword.value = false;
  }
};

onMounted(() => {
  fetchLeaderboard();
  fetchSessions();
  fetchHistorySessions();

  // 监听刷新事件
  window.addEventListener('gamepact:refresh', handleRefresh);
});

onUnmounted(() => {
  // 移除刷新事件监听
  window.removeEventListener('gamepact:refresh', handleRefresh);
});
</script>

<template>
  <div class="page-container crt-flicker">
    <!-- 欢迎卡片 -->
    <div class="card mb-8 p-6 bg-gradient-to-r from-[#2d2a26] to-[#1a1814]">
      <div class="flex items-center space-x-4">
        <div class="relative">
          <div class="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#c4941f] bg-[#1a1814] text-3xl font-bold text-[#c4941f]">
            {{ userStore.user?.displayName?.[0] || '?' }}
          </div>
          <div class="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-[#a34d1d] border-2 border-[#242220]"></div>
        </div>
        <div class="flex-1">
          <h1 class="title-display mb-1">
            <span class="text-[#f5f0e6]">欢迎回来，</span>
            <span class="text-[#c4941f]">{{ userStore.user?.displayName }}</span
            ><span class="cursor-blink"></span>
          </h1>
          <p class="font-mono-retro text-sm text-[#8b8178]">> 准备好今晚的游戏了吗？</p>
        </div>
        <div class="ml-auto text-right">
          <div v-if="userStore.isAdmin">
            <div class="title-display text-[#c4941f] text-2xl">ADMIN</div>
            <div class="font-mono-retro text-xs text-[#8b8178] uppercase tracking-widest">System</div>
          </div>
          <div v-else>
            <div class="title-display text-[#c4941f]">{{ userStore.user?.rp || 0 }}</div>
            <div class="font-mono-retro text-xs text-[#8b8178] uppercase tracking-widest">RP Points</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主内容网格 -->
    <div class="grid-dashboard">
      <!-- 左侧：活动列表 -->
      <div class="grid-main">
        <!-- 活动标题栏和标签切换 -->
        <div class="mb-6">
          <div class="flex items-center space-x-6 border-b-2 border-[#6b5a45] pb-2">
            <button
              @click="activeTab = 'current'"
              :class="activeTab === 'current' ? 'text-[#c4941f] border-b-2 border-[#c4941f]' : 'text-[#8b8178] hover:text-[#c4b8a8]'"
              class="flex items-center space-x-2 pb-2 transition-colors -mb-2.5"
            >
              <Icon icon="mdi:game-controller-variant" class="h-6 w-6" />
              <span class="title-section">当前活动</span>
              <span class="badge badge-primary">{{ sessions.length }}</span>
            </button>
            <button
              @click="activeTab = 'history'"
              :class="activeTab === 'history' ? 'text-[#c4941f] border-b-2 border-[#c4941f]' : 'text-[#8b8178] hover:text-[#c4b8a8]'"
              class="flex items-center space-x-2 pb-2 transition-colors -mb-2.5"
            >
              <span class="title-section">历史记录</span>
              <span class="badge badge-secondary">{{ historySessions.length }}</span>
            </button>
          </div>
        </div>

        <!-- 当前活动列表 -->
        <div v-if="activeTab === 'current'">
          <!-- 活动列表 -->
          <div v-if="loading" class="card p-12">
            <div class="flex flex-col items-center justify-center">
              <div class="loading-spinner mb-4"></div>
              <p class="font-mono-retro text-[#8b8178]">LOADING...</p>
            </div>
          </div>

          <div v-else-if="sessions.length === 0" class="card p-12 bg-grid">
            <div class="flex flex-col items-center justify-center">
              <Icon icon="mdi:game-controller-variant" class="mb-6 h-20 w-20 text-[#6b5a45]" />
              <p class="mb-2 title-subsection text-[#8b8178]">暂无活动</p>
              <p v-if="!userStore.isAdmin" class="mb-6 font-mono-retro text-sm text-[#6b5a45]">> 创建第一个游戏聚会</p>
              <router-link v-if="!userStore.isAdmin" to="/sessions/create" class="btn btn-primary">
                <Icon icon="mdi:plus" class="mr-2 h-5 w-5" />
                发起活动
              </router-link>
            </div>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="session in sessions"
              :key="session.id"
              @click="goToSession(session.id)"
              class="card p-5 cursor-pointer hover:border-[#c4941f] transition-all duration-150 group relative overflow-hidden"
            >
              <!-- Steam 背景 (右侧溶解渐隐) -->
              <div v-if="parseFirstGameOption(session).link" 
                   class="absolute right-0 top-0 bottom-0 w-[60%] opacity-25 pointer-events-none mix-blend-luminosity"
                   :style="{ 
                     ...getGameCardBackground(parseFirstGameOption(session).link),
                     maskImage: 'radial-gradient(ellipse at center, black 10%, transparent 80%)',
                     webkitMaskImage: 'radial-gradient(ellipse at center, black 10%, transparent 80%)'
                   }">
              </div>

              <div class="flex items-start justify-between relative z-10">
                <div class="flex-1">
                  <!-- 状态和时间 -->
                  <div class="mb-3 flex flex-wrap items-center gap-2">
                    <span class="badge" :class="getStatusBadgeClass(getDisplayStatus(session))">
                      <Icon :icon="getStatusIcon(getDisplayStatus(session))" class="mr-1.5 h-3.5 w-3.5" />
                      {{ getStatusText(getDisplayStatus(session)) }}
                    </span>
                    <span class="font-mono-retro text-xs text-[#8b8178] flex items-center">
                      <Icon icon="mdi:calendar" class="mr-1 h-3.5 w-3.5" />
                      {{ formatTime(session.startTime) }}
                    </span>
                  </div>

                  <!-- 游戏名称 -->
                  <h3 class="mb-3 title-subsection group-hover:text-[#c4941f] transition-colors">
                    <template v-if="parseFirstGameOption(session).link">
                      <a
                        :href="parseFirstGameOption(session).link"
                        target="_blank"
                        rel="noopener noreferrer"
                        @click.stop
                        class="hover:text-[#d4a017] underline underline-offset-2 decoration-2"
                      >
                        {{ parseFirstGameOption(session).name }}
                        <Icon icon="mdi:open-in-new" class="h-3 w-3 inline ml-1" />
                      </a>
                    </template>
                    <template v-else>
                      {{ parseFirstGameOption(session).name }}
                    </template>
                    <span v-if="session.gameOptions?.length > 1" class="ml-2 text-base text-[#8b8178]">
                      +{{ session.gameOptions.length - 1 }}
                    </span>
                  </h3>

                  <!-- 参与信息 -->
                  <div class="flex flex-wrap items-center gap-4 text-sm">
                    <div class="flex items-center font-mono-retro text-[#8b8178]">
                      <Icon icon="mdi:account-group" class="mr-1 h-4 w-4" />
                      <span>{{ session.participants?.length || 0 }}/{{ session.minPlayers }} 玩家</span>
                    </div>
                    <div class="flex items-center font-mono-retro" :class="getUrgencyColor(session.endVotingTime)">
                      <Icon icon="mdi:timer" class="mr-1 h-4 w-4" />
                      <span>{{ getTimeRemaining(session.endVotingTime) }}</span>
                    </div>
                    <div class="flex items-center font-mono-retro text-[#6b5a45]">
                      <Icon icon="mdi:account-edit" class="mr-1 h-4 w-4" />
                      <span>由 {{ session.initiator?.displayName || '未知' }} 发起</span>
                    </div>
                  </div>
                </div>

                <!-- 箭头 -->
                <div class="ml-4 flex h-10 w-10 items-center justify-center border-2 border-[#6b5a45] group-hover:border-[#c4941f] group-hover:bg-[#c4941f]/10 transition-all">
                  <Icon icon="mdi:chevron-right" class="h-6 w-6 text-[#6b5a45] group-hover:text-[#c4941f]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 历史记录列表 -->
        <div v-if="activeTab === 'history'">
          <div v-if="historySessions.length === 0" class="card p-12 bg-grid">
            <div class="flex flex-col items-center justify-center">
              <Icon icon="mdi:history" class="mb-6 h-20 w-20 text-[#6b5a45]" />
              <p class="mb-2 title-subsection text-[#8b8178]">暂无历史记录</p>
              <p class="font-mono-retro text-sm text-[#6b5a45]">> 结算的活动会显示在这里</p>
            </div>
          </div>

          <div v-else>
            <!-- 记录列表 -->
            <div class="space-y-3 mb-4">
              <div
                v-for="session in paginatedHistory"
                :key="session.id"
                @click="goToSession(session.id)"
                class="card p-4 cursor-pointer hover:border-[#c4941f] transition-all duration-150 group"
              >
                <p class="font-mono-retro text-sm text-[#c4b8a8] leading-relaxed group-hover:text-[#f5f0e6] transition-colors" v-html="formatHistoryRecord(session)">
                </p>
              </div>
            </div>

            <!-- 分页控件 -->
            <div v-if="historyTotalPages > 1" class="flex items-center justify-between border-t-2 border-[#6b5a45] pt-4">
              <!-- 上一页 -->
              <button
                v-if="historyCurrentPage > 1"
                @click="prevHistoryPage"
                class="btn btn-ghost"
              >
                <Icon icon="mdi:chevron-left" class="mr-1 h-5 w-5" />
                上一页
              </button>
              <button
                v-else
                disabled
                class="btn btn-ghost opacity-50 cursor-not-allowed pointer-events-none"
              >
                <Icon icon="mdi:chevron-left" class="mr-1 h-5 w-5" />
                上一页
              </button>

              <!-- 页码显示 -->
              <div class="flex items-center space-x-2">
                <span class="font-mono-retro text-sm text-[#8b8178]">第</span>
                <div class="flex space-x-1">
                  <button
                    v-for="page in historyTotalPages"
                    :key="page"
                    @click="goToHistoryPage(page)"
                    class="w-8 h-8 rounded font-mono-retro text-sm transition-all"
                    :class="page === historyCurrentPage
                      ? 'bg-[#c4941f] text-[#1a1814] font-bold'
                      : 'border-2 border-[#6b5a45] text-[#8b8178] hover:border-[#c4941f] hover:text-[#c4941f]'"
                  >
                    {{ page }}
                  </button>
                </div>
                <span class="font-mono-retro text-sm text-[#8b8178]">页 / 共 {{ historyTotalPages }} 页</span>
              </div>

              <!-- 下一页 -->
              <button
                v-if="historyCurrentPage < historyTotalPages"
                @click="nextHistoryPage"
                class="btn btn-ghost"
              >
                下一页
                <Icon icon="mdi:chevron-right" class="ml-1 h-5 w-5" />
              </button>
              <button
                v-else
                disabled
                class="btn btn-ghost opacity-50 cursor-not-allowed pointer-events-none"
              >
                下一页
                <Icon icon="mdi:chevron-right" class="ml-1 h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：排行榜 -->
      <div class="grid-sidebar">
        <!-- 排行榜卡片 -->
        <div class="card p-6 mb-6">
          <h2 class="title-section flex items-center">
            <Icon icon="mdi:trophy" class="mr-3 h-6 w-6 text-[#c4941f]" />
            信誉殿堂
          </h2>

          <div v-if="leaderboard.length === 0" class="py-8 text-center font-mono-retro text-[#8b8178]">
            > 暂无数据
          </div>

          <div v-else class="max-h-[400px] overflow-y-auto space-y-3 pr-2">
            <div
              v-for="(user, index) in leaderboard"
              :key="user.id"
              class="flex items-center justify-between rounded border border-[#6b5a45] bg-[#1a1814] p-3 hover:border-[#c4941f] transition-all"
            >
              <div class="flex items-center space-x-3">
                <div class="flex h-8 w-8 items-center justify-center rounded font-mono-retro text-sm font-bold" :class="getRankClass(index)">
                  {{ String(index + 1).padStart(2, '0') }}
                </div>
                <router-link :to="`/profile/${user.id}`" class="flex-1 no-underline">
                  <div>
                    <div class="font-semibold text-[#f5f0e6] hover:text-[#c4941f] transition-colors flex items-center">
                      {{ user.displayName }}
                      <Icon :icon="getRankIcon(user.rp)" class="ml-2 h-4 w-4" :class="getRankIconColor(user.rp)" />
                    </div>
                    <div class="font-mono-retro text-xs text-[#8b8178]">@{{ user.username }}</div>
                  </div>
                </router-link>
              </div>
              <div class="text-right">
                <div class="font-mono-retro text-xl font-bold text-[#c4941f]">{{ user.rp }}</div>
                <div class="text-xs text-[#8b8178]">{{ getBadgeName(user.rp) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作面板（管理员不显示） -->
        <div v-if="!userStore.isAdmin" class="card p-6">
          <h2 class="title-section flex items-center">
            <Icon icon="mdi:command" class="mr-3 h-5 w-5 text-[#c4941f]" />
            操作
          </h2>
          <div class="space-y-3">
            <router-link to="/sessions/create" class="btn btn-primary w-full">
              <Icon icon="mdi:plus" class="mr-2 h-5 w-5" />
              发起新活动
            </router-link>
            <router-link :to="`/profile/${userStore.user?.id}`" class="btn btn-secondary w-full">
              <Icon icon="mdi:account" class="mr-2 h-5 w-5" />
              个人资料
            </router-link>
            <button @click="openPasswordDialog" class="btn btn-ghost border-2 border-[#6b5a45] w-full">
              <Icon icon="mdi:lock-reset" class="mr-2 h-5 w-5" />
              修改密码
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 修改密码对话框 -->
    <teleport to="body">
      <div v-if="showPasswordDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div class="card w-full max-w-md p-6">
          <h3 class="title-subsection mb-4 text-[#f5f0e6]">修改登录密码</h3>
          
          <div class="mb-4">
            <label class="block text-sm font-mono-retro text-[#c4b8a8] mb-1">旧密码</label>
            <div class="relative">
              <input 
                v-model="passwordForm.oldPassword" 
                :type="showOldPassword ? 'text' : 'password'"
                class="w-full border-2 border-[#6b5a45] bg-[#1a1814] px-3 py-2 pr-10 text-[#f5f0e6] focus:border-[#c4941f] outline-none" 
                placeholder="请输入当前密码"
              >
              <button 
                @click="showOldPassword = !showOldPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8178] hover:text-[#c4941f]"
                type="button"
              >
                <Icon :icon="showOldPassword ? 'mdi:eye-off' : 'mdi:eye'" class="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-mono-retro text-[#c4b8a8] mb-1">新密码</label>
            <div class="relative">
              <input 
                v-model="passwordForm.newPassword" 
                :type="showNewPassword ? 'text' : 'password'"
                class="w-full border-2 border-[#6b5a45] bg-[#1a1814] px-3 py-2 pr-10 text-[#f5f0e6] focus:border-[#c4941f] outline-none" 
                placeholder="至少8位，包含字母和数字"
              >
              <button 
                @click="showNewPassword = !showNewPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8178] hover:text-[#c4941f]"
                type="button"
              >
                <Icon :icon="showNewPassword ? 'mdi:eye-off' : 'mdi:eye'" class="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div class="mb-6">
            <label class="block text-sm font-mono-retro text-[#c4b8a8] mb-1">确认新密码</label>
            <div class="relative">
              <input 
                v-model="passwordForm.confirmPassword" 
                :type="showConfirmPassword ? 'text' : 'password'"
                class="w-full border-2 border-[#6b5a45] bg-[#1a1814] px-3 py-2 pr-10 text-[#f5f0e6] focus:border-[#c4941f] outline-none" 
                placeholder="再次输入新密码"
              >
              <button 
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8178] hover:text-[#c4941f]"
                type="button"
              >
                <Icon :icon="showConfirmPassword ? 'mdi:eye-off' : 'mdi:eye'" class="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div class="flex justify-end space-x-3">
            <button @click="showPasswordDialog = false" class="btn btn-ghost">
              取消
            </button>
            <button @click="handleChangePassword" :disabled="changingPassword" class="btn btn-primary">
              {{ changingPassword ? '提交中...' : '确认修改' }}
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
/* 移除下划线 */
.no-underline {
  text-decoration: none;
}
</style>
