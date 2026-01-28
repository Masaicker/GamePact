<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import { usersApi } from '../api';
import { ElMessage } from 'element-plus';
import axios from 'axios';

const route = useRoute();
const router = useRouter();

const user = ref<any>(null);
const history = ref<any[]>([]);
const loading = ref(false);
const badges = ref<any>({
  rank: null,
  achievement: [],
  behavior: [],
});
const loadingBadges = ref(false);

// 分页状态
const currentPage = ref(1);
const pageSize = 10;

// 计算总页数
const totalPages = computed(() => Math.ceil(history.value.length / pageSize));

// 计算显示的页码
const displayedPages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  const delta = 1;
  const range = [];
  const rangeWithDots: (number | string)[] = [];
  let l;

  range.push(1);
  for (let i = current - delta; i <= current + delta; i++) {
    if (i < total && i > 1) {
      range.push(i);
    }
  }
  if (total > 1) {
    range.push(total);
  }

  // 去重并排序
  const uniqueRange = [...new Set(range)].sort((a, b) => a - b);

  for (let i of uniqueRange) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  }
  return rangeWithDots;
});

// 当前页的记录
const paginatedHistory = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return history.value.slice(start, end);
});

// 翻页方法
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const prevPage = () => goToPage(currentPage.value - 1);
const nextPage = () => goToPage(currentPage.value + 1);

// 格式化时间
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
};

// 获取积分图标
const getScoreIcon = (reason: string) => {
  const iconMap: Record<string, string> = {
    attended: 'mdi:check-circle',
    initiated: 'mdi:scroll-text',
    pigeoned: 'mdi:emoticon-poop', // 改为更直观的图标
    excused: 'mdi:clock-alert',
    late_excuse: 'mdi:alert-triangle',
    admin_adjust: 'mdi:hand',
  };
  return iconMap[reason] || 'mdi:help-circle';
};

// 获取积分颜色
const getScoreColor = (scoreChange: number, reason: string) => {
  if (reason === 'admin_adjust') return 'text-[#c4941f]'; // 芥末黄
  if (reason === 'late_excuse') return 'text-[#a34d1d]'; // 焦糖色
  if (reason === 'pigeoned') return 'text-[#c45c26]'; // 深焦糖色
  if (scoreChange > 0) return 'text-[#6b9b7a]'; // 绿色
  if (scoreChange < 0) return 'text-[#a34d1d]'; // 焦糖色
  return 'text-[#8b8178]'; // 灰色
};

// 获取积分文本
const getScoreText = (scoreChange: number) => {
  return scoreChange > 0 ? `+${scoreChange}` : `${scoreChange}`;
};

// 获取等级徽章名称
const rankBadgeName = computed(() => {
  if (!user.value) return '';
  const rp = user.value.rp;
  if (rp >= 500) return '传说缔约者';
  if (rp >= 350) return '钻石战神';
  if (rp >= 250) return '黄金大腿';
  if (rp >= 180) return '白银骑士';
  if (rp >= 120) return '青铜玩家';
  if (rp >= 80) return '扑棱鸽子';
  if (rp >= 50) return '老鸽子';
  if (rp >= 20) return '鸽王之王';
  return '失踪人口';
});

// 获取徽章稀有度样式
const getBadgeRarityClass = (rarity: string) => {
  const map: Record<string, string> = {
    legendary: 'border-[#c4941f] bg-[#c4941f]/10',
    rare: 'border-[#9333ea] bg-[#9333ea]/10',
    epic: 'border-[#2563eb] bg-[#2563eb]/10',
    common: 'border-[#6b5a45] bg-[#1a1814]',
  };
  return map[rarity] || map.common;
};

// 获取徽章稀有度文本
const getBadgeRarityText = (rarity: string) => {
  const map: Record<string, string> = {
    legendary: '传说',
    rare: '稀有',
    epic: '精良',
    common: '普通',
  };
  return map[rarity] || '普通';
};

// 加载用户徽章
const fetchBadges = async () => {
  loadingBadges.value = true;
  try {
    const id = route.params.id as string;
    const apiBaseUrl = import.meta.env.VITE_API_URL;
    const token = localStorage.getItem('token');

    // 获取等级徽章
    const rankRes = await axios.get(`${apiBaseUrl}/badges/user/${id}/rank`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // 获取用户徽章
    const userBadgesRes = await axios.get(`${apiBaseUrl}/badges/user/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    badges.value = {
      ...userBadgesRes.data,
      rank: rankRes.data,
    };
  } catch (error) {
    console.error('加载徽章失败:', error);
  } finally {
    loadingBadges.value = false;
  }
};

// 获取用户信息
const fetchUser = async () => {
  loading.value = true;
  try {
    const id = route.params.id as string;
    const [userRes, historyRes] = await Promise.all([
      usersApi.get(id),
      usersApi.getHistory(id),
      fetchBadges(),
    ]);

    // 检查是否是管理员
    if (userRes.data.isAdmin) {
      ElMessage.warning('管理员没有个人资料页面');
      router.push('/dashboard');
      return;
    }

    user.value = userRes.data;
    history.value = historyRes.data;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '获取用户信息失败');
    router.push('/dashboard');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchUser();
});
</script>

<template>
  <div class="page-container crt-flicker">
    <!-- 加载状态 -->
    <div v-if="loading" class="card p-12">
      <div class="flex flex-col items-center justify-center">
        <div class="loading-spinner mb-4"></div>
        <p class="font-mono-retro text-[#8b8178]">LOADING USER DATA...</p>
      </div>
    </div>

    <!-- 用户信息 -->
    <div v-else-if="user" class="max-w-4xl mx-auto space-y-6">
      <!-- 返回按钮 -->
      <button
        @click="router.back()"
        class="btn btn-ghost mb-4"
      >
        <Icon icon="mdi:arrow-left" class="mr-2 h-5 w-5" />
        返回
      </button>

      <!-- 用户信息卡片 -->
      <div class="card p-6">
        <div class="flex items-center space-x-4">
          <div class="relative">
            <div class="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#c4941f] bg-[#1a1814] text-3xl font-bold text-[#c4941f]">
              {{ user.displayName?.[0] || '?' }}
            </div>
            <div class="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#a34d1d] border-2 border-[#242220] flex items-center justify-center">
              <Icon icon="mdi:star" class="h-3 w-3 text-[#f5f0e6]" />
            </div>
          </div>
          <div class="flex-1">
            <h1 class="title-display mb-1">{{ user.displayName }}</h1>
            <p class="font-mono-retro text-[#8b8178]">@{{ user.username }}</p>
          </div>
          <div class="text-right">
            <div class="title-display text-[#c4941f]">{{ user.rp }}</div>
            <div class="font-mono-retro text-xs text-[#8b8178] uppercase tracking-widest">RP Points</div>
          </div>
        </div>

        <!-- 统计信息 -->
        <div class="mt-6 grid grid-cols-3 gap-4 border-t-2 border-[#6b5a45] pt-6">
          <div class="flex items-center space-x-3">
            <Icon icon="mdi:gamepad" class="h-6 w-6 text-[#c4941f]" />
            <span class="text-[#8b8178]">参与场次：</span>
            <span class="font-mono-retro text-xl font-bold text-[#f5f0e6]">{{ user.totalGames || 0 }}</span>
          </div>
          <div class="flex items-center space-x-3">
            <Icon icon="mdi:clock-alert" class="h-6 w-6 text-[#eab308]" />
            <span class="text-[#8b8178]">请假次数：</span>
            <span class="font-mono-retro text-xl font-bold text-[#eab308]">{{ user.excuseCount || 0 }}</span>
          </div>
          <div class="flex items-center space-x-3">
            <Icon icon="mdi:emoticon-poop" class="h-6 w-6 text-[#a34d1d]" />
            <span class="text-[#8b8178]">鸽子次数：</span>
            <span class="font-mono-retro text-xl font-bold text-[#a34d1d]">{{ user.pigeonCount || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- 徽章墙 -->
      <div class="card p-6">
        <h2 class="title-section flex items-center mb-6">
          <Icon icon="mdi:medal" class="mr-3 h-6 w-6 text-[#c4941f]" />
          徽章墙
        </h2>

        <!-- 等级徽章 -->
        <div class="mb-8">
          <h3 class="font-mono-retro text-sm text-[#c4b8a8] mb-4">> 等级徽章</h3>
          <div v-if="badges.rank" class="flex items-center space-x-4 border-2 border-[#6b5a45] bg-[#1a1814] p-4 rounded">
            <div class="flex h-12 w-12 items-center justify-center rounded-full border-2 bg-[#c4941f] text-[#1a1814]">
              <Icon :icon="badges.rank.icon" class="h-6 w-6" />
            </div>
            <div>
              <div class="font-bold text-[#f5f0e6] text-lg">{{ badges.rank.name }}</div>
              <div class="font-mono-retro text-xs text-[#8b8178]">{{ badges.rank.description }}</div>
            </div>
          </div>
        </div>

        <!-- 成就徽章 -->
        <div class="mb-8">
          <h3 class="font-mono-retro text-sm text-[#c4b8a8] mb-4">
            > 成就徽章 ({{ badges.achievement.length }})
            <span class="ml-2 text-[#6b5a45]">·</span>
            <span class="text-[#6b5a45]">稀有度: {{ getBadgeRarityText('legendary') }} {{ badges.achievement.filter((b: any) => b.rarity === 'legendary').length }} {{ getBadgeRarityText('rare') }} {{ badges.achievement.filter((b: any) => b.rarity === 'rare').length }} {{ getBadgeRarityText('epic') }} {{ badges.achievement.filter((b: any) => b.rarity === 'epic').length }} {{ getBadgeRarityText('common') }} {{ badges.achievement.filter((b: any) => b.rarity === 'common').length }}</span>
          </h3>
          <div v-if="badges.achievement.length === 0" class="py-8 text-center font-mono-retro text-[#6b5a45]">
            > 暂无成就徽章
          </div>
          <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              v-for="badge in badges.achievement"
              :key="badge.id"
              class="border-2 rounded p-3 text-center hover:border-[#c4941f] transition-all"
              :class="getBadgeRarityClass(badge.rarity)"
            >
              <div class="flex h-10 w-10 items-center justify-center mx-auto mb-2 rounded-full bg-[#242220]">
                <Icon :icon="badge.icon" class="h-6 w-6 text-[#f5f0e6]" />
              </div>
              <div class="font-bold text-[#f5f0e6] text-sm mb-1">{{ badge.name }}</div>
              <div class="font-mono-retro text-xs text-[#8b8178]">{{ getBadgeRarityText(badge.rarity) }}</div>
            </div>
          </div>
        </div>

        <!-- 行为徽章 -->
        <div>
          <h3 class="font-mono-retro text-sm text-[#c4b8a8] mb-4">
            > 行为徽章 ({{ badges.behavior.length }})
          </h3>
          <div v-if="badges.behavior.length === 0" class="py-8 text-center font-mono-retro text-[#6b5a45]">
            > 暂无行为徽章
          </div>
          <div v-else class="grid grid-cols-3 md:grid-cols-5 gap-3">
            <div
              v-for="badge in badges.behavior"
              :key="badge.id"
              class="border-2 border-[#6b5a45] bg-[#1a1814] rounded p-3 text-center hover:border-[#c4941f] transition-all"
            >
              <div class="flex h-8 w-8 items-center justify-center mx-auto mb-2 rounded bg-[#242220]">
                <Icon :icon="badge.icon" class="h-4 w-4 text-[#f5f0e6]" />
              </div>
              <div class="font-bold text-[#f5f0e6] text-xs">{{ badge.name }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- RP 变动历史 -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="title-section flex items-center">
            <Icon icon="mdi:history" class="mr-3 h-6 w-6 text-[#c4941f]" />
            RP 变动历史
            <span class="ml-3 font-mono-retro text-sm font-normal text-[#8b8178]">
              (共 {{ history.length }} 条记录)
            </span>
          </h2>
        </div>

        <div v-if="history.length === 0" class="py-12 text-center font-mono-retro text-[#8b8178] bg-grid">
          > 暂无记录
        </div>

        <div v-else>
          <!-- 记录列表 -->
          <div class="space-y-3 mb-6">
            <div
              v-for="record in paginatedHistory"
              :key="record.id"
              class="flex items-center justify-between rounded border border-[#6b5a45] bg-[#1a1814] p-4 hover:border-[#c4941f] transition-all"
            >
              <div class="flex items-center space-x-4">
                <div class="flex h-10 w-10 items-center justify-center rounded border-2 border-[#6b5a45] bg-[#242220]">
                  <Icon :icon="getScoreIcon(record.reason)" class="h-5 w-5" :class="getScoreColor(record.scoreChange, record.reason)" />
                </div>
                <div>
                  <div class="font-medium text-[#f5f0e6]">{{ record.description }}</div>
                  <div class="font-mono-retro text-xs text-[#8b8178] flex items-center">
                    <Icon icon="mdi:calendar" class="mr-1 h-3 w-3" />
                    {{ formatTime(record.createdAt) }}
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="font-mono-retro text-xl font-bold" :class="getScoreColor(record.scoreChange, record.reason)">
                  {{ getScoreText(record.scoreChange) }}
                </div>
              </div>
            </div>
          </div>

          <!-- 分页控件 -->
          <div v-if="totalPages > 1" class="flex items-center justify-between border-t-2 border-[#6b5a45] pt-4">
            <!-- 上一页 -->
            <button
              v-if="currentPage > 1"
              @click="prevPage"
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
                <template v-for="(page, index) in displayedPages" :key="index">
                  <span v-if="page === '...'" class="w-8 h-8 flex items-center justify-center font-mono-retro text-[#8b8178]">...</span>
                  <button
                    v-else
                    @click="goToPage(Number(page))"
                    class="w-8 h-8 rounded font-mono-retro text-sm transition-all"
                    :class="page === currentPage
                      ? 'bg-[#c4941f] text-[#1a1814] font-bold'
                      : 'border-2 border-[#6b5a45] text-[#8b8178] hover:border-[#c4941f] hover:text-[#c4941f]'"
                  >
                    {{ page }}
                  </button>
                </template>
              </div>
              <span class="font-mono-retro text-sm text-[#8b8178]">页 / 共 {{ totalPages }} 页</span>
            </div>

            <!-- 下一页 -->
            <button
              v-if="currentPage < totalPages"
              @click="nextPage"
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
  </div>
</template>

<style scoped>
/* 无额外样式 */
</style>
