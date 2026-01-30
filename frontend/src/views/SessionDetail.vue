<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import { sessionsApi } from '../api';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useUserStore } from '../stores/user';
import { getGameCardBackground, getSessionHeaderBackground, getGamePortraitBackground } from '../utils/steam';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const session = ref<any>(null);
const loading = ref(false);
const voting = ref(false);
const excuseReason = ref('');
const selectedGameIndex = ref<number | null>(null);

// 结算相关
const settling = ref(false);
const showSettleForm = ref(false);
const attendances = ref<Record<string, boolean>>({});

// 格式化时间
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
};

// 状态显示信息（聚合）
const displayStatusInfo = computed(() => {
  const status = displayStatus.value;
  
  if (status === 'voting') {
    if (hasVoted.value) {
      return { text: '已投票', class: 'badge-info', icon: 'mdi:check-circle-outline' };
    }
    return { text: '投票中', class: 'badge-warning', icon: 'mdi:vote' };
  }
  
  const statusMap: Record<string, any> = {
    expired: { text: '已截止', class: 'badge-secondary', icon: 'mdi:clock-alert' },
    confirmed: { text: '已成行', class: 'badge-success', icon: 'mdi:check-circle' },
    playing: { text: '游玩中', class: 'badge-primary', icon: 'mdi:play' },
    settled: { text: '已结算', class: 'badge-success', icon: 'mdi:check' },
    cancelled: { text: '已流局', class: 'badge-danger', icon: 'mdi:alert-circle' },
  };
  
  return statusMap[status] || { text: status, class: 'badge-secondary', icon: 'mdi:help-circle' };
});

// 是否是发起人
const isInitiator = computed(() => {
  const userId = userStore.user?.id;
  return session.value && session.value.initiator && session.value.initiator.id === userId;
});

// 是否是管理员
const isAdmin = computed(() => userStore.user?.isAdmin || false);

// 是否可以删除活动
// 投票中：发起人或管理员可删除
// 已结算/已流局：仅管理员可删除
const canDelete = computed(() => {
  if (!session.value) return false;
  const isVoting = session.value.status === 'voting';
  if (isVoting) {
    return isInitiator.value || isAdmin.value;
  } else {
    // 已结算或已流局，只有管理员能删除
    return isAdmin.value;
  }
});

// 是否可以投票（未投票状态且未截止）
const canVote = computed(() => {
  return session.value && session.value.status === 'voting' && !isVotingExpired.value && !currentUserParticipant.value?.isExcused && !hasVoted.value;
});

// 解析游戏选项（兼容字符串数组和对象数组）
const parsedGameOptions = computed(() => {
  if (!session.value?.gameOptions) return [];

  return session.value.gameOptions.map((opt: string | { name: string, link?: string }) => {
    if (typeof opt === 'string') {
      return { name: opt, link: undefined };
    }
    return opt;
  });
});

// 安全地获取 finalGame 名称（兼容对象和字符串格式）
const finalGameName = computed(() => {
  if (!session.value?.finalGame) return null;
  if (typeof session.value.finalGame === 'string') {
    return session.value.finalGame;
  }
  if (typeof session.value.finalGame === 'object' && session.value.finalGame?.name) {
    return session.value.finalGame.name;
  }
  return null;
});

// 显示投票结果（投票中或已投票都可以看结果，或者已截止）
const showVoteResults = computed(() => {
  return session.value && session.value.status === 'voting' && !currentUserParticipant.value?.isExcused;
});

// 最终游戏的图片（用于背景图）
const finalGameImages = computed(() => {
  // 1. 优先使用 finalGame
  if (session.value?.finalGame) {
    if (typeof session.value.finalGame === 'string') {
      return parsedGameOptions.value.find(opt => opt.name === session.value.finalGame)?.images || null;
    }
    if (typeof session.value.finalGame === 'object') {
      return session.value.finalGame.images || parsedGameOptions.value.find(opt => opt.name === session.value.finalGame.name)?.images || null;
    }
  }
  
  // 2. 如果没有 finalGame，回退到第一个选项（与显示的标题逻辑一致）
  if (parsedGameOptions.value.length > 0) {
    return parsedGameOptions.value[0].images || null;
  }
  
  return null;
});

// 最终游戏的链接（用于背景图）
const finalGameLink = computed(() => {
  // 1. 优先使用 finalGame
  if (session.value?.finalGame) {
    if (typeof session.value.finalGame === 'string') {
      return parsedGameOptions.value.find(opt => opt.name === session.value.finalGame)?.link || null;
    }
    if (typeof session.value.finalGame === 'object') {
      return session.value.finalGame.link || parsedGameOptions.value.find(opt => opt.name === session.value.finalGame.name)?.link || null;
    }
  }
  
  // 2. 如果没有 finalGame，回退到第一个选项（与显示的标题逻辑一致）
  if (parsedGameOptions.value.length > 0) {
    return parsedGameOptions.value[0].link || null;
  }
  
  return null;
});

// 是否已投票
const hasVoted = computed(() => {
  const participant = session.value?.participants?.find((p: any) => {
    const userId = userStore.user?.id;
    return p.user?.id === userId;
  });
  return participant?.votedAt;
});

// 投票是否已截止
const isVotingExpired = computed(() => {
  if (!session.value?.endVotingTime) return false;
  return new Date(session.value.endVotingTime) < new Date();
});

// 显示状态（考虑投票截止时间）
const displayStatus = computed(() => {
  if (session.value?.status === 'voting' && isVotingExpired.value) {
    return 'expired';
  }
  return session.value?.status;
});

// 获取当前用户的参与记录
const currentUserParticipant = computed(() => {
  const userId = userStore.user?.id;
  return session.value?.participants?.find((p: any) => p.user?.id === userId);
});

// 是否可以结算（发起人 + 所有人已投票或请假）
const canSettle = computed(() => {
  if (!isInitiator.value || session.value?.status !== 'voting') {
    return false;
  }
  // 检查是否所有参与者都已投票或请假
  return session.value?.participants?.every((p: any) => p.votedAt || p.isExcused);
});

// 计算每个游戏的得票数
const voteResults = computed(() => {
  if (!session.value?.gameOptions) return [];

  const results = parsedGameOptions.value.map((opt: any, index: number) => ({
    gameIndex: index,
    gameName: opt.name,
    voteCount: 0,
    voters: [] as Array<{ id: string; displayName: string }>,
  }));

  session.value.participants?.forEach((p: any) => {
    if (p.voteRanking && !p.isExcused) {
      try {
        const ranking = JSON.parse(p.voteRanking);
        if (Array.isArray(ranking) && ranking.length > 0) {
          const votedIndex = Number(ranking[0]);
          if (results[votedIndex]) {
            results[votedIndex].voteCount++;
            results[votedIndex].voters.push({ id: p.user.id, displayName: p.user.displayName });
          }
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
  });

  return results.sort((a, b) => {
    // 优先将最终确定的游戏排在前面
    const finalName = finalGameName.value;
    if (finalName) {
      if (a.gameName === finalName) return -1;
      if (b.gameName === finalName) return 1;
    }
    // 其次按票数降序
    return b.voteCount - a.voteCount;
  });
});

// 计算总票数
const totalVotes = computed(() => {
  return voteResults.value.reduce((sum, result) => sum + result.voteCount, 0);
});

// 获取用户的选择
const getUserVote = computed(() => {
  const participant = currentUserParticipant.value;
  if (participant?.voteRanking && !participant.isExcused) {
    try {
      const ranking = JSON.parse(participant.voteRanking);
      if (Array.isArray(ranking) && ranking.length > 0) {
        return Number(ranking[0]);
      }
    } catch (e) {
      // 忽略解析错误
    }
  }
  return null;
});

// 提交投票
const handleVote = async () => {
  if (selectedGameIndex.value === null) {
    ElMessage.warning('请选择一个游戏');
    return;
  }

  voting.value = true;
  try {
    await sessionsApi.vote(route.params.id as string, {
      gameIndex: selectedGameIndex.value,
    });
    ElMessage.success('投票成功！');
    // 触发全局刷新事件，通知其他用户
    window.dispatchEvent(new CustomEvent('gamepact:refresh'));
    await fetchSession();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '投票失败');
  } finally {
    voting.value = false;
  }
};

// 请假
const handleExcuse = async () => {
  try {
    await ElMessageBox.prompt('请输入请假原因（可选）', '请假', {
      confirmButtonText: '确定请假',
      cancelButtonText: '取消',
      inputPlaceholder: '临时有事',
      inputPattern: /.*/,
      closeOnClickModal: false,
    });
  } catch {
    return;
  }

  const reason = (document.querySelector('.el-message-box__input input') as HTMLInputElement)?.value || '';

  voting.value = true;
  try {
    await sessionsApi.excuse(route.params.id as string, { reason });
    ElMessage.success('请假成功！');
    excuseReason.value = '';
    // 触发全局刷新事件，通知其他用户
    window.dispatchEvent(new CustomEvent('gamepact:refresh'));
    await fetchSession();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '请假失败');
  } finally {
    voting.value = false;
  }
};

// 开始结算
const startSettle = () => {
  showSettleForm.value = true;
  // 初始化到场状态：默认所有人到场（请假的人不算）
  session.value?.participants?.forEach((p: any) => {
    if (!p.isExcused) {
      attendances.value[p.user.id] = true;
    }
  });
};

// 提交结算
const handleSettle = async () => {
  settling.value = true;
  try {
    const attendancesData = session.value?.participants?.map((p: any) => ({
      userId: p.user.id,
      isPresent: p.isExcused ? false : attendances.value[p.user.id],
    }));

    // 先检查人数
    const actualAttendees = attendancesData.filter((a: any) => a.isPresent).length;
    const excusedCount = session.value?.participants?.filter((p: any) => p.isExcused).length || 0;
    const pigeonCount = attendancesData.filter((a: any) => !a.isPresent).length - excusedCount;

    // 如果人数不够，弹窗确认是否流局
    if (actualAttendees < session.value?.minPlayers) {
      try {
        await ElMessageBox.confirm(
          `实际到场：${actualAttendees}人\n请假：${excusedCount}人\n放鸽子：${pigeonCount}人\n\n人数不足（最低${session.value?.minPlayers}人），是否流局？\n流局后照常处理积分。`,
          '人数不足，确认流局',
          {
            confirmButtonText: '确认流局',
            cancelButtonText: '取消',
            type: 'warning',
            closeOnClickModal: false,
          }
        );

        // 调用流局接口
        await sessionsApi.cancel(route.params.id as string, {
          attendances: attendancesData,
        });
        ElMessage.success('活动已流局！');
      } catch (action) {
        if (action === 'cancel') {
          settling.value = false;
          return; // 用户取消，不做任何操作
        }
        throw action;
      }
    } else {
      // 人数足够，正常结算
      await sessionsApi.settle(route.params.id as string, {
        attendances: attendancesData,
      });
      ElMessage.success('结算成功！');
    }

    showSettleForm.value = false;
    // 触发全局刷新事件，通知其他用户
    window.dispatchEvent(new CustomEvent('gamepact:refresh'));
    await fetchSession();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '操作失败');
  } finally {
    settling.value = false;
  }
};

// 获取活动详情
const fetchSession = async () => {
  loading.value = true;
  try {
    const response = await sessionsApi.get(route.params.id as string);
    session.value = response.data;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '获取活动详情失败');
    router.push('/dashboard');
  } finally {
    loading.value = false;
  }
};

// 删除活动
const handleDelete = async () => {
  const isHistory = session.value?.status !== 'voting';
  const confirmText = isHistory
    ? '确定要删除这条历史记录吗？此操作不可撤销，且会同时删除相关的积分记录。'
    : '确定要删除这个活动吗？此操作不可撤销。';
  const title = isHistory ? '删除历史记录' : '删除活动';

  try {
    await ElMessageBox.confirm(confirmText, title, {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      closeOnClickModal: false,
    });

    // 先移除事件监听器，防止后续通知触发刷新
    window.removeEventListener('gamepact:refresh', handleRefresh);

    await sessionsApi.delete(route.params.id as string);
    ElMessage.success('活动已删除');
    // 跳转到 dashboard
    router.push('/dashboard');
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.error || '删除活动失败');
      // 如果删除失败，恢复监听器
      window.addEventListener('gamepact:refresh', handleRefresh);
    }
  }
};

// 刷新数据的处理函数
const handleRefresh = () => {
  fetchSession();
};

onMounted(() => {
  fetchSession();

  // 监听刷新事件
  window.addEventListener('gamepact:refresh', handleRefresh);
});

onUnmounted(() => {
  // 移除刷新事件监听
  window.removeEventListener('gamepact:refresh', handleRefresh);
});
</script>

<template>
  <div class="page-container">
    <div v-if="loading" class="card p-12">
      <div class="flex flex-col items-center justify-center">
        <div class="loading-spinner mb-4"></div>
        <p class="font-mono-retro text-[#8b8178]">LOADING...</p>
      </div>
    </div>

    <div v-else-if="session" class="max-w-4xl mx-auto space-y-6">
      <!-- 返回按钮 -->
      <button
        @click="router.back()"
        class="btn btn-ghost"
      >
        <Icon icon="mdi:arrow-left" class="mr-2 h-5 w-5" />
        返回
      </button>

      <!-- 活动信息卡片 -->
      <div class="card p-6 relative overflow-hidden">
        <!-- Steam 背景淡化层 -->
        <div v-if="finalGameLink || finalGameImages" class="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none mix-blend-luminosity"
             :style="{ ...getSessionHeaderBackground(finalGameLink, finalGameImages), maskImage: 'linear-gradient(to bottom, black 0%, transparent 90%)', webkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 90%)' }"></div>

        <div class="relative z-10">
          <div class="flex items-start justify-between mb-6">
            <div class="flex-1 min-w-0">
              <div class="flex flex-col gap-2 mb-3">
                <h1 class="title-display text-[#f5f0e6] break-words">
                  {{ finalGameName || parsedGameOptions[0]?.name || '未定游戏' }}
                </h1>
                <div class="flex items-center gap-3">
                              <span class="badge shrink-0" :class="displayStatusInfo.class">
                                <Icon :icon="displayStatusInfo.icon" class="mr-1.5 h-3.5 w-3.5" />
                                {{ displayStatusInfo.text }}
                              </span>
                </div>
              </div>
              <p class="font-mono-retro text-[#8b8178]">
                由 {{ session.initiator?.displayName }} 发起
              </p>
            </div>
          <!-- 删除活动按钮（发起人或管理员可见） -->
          <button
            v-if="canDelete"
            @click="handleDelete"
            class="btn btn-danger"
          >
            <Icon icon="mdi:delete" class="mr-2 h-4 w-4" />
            {{ session.status === 'voting' ? '删除活动' : '删除记录' }}
          </button>
          </div>

        <div class="grid grid-cols-2 gap-4 border-t-2 border-[#6b5a45] pt-6">
          <div class="flex items-center space-x-3">
            <Icon icon="mdi:calendar" class="h-6 w-6 text-[#c4941f]" />
            <div>
              <div class="text-xs text-[#8b8178]">开始时间</div>
              <div class="font-mono-retro text-[#f5f0e6]">{{ formatTime(session.startTime) }}</div>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <Icon icon="mdi:timer" class="h-6 w-6 text-[#a34d1d]" />
            <div>
              <div class="text-xs text-[#8b8178]">投票截止</div>
              <div class="font-mono-retro text-[#f5f0e6]">{{ formatTime(session.endVotingTime) }}</div>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <Icon icon="mdi:account-group" class="h-6 w-6 text-[#6b9b7a]" />
            <div>
              <div class="text-xs text-[#8b8178]">参与人数</div>
              <div class="font-mono-retro text-[#f5f0e6]">{{ session.participants?.length || 0 }} / {{ session.minPlayers }}</div>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <Icon icon="mdi:game-controller-variant" class="h-6 w-6 text-[#c4941f]" />
            <div>
              <div class="text-xs text-[#8b8178]">游戏选项</div>
              <div class="font-mono-retro text-[#f5f0e6]">{{ parsedGameOptions.length || 0 }} 个</div>
            </div>
          </div>
        </div>

        <!-- 底部脚注时间条 -->
        <div class="mt-6 pt-4 border-t border-[#2d2a26] flex flex-col items-end space-y-1 font-mono-retro text-[10px] text-[#4a4540] uppercase tracking-wider transition-all duration-150">
          <span class="block transition-all duration-150 hover:text-[#c4b8a8] hover:scale-110 origin-right cursor-default">CREATED: {{ formatTime(session.createdAt) }}</span>
          <span v-if="session.status === 'settled' || session.status === 'cancelled'" class="block transition-all duration-150 hover:text-[#c4b8a8] hover:scale-110 origin-right cursor-default">
            {{ session.status === 'settled' ? 'SETTLED' : 'CANCELLED' }}: {{ formatTime(session.updatedAt) }}
          </span>
        </div>
      </div>
      </div>

      <!-- 投票区域 -->
      <div v-if="session.status === 'voting'" class="card p-6">
        <h2 class="title-section flex items-center">
          <Icon icon="mdi:vote" class="mr-3 h-6 w-6 text-[#c4941f]" />
          游戏投票
        </h2>

        <!-- 当前用户状态 -->
        <div class="mb-6 flex items-center justify-between border-2 border-[#6b5a45] bg-[#1a1814] p-4 rounded">
          <div class="flex-1">
            <div class="flex items-center mb-2">
              <span class="font-mono-retro text-[#8b8178]">当前状态：</span>
              <span v-if="currentUserParticipant?.isExcused" class="ml-3 badge badge-excused">
                <Icon icon="mdi:clock-alert" class="mr-1.5 h-3.5 w-3.5" />
                已请假
              </span>
              <span v-else-if="isVotingExpired" class="ml-3 badge badge-secondary">
                <Icon icon="mdi:clock-alert" class="mr-1.5 h-3.5 w-3.5" />
                投票已截止
              </span>
              <span v-else-if="hasVoted" class="ml-3 badge badge-success">
                <Icon icon="mdi:check-circle" class="mr-1.5 h-3.5 w-3.5" />
                已投票
              </span>
              <span v-else class="ml-3 font-mono-retro text-[#6b5a45]">未投票</span>
            </div>
            <!-- 请假规则提示（仅在未请假且未截止时显示） -->
            <div v-if="!currentUserParticipant?.isExcused && !isVotingExpired" class="font-mono-retro text-xs text-[#6b5a45]">
              <Icon icon="mdi:information" class="mr-1 h-3 w-3 inline" />
              未投票：随时可请假 | 已投票：活动开始前2小时外可请假
            </div>
          </div>
          <!-- 请假按钮 -->
          <button
            v-if="!currentUserParticipant?.isExcused && !isInitiator && !isVotingExpired"
            @click="handleExcuse"
            :disabled="voting"
            class="btn btn-secondary"
          >
            <Icon icon="mdi:clock-alert" class="mr-2 h-4 w-4" />
            请假
          </button>
        </div>

        <!-- 投票表单 -->
        <div v-if="showVoteResults">
          <!-- 管理员提示 -->
          <div v-if="isAdmin" class="mb-6 border-2 border-[#a34d1d] bg-[#a34d1d]/10 p-4 text-center">
            <Icon icon="mdi:shield-alert" class="mr-2 h-6 w-6 text-[#a34d1d]" />
            <span class="font-mono-retro text-[#a34d1d]">管理员不能参与活动投票</span>
          </div>

          <!-- 投票已截止提示 -->
          <div v-else-if="isVotingExpired && !hasVoted" class="mb-6 border-2 border-[#a34d1d] bg-[#a34d1d]/10 p-8 text-center">
            <Icon icon="mdi:clock-alert" class="mx-auto mb-3 h-16 w-16 text-[#a34d1d]" />
            <h3 class="mb-2 title-subsection text-[#a34d1d]">投票已截止</h3>
            <p class="font-mono-retro text-[#8b8178]">您未在截止时间前完成投票</p>
          </div>

          <!-- 未投票状态 -->
          <div v-else-if="canVote">
            <p class="mb-6 font-mono-retro text-[#8b8178]">
              > 选择你最想玩的游戏，然后点击下方投票按钮
            </p>

            <!-- 游戏选项卡片网格 -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div
                v-for="(game, index) in parsedGameOptions"
                :key="game.name || index"
                @click="selectedGameIndex = index"
                class="game-card-with-bg border-2 border-[#6b5a45] bg-[#1a1814] rounded p-4 cursor-pointer hover:border-[#c4941f] transition-all relative overflow-hidden"
                :class="{ 'border-[#c4941f] bg-[#c4941f]/10': selectedGameIndex === index }"
              >
                <!-- 内容层级 -->
                <div class="relative z-10">
                  <!-- 游戏名和排名 -->
                  <div class="mb-3">
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-mono-retro text-xs font-bold text-[#8b8178]">
                        #{{ index + 1 }}
                      </span>
                    </div>
                    <h4 v-if="parsedGameOptions[index]?.link" class="font-bold text-sm leading-tight break-words">
                      <a
                        :href="parsedGameOptions[index].link"
                        target="_blank"
                        rel="noopener noreferrer"
                        @click.stop
                        class="text-[#c4941f] hover:text-[#d4a017] underline underline-offset-2 decoration-2"
                      >
                        {{ game.name }}
                        <Icon icon="mdi:open-in-new" class="h-3 w-3 inline ml-1" />
                      </a>
                    </h4>
                    <h4 v-else class="font-bold text-[#f5f0e6] text-sm leading-tight break-words">{{ game.name }}</h4>
                  </div>

                  <!-- 纵向进度条容器 -->
                  <div class="relative h-40 border-2 border-[#6b5a45] bg-[#1a1814] rounded p-2">
                    <!-- Steam 竖版背景 -->
                    <div v-if="game.link || game.images" class="absolute inset-0 bg-cover bg-center pointer-events-none rounded saturate-50 transition-opacity duration-300"
                         :style="{ ...getGamePortraitBackground(game.link, game.images), opacity: selectedGameIndex === index ? 0.7 : 0.25 }"></div>

                    <!-- 纵向进度条 -->
                    <div class="absolute left-0 bottom-0 w-full transition-all duration-500 ease-out">
                      <div
                        class="w-full rounded-t"
                        :class="selectedGameIndex === index ? 'bg-[#c4941f]' : 'bg-[#2d2a26]'"
                        :style="{ height: totalVotes > 0 ? ((voteResults.find(r => r.gameIndex === index)?.voteCount || 0) / totalVotes * 100) + '%' : '0%' }"
                      >
                        <!-- 网格纹理 -->
                        <div class="absolute inset-0 opacity-20" style="background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px);"></div>
                      </div>
                    </div>

                    <!-- 投票者头像圆圈（进度条上方） -->
                    <div v-if="voteResults.find(r => r.gameIndex === index)?.voters.length > 0" class="relative z-10 flex flex-wrap justify-center gap-1 px-1 pb-1">
                      <router-link
                        v-for="(voter, vIndex) in voteResults.find(r => r.gameIndex === index)!.voters.slice(0, 10)"
                        :key="voter.id"
                        :to="`/profile/${voter.id}`"
                        class="group relative no-underline"
                        @click.stop
                      >
                        <div
                          class="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-all"
                          :class="selectedGameIndex === index ? 'bg-[#c4941f] text-[#1a1814]' : 'bg-[#6b5a45] text-[#f5f0e6]'"
                        >
                          {{ voter.displayName[0] }}
                        </div>
                        <!-- 悬浮提示 -->
                        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20">
                          <div class="bg-[#242220] border-2 border-[#c4941f] px-2 py-1 rounded whitespace-nowrap">
                            <span class="font-mono-retro text-xs text-[#f5f0e6]">{{ voter.displayName }}</span>
                          </div>
                          <!-- 小三角 -->
                          <div class="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1 border-4 border-transparent border-t-[#c4941f]"></div>
                        </div>
                      </router-link>
                      <div
                        v-if="voteResults.find(r => r.gameIndex === index)!.voters.length > 10"
                        class="w-7 h-7 flex items-center justify-center rounded-full bg-[#6b5a45] text-[#f5f0e6] text-xs font-bold"
                        :title="voteResults.find(r => r.gameIndex === index)!.voters.slice(10).map(v => v.displayName).join('、')"
                      >
                        +{{ voteResults.find(r => r.gameIndex === index)!.voters.length - 10 }}
                      </div>
                    </div>
                    <div v-else class="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none">
                      <span class="font-mono-retro text-xs text-[#f5f0e6] opacity-80">暂无投票</span>
                    </div>
                  </div>

                  <!-- 票数和百分比 -->
                  <div class="mt-3 flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                      <span class="font-mono-retro text-lg font-bold" :class="selectedGameIndex === index ? 'text-[#c4941f]' : 'text-[#8b8178]'">
                        {{ voteResults.find(r => r.gameIndex === index)?.voteCount || 0 }}
                      </span>
                      <span class="text-xs text-[#6b5a45]">票</span>
                    </div>
                    <span class="font-mono-retro text-xs text-[#6b5a45]">
                      {{ totalVotes > 0 ? Math.round((voteResults.find(r => r.gameIndex === index)?.voteCount || 0) / totalVotes * 100) : 0 }}%
                    </span>
                  </div>

                  <!-- 选中标识 -->
                  <div v-if="selectedGameIndex === index" class="mt-2 text-center">
                    <Icon icon="mdi:check-circle" class="h-5 w-5 text-[#c4941f] inline" />
                    <span class="ml-2 font-mono-retro text-xs text-[#c4941f]">已选择</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 提交投票按钮（仅选中时显示） -->
            <div v-if="selectedGameIndex !== null" class="mt-6 flex justify-end space-x-3">
              <!-- 取消选中按钮 -->
              <button
                @click="selectedGameIndex = null"
                class="btn btn-ghost"
              >
                <Icon icon="mdi:close" class="mr-2 h-5 w-5" />
                取消选中
              </button>
              <!-- 提交投票按钮 -->
              <button
                @click="handleVote"
                :disabled="voting"
                class="btn btn-primary"
              >
                <Icon v-if="voting" icon="mdi:loading" class="mr-2 h-5 w-5 animate-spin" />
                <Icon v-else icon="mdi:check-circle" class="mr-2 h-5 w-5" />
                <span v-if="voting">投票中...</span>
                <span v-else>提交投票</span>
              </button>
            </div>
          </div>

          <!-- 已投票状态：显示投票结果（只读） -->
          <div v-else-if="hasVoted">
            <div class="mb-6 border-2 border-[#6b9b7a] bg-[#6b9b7a]/10 p-4 text-center">
              <Icon icon="mdi:check-circle" class="mr-2 h-5 w-5 text-[#6b9b7a]" />
              <span class="font-mono-retro text-[#6b9b7a] break-words">您已投票：
                <a
                  v-if="parsedGameOptions[getUserVote]?.link"
                  :href="parsedGameOptions[getUserVote].link"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click.stop
                  class="text-[#6b9b7a] underline underline-offset-2 decoration-2 mx-1"
                >
                  {{ parsedGameOptions[getUserVote].name }}
                  <Icon icon="mdi:open-in-new" class="h-3 w-3 inline" />
                </a>
                <span v-else>{{ parsedGameOptions[getUserVote]?.name }}</span>
              </span>
            </div>

            <!-- 投票结果卡片网格（只读） -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div
                v-for="(game, index) in parsedGameOptions"
                :key="game.name || index"
                class="game-card-with-bg border-2 bg-[#1a1814] rounded p-4 relative overflow-hidden"
                :class="getUserVote === index ? 'border-[#c4941f]' : 'border-[#6b5a45]'"
              >
                <!-- 内容层级 -->
                <div class="relative z-10">
                  <!-- 游戏名和排名 -->
                  <div class="mb-3">
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-mono-retro text-xs font-bold" :class="getUserVote === index ? 'text-[#c4941f]' : 'text-[#8b8178]'">
                        #{{ index + 1 }}
                        <Icon v-if="getUserVote === index" icon="mdi:check" class="ml-1 h-3 w-3 inline" />
                      </span>
                    </div>
                    <h4 v-if="parsedGameOptions[index]?.link" class="font-bold text-sm leading-tight break-words">
                      <a
                        :href="parsedGameOptions[index].link"
                        target="_blank"
                        rel="noopener noreferrer"
                        @click.stop
                        class="text-[#c4941f] hover:text-[#d4a017] underline underline-offset-2 decoration-2"
                      >
                        {{ game.name }}
                        <Icon icon="mdi:open-in-new" class="h-3 w-3 inline ml-1" />
                      </a>
                    </h4>
                    <h4 v-else class="font-bold text-[#f5f0e6] text-sm leading-tight break-words">{{ game.name }}</h4>
                  </div>

                  <!-- 纵向进度条容器 -->
                  <div class="relative h-40 border-2 border-[#6b5a45] bg-[#1a1814] rounded p-2">
                    <!-- Steam 竖版背景 -->
                    <div v-if="game.link || game.images" class="absolute inset-0 bg-cover bg-center pointer-events-none rounded saturate-50 transition-opacity duration-300"
                         :style="{ ...getGamePortraitBackground(game.link, game.images), opacity: getUserVote === index ? 0.7 : 0.25 }"></div>

                    <!-- 纵向进度条 -->
                    <div class="absolute left-0 bottom-0 w-full transition-all duration-500 ease-out">
                      <div
                        class="w-full rounded-t"
                        :class="getUserVote === index ? 'bg-[#c4941f]' : 'bg-[#2d2a26]'"
                        :style="{ height: totalVotes > 0 ? ((voteResults.find(r => r.gameIndex === index)?.voteCount || 0) / totalVotes * 100) + '%' : '0%' }"
                      >
                        <!-- 网格纹理 -->
                        <div class="absolute inset-0 opacity-20" style="background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px);"></div>
                      </div>
                    </div>

                    <!-- 投票者头像圆圈（进度条上方） -->
                    <div v-if="voteResults.find(r => r.gameIndex === index)?.voters.length > 0" class="relative z-10 flex flex-wrap justify-center gap-1 px-1 pb-1">
                      <router-link
                        v-for="(voter, vIndex) in voteResults.find(r => r.gameIndex === index)!.voters.slice(0, 10)"
                        :key="voter.id"
                        :to="`/profile/${voter.id}`"
                        class="group relative no-underline"
                      >
                        <div
                          class="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-all"
                          :class="getUserVote === index ? 'bg-[#c4941f] text-[#1a1814]' : 'bg-[#6b5a45] text-[#f5f0e6]'"
                        >
                          {{ voter.displayName[0] }}
                        </div>
                        <!-- 悬浮提示 -->
                        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20">
                          <div class="bg-[#242220] border-2 border-[#c4941f] px-2 py-1 rounded whitespace-nowrap">
                            <span class="font-mono-retro text-xs text-[#f5f0e6]">{{ voter.displayName }}</span>
                          </div>
                          <!-- 小三角 -->
                          <div class="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1 border-4 border-transparent border-t-[#c4941f]"></div>
                        </div>
                      </router-link>
                      <div
                        v-if="voteResults.find(r => r.gameIndex === index)!.voters.length > 10"
                        class="w-7 h-7 flex items-center justify-center rounded-full bg-[#6b5a45] text-[#f5f0e6] text-xs font-bold"
                        :title="voteResults.find(r => r.gameIndex === index)!.voters.slice(10).map(v => v.displayName).join('、')"
                      >
                        +{{ voteResults.find(r => r.gameIndex === index)!.voters.length - 10 }}
                      </div>
                    </div>
                    <div v-else class="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none">
                      <span class="font-mono-retro text-xs text-[#f5f0e6] opacity-80">暂无投票</span>
                    </div>
                  </div>

                <!-- 票数和百分比 -->
                <div class="mt-3 flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <span class="font-mono-retro text-lg font-bold" :class="getUserVote === index ? 'text-[#c4941f]' : 'text-[#8b8178]'">
                      {{ voteResults.find(r => r.gameIndex === index)?.voteCount || 0 }}
                    </span>
                    <span class="text-xs text-[#6b5a45]">票</span>
                  </div>
                  <span class="font-mono-retro text-xs text-[#6b5a45]">
                    {{ totalVotes > 0 ? Math.round((voteResults.find(r => r.gameIndex === index)?.voteCount || 0) / totalVotes * 100) : 0 }}%
                  </span>
                </div>
                </div>
              </div>
            </div>

            <p class="mt-6 text-center font-mono-retro text-sm text-[#6b5a45]">等待其他参与者投票...</p>
          </div>
        </div>

        <!-- 已请假提示 -->
        <div v-else class="border-2 border-[#a34d1d] bg-[#a34d1d]/10 p-8 text-center">
          <Icon icon="mdi:clock-alert" class="mx-auto mb-3 h-16 w-16 text-[#a34d1d]" />
          <h3 class="mb-2 title-subsection text-[#a34d1d]">已请假</h3>
          <p class="font-mono-retro text-[#8b8178]">您已请假，无法参与此活动</p>
        </div>

        <!-- 最终确定的游戏（活动结束后显示） -->
        <div v-if="finalGameName && session.status !== 'voting'" class="mt-6 p-6 border-2" :class="session.status === 'settled' ? 'border-[#c4941f] bg-[#c4941f]/10' : 'border-[#a34d1d] bg-[#a34d1d]/10'">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <Icon :icon="session.status === 'settled' ? 'mdi:trophy' : 'mdi:alert-circle'" class="h-10 w-10" :class="session.status === 'settled' ? 'text-[#c4941f]' : 'text-[#a34d1d]'" />
              <div>
                <h3 class="title-subsection" :class="session.status === 'settled' ? 'text-[#c4941f]' : 'text-[#a34d1d]'">
                  {{ session.status === 'settled' ? '活动成功完成' : '活动已流局' }}
                </h3>
                <p class="font-mono-retro text-sm text-[#8b8178]">最终确定的游戏</p>
              </div>
            </div>
            <div class="text-right">
              <div v-if="finalGameName && parsedGameOptions.find(o => o.name === finalGameName)?.link" class="title-display break-words">
                <a
                  :href="parsedGameOptions.find(o => o.name === finalGameName)!.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click.stop
                  class="text-[#c4941f] hover:text-[#d4a017] underline underline-offset-2 decoration-2"
                >
                  {{ finalGameName }}
                  <Icon icon="mdi:open-in-new" class="h-4 w-4 inline ml-1" />
                </a>
              </div>
              <div v-else class="title-display text-[#f5f0e6] break-words">{{ finalGameName }}</div>
              <div class="font-mono-retro text-xs uppercase" :class="session.status === 'settled' ? 'text-[#6b9b7a]' : 'text-[#a34d1d]'">
                {{ session.status === 'settled' ? '成功' : '流局' }}
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- 最终投票结果（仅在非投票状态显示） -->
      <div v-if="session.status !== 'voting' && (voteResults.length > 0 || finalGameName)" class="card p-6">
        <h2 class="title-section flex items-center">
          <Icon icon="mdi:chart-bar" class="mr-3 h-6 w-6 text-[#c4941f]" />
          最终投票结果
          <span class="ml-3 font-mono-retro text-lg font-normal text-[#8b8178]">共 {{ totalVotes }} 票</span>
        </h2>

        <!-- 每个游戏单独一个卡片 -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div
            v-for="(result, index) in voteResults"
            :key="result.gameIndex"
            class="game-card-with-bg border-2 border-[#6b5a45] bg-[#1a1814] rounded p-4 hover:border-[#c4941f] transition-all relative overflow-hidden"
            :class="{ 'border-[#c4941f] bg-[#c4941f]/10': index === 0 && result.voteCount > 0 }"
          >
            <!-- 内容层级 -->
            <div class="relative z-10">
              <!-- 游戏名 -->
              <div class="mb-3">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-mono-retro text-xs font-bold" :class="index === 0 && result.voteCount > 0 ? 'text-[#c4941f]' : 'text-[#8b8178]'">
                    #{{ index + 1 }}
                  </span>
                </div>
                <h4 v-if="parsedGameOptions[result.gameIndex]?.link" class="font-bold text-sm leading-tight break-words">
                  <a
                    :href="parsedGameOptions[result.gameIndex].link"
                    target="_blank"
                    rel="noopener noreferrer"
                    @click.stop
                    class="text-[#c4941f] hover:text-[#d4a017] underline underline-offset-2 decoration-2"
                  >
                    {{ result.gameName }}
                    <Icon icon="mdi:open-in-new" class="h-3 w-3 inline ml-1" />
                  </a>
                </h4>
                <h4 v-else class="font-bold text-[#f5f0e6] text-sm leading-tight break-words">{{ result.gameName }}</h4>
              </div>

              <!-- 纵向进度条容器 -->
              <div class="relative h-40 border-2 border-[#6b5a45] bg-[#1a1814] rounded p-2">
                <!-- Steam 竖版背景 -->
                <div v-if="parsedGameOptions[result.gameIndex]?.link || parsedGameOptions[result.gameIndex]?.images" class="absolute inset-0 bg-cover bg-center pointer-events-none rounded saturate-50"
                     :style="{ 
                       ...getGamePortraitBackground(parsedGameOptions[result.gameIndex].link, parsedGameOptions[result.gameIndex].images), 
                       opacity: (finalGameName && result.gameName === finalGameName) || (!finalGameName && index === 0 && result.voteCount > 0) ? 0.7 : 0.25 
                     }"></div>

                <!-- 纵向进度条 -->
                <div class="absolute left-0 bottom-0 w-full transition-all duration-500 ease-out">
                  <div
                    class="w-full rounded-t"
                    :class="index === 0 && result.voteCount > 0 ? 'bg-[#c4941f]' : 'bg-[#2d2a26]'"
                    :style="{ height: totalVotes > 0 ? (result.voteCount / totalVotes * 100) + '%' : '0%' }"
                  >
                    <!-- 网格纹理 -->
                    <div class="absolute inset-0 opacity-20" style="background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px);"></div>
                  </div>
                </div>

                <!-- 投票者头像圆圈（进度条上方） -->
                <div v-if="result.voters.length > 0" class="relative z-10 flex flex-wrap justify-center gap-1 px-1 pb-1">
                  <router-link
                    v-for="(voter, vIndex) in result.voters.slice(0, 10)"
                    :key="voter.id"
                    :to="`/profile/${voter.id}`"
                    class="group relative no-underline"
                  >
                    <div
                      class="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-all"
                      :class="index === 0 && result.voteCount > 0 ? 'bg-[#c4941f] text-[#1a1814]' : 'bg-[#6b5a45] text-[#f5f0e6]'"
                    >
                      {{ voter.displayName[0] }}
                    </div>
                    <!-- 悬浮提示 -->
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20">
                      <div class="bg-[#242220] border-2 border-[#c4941f] px-2 py-1 rounded whitespace-nowrap">
                        <span class="font-mono-retro text-xs text-[#f5f0e6]">{{ voter.displayName }}</span>
                      </div>
                      <!-- 小三角 -->
                      <div class="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1 border-4 border-transparent border-t-[#c4941f]"></div>
                    </div>
                  </router-link>
                  <div
                    v-if="result.voters.length > 10"
                    class="w-7 h-7 flex items-center justify-center rounded-full bg-[#6b5a45] text-[#f5f0e6] text-xs font-bold"
                    :title="result.voters.slice(10).map(v => v.displayName).join('、')"
                  >
                    +{{ result.voters.length - 10 }}
                  </div>
                </div>
                <div v-else class="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none">
                  <span class="font-mono-retro text-xs text-[#f5f0e6] opacity-80">暂无投票</span>
                </div>
              </div>

              <!-- 票数和百分比 -->
              <div class="mt-3 flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <span class="font-mono-retro text-lg font-bold" :class="index === 0 && result.voteCount > 0 ? 'text-[#c4941f]' : 'text-[#8b8178]'">
                    {{ result.voteCount }}
                  </span>
                  <span class="text-xs text-[#6b5a45]">票</span>
                </div>
                <span class="font-mono-retro text-xs text-[#6b5a45]">
                  {{ totalVotes > 0 ? Math.round(result.voteCount / totalVotes * 100) : 0 }}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 结算区域（仅发起人可见，且发起人已投票） -->
      <div v-if="isInitiator && session.status === 'voting' && hasVoted" class="card p-6">
        <h2 class="title-section flex items-center">
          <Icon icon="mdi:calculator" class="mr-3 h-6 w-6 text-[#c4941f]" />
          发起人结算
        </h2>

        <!-- 发起人结算按钮 -->
        <div v-if="canSettle && !showSettleForm" class="border-2 border-[#6b9b7a] bg-[#6b9b7a]/10 p-6 text-center">
          <Icon icon="mdi:check-circle" class="mx-auto mb-3 h-12 w-12 text-[#6b9b7a]" />
          <p class="mb-4 font-mono-retro text-sm text-[#6b9b7a]">所有参与者已完成投票或请假，您可以开始结算</p>
          <button
            @click="startSettle"
            class="btn btn-primary"
          >
            <Icon icon="mdi:calculator" class="mr-2 h-5 w-5" />
            开始结算
          </button>
        </div>

        <!-- 结算表单 -->
        <div v-if="showSettleForm" class="mt-6 border-2 border-[#6b5a45] bg-[#1a1814] p-6">
          <p class="mb-6 font-mono-retro text-sm text-[#8b8178]">请确认每位参与者的到场情况</p>

          <div class="space-y-3">
            <div
              v-for="participant in session.participants"
              :key="participant.id"
              class="flex items-center justify-between border border-[#6b5a45] bg-[#242220] p-4"
            >
              <div class="flex items-center space-x-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#c4941f] bg-[#1a1814] text-lg font-bold text-[#c4941f]">
                  {{ participant.user.displayName[0] }}
                </div>
                <div>
                  <div class="font-medium text-[#f5f0e6] text-lg">{{ participant.user.displayName }}</div>
                  <div v-if="participant.isExcused" class="font-mono-retro text-sm text-[#a34d1d]">已请假</div>
                  <div v-else class="font-mono-retro text-sm text-[#8b8178]">需确认到场</div>
                </div>
              </div>
              <div v-if="!participant.isExcused" class="flex items-center space-x-3">
                <label class="flex cursor-pointer items-center space-x-2">
                  <input
                    type="checkbox"
                    :checked="attendances[participant.user.id]"
                    @change="attendances[participant.user.id] = $event.target.checked"
                    class="h-6 w-6 accent-[#c4941f]"
                  />
                  <span class="font-mono-retro text-sm text-[#f5f0e6] font-medium">已到场</span>
                </label>
              </div>
              <div v-else class="font-mono-retro text-sm text-[#6b5a45] font-medium">请假不计分</div>
            </div>
          </div>

          <div class="mt-6 flex justify-end space-x-3">
            <button
              @click="showSettleForm = false"
              class="btn btn-ghost"
            >
              取消
            </button>
            <button
              @click="handleSettle"
              :disabled="settling"
              class="btn btn-primary"
            >
              <Icon v-if="settling" icon="mdi:loading" class="mr-2 h-5 w-5 animate-spin" />
              <Icon v-else icon="mdi:check-circle" class="mr-2 h-5 w-5" />
              <span v-if="settling">结算中...</span>
              <span v-else>确认结算</span>
            </button>
          </div>

          <!-- 积分规则说明 -->
          <div class="mt-6 border-2 border-[#6b5a45] bg-[#1a1814] p-4">
            <div class="mb-2 flex items-center font-medium text-[#c4b8a8]">
              <Icon icon="mdi:information" class="mr-2 h-5 w-5 text-[#c4941f]" />
              积分规则
            </div>
            <div class="grid grid-cols-3 gap-3 text-sm">
              <div class="flex items-center text-[#6b9b7a]">
                <Icon icon="mdi:plus-circle" class="mr-1 h-4 w-4" />
                <span>到场参与：+5 分</span>
              </div>
              <div class="flex items-center text-[#8b8178]">
                <Icon icon="mdi:minus-circle" class="mr-1 h-4 w-4" />
                <span>请假成功：0 分</span>
              </div>
              <div class="flex items-center text-[#a34d1d]">
                <Icon icon="mdi:alert-circle" class="mr-1 h-4 w-4" />
                <span>放鸽子：-20 分</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 参与者列表 -->
      <div class="card p-6">
        <h2 class="title-section flex items-center">
          <Icon icon="mdi:account-group" class="mr-3 h-6 w-6 text-[#c4941f]" />
          参与者
          <span class="ml-2 text-lg font-normal text-[#8b8178]">({{ session.participants?.length || 0 }} 人)</span>
        </h2>
        <div v-if="session.participants?.length === 0" class="py-8 text-center font-mono-retro text-[#8b8178]">
          > 暂无参与者
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="participant in session.participants"
            :key="participant.id"
            class="flex items-center justify-between border-2 border-[#6b5a45] bg-[#1a1814] p-4 hover:border-[#c4941f] transition-all"
          >
            <router-link :to="`/profile/${participant.user.id}`" class="flex items-center space-x-3 flex-1 no-underline">
              <div class="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#c4941f] bg-[#1a1814] text-lg font-bold text-[#c4941f]">
                {{ participant.user.displayName[0] }}
              </div>
              <div>
                <div class="font-medium text-[#f5f0e6] text-lg hover:text-[#c4941f] transition-colors">{{ participant.user.displayName }}</div>
                <div class="font-mono-retro text-sm text-[#c4941f] font-medium">{{ participant.user.rp }} RP</div>
              </div>
            </router-link>
            <div class="text-right">
              <!-- 结算后的状态 -->
              <span v-if="session.status === 'settled' || session.status === 'cancelled'" class="font-mono-retro text-sm">
                <span v-if="participant.isExcused" class="badge badge-excused">
                  <Icon icon="mdi:clock-alert" class="mr-1.5 h-3.5 w-3.5" />
                  已请假
                </span>
                <span v-else-if="participant.isPresent" class="badge badge-success">
                  <Icon icon="mdi:check-circle" class="mr-1.5 h-3.5 w-3.5" />
                  已到场
                </span>
                <span v-else class="badge badge-danger">
                  <Icon icon="mdi:emoticon-poop" class="mr-1.5 h-3.5 w-3.5" />
                  放鸽子
                </span>
              </span>
              <!-- 投票中的状态 -->
              <span v-else class="font-mono-retro text-sm">
                <span v-if="participant.isExcused" class="badge badge-excused">
                  <Icon icon="mdi:clock-alert" class="mr-1.5 h-3.5 w-3.5" />
                  已请假
                </span>
                <span v-else-if="participant.votedAt" class="badge badge-success">
                  <Icon icon="mdi:check-circle" class="mr-1.5 h-3.5 w-3.5" />
                  已投票
                </span>
                <span v-else class="text-[#6b5a45]">未投票</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 无额外样式 */
</style>
