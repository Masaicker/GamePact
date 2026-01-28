<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import { sessionsApi } from '../api';
import { ElMessage } from 'element-plus';
import { useUserStore } from '../stores/user';

const router = useRouter();
const userStore = useUserStore();

// 检查是否是管理员
const isAdmin = computed(() => userStore.user?.isAdmin || false);

interface GameOption {
  name: string;
  link?: string;
  showLinkInput?: boolean;
}

const gameOptions = ref<GameOption[]>([{ name: '', link: '', showLinkInput: false }]);
const startTime = ref('');
const endVotingTime = ref('');
const minPlayers = ref(2);
const loading = ref(false);

// 预设游戏相关
const presetGames = ref<any[]>([]);
const presetGameSearch = ref('');
const loadingPresetGames = ref(false);
const showPresetGameDialog = ref(false);

// 获取 Token
const getToken = () => localStorage.getItem('token');

// 加载预设游戏
const loadPresetGames = async () => {
  loadingPresetGames.value = true;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/preset-games`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      presetGames.value = data;
    }
  } catch (error) {
    // 静默失败
  } finally {
    loadingPresetGames.value = false;
  }
};

// 过滤后的预设游戏
const filteredPresetGames = computed(() => {
  if (!presetGameSearch.value.trim()) {
    return presetGames.value;
  }
  const query = presetGameSearch.value.toLowerCase();
  return presetGames.value.filter((game) =>
    game.name.toLowerCase().includes(query)
  );
});

// 添加预设游戏到选项
const addPresetGame = (game: any) => {
  // 查找完全空的对象（没名字也没链接）
  const emptyIndex = gameOptions.value.findIndex(
    opt => !opt.name?.trim() && !opt.link?.trim()
  );

  if (emptyIndex !== -1) {
    // 复用空对象
    gameOptions.value[emptyIndex] = {
      name: game.name,
      link: game.link || '',
      showLinkInput: false,
    };
  } else {
    // 创建新对象
    gameOptions.value.push({
      name: game.name,
      link: game.link || '',
      showLinkInput: false,
    });
  }

  // 不关闭弹窗，方便连续添加
  ElMessage.success(`已添加：${game.name}`);
};

// 添加游戏选项
const addGameOption = () => {
  gameOptions.value.push({ name: '', link: '', showLinkInput: false });
};

// 删除游戏选项
const removeGameOption = (index: number) => {
  if (gameOptions.value.length > 1) {
    gameOptions.value.splice(index, 1);
  }
};

// 切换链接输入显示
const toggleLinkInput = (index: number) => {
  gameOptions.value[index].showLinkInput = !gameOptions.value[index].showLinkInput;
};

// 提交创建
const handleSubmit = async () => {
  // 过滤空选项（只保留有名字的）
  const validOptions = gameOptions.value
    .filter(opt => opt.name?.trim())
    .map(({ name, link }) => ({ name: name.trim(), link: link?.trim() || undefined }));

  if (validOptions.length < 1) {
    ElMessage.warning('请至少填写一个游戏选项');
    return;
  }

  if (!startTime.value) {
    ElMessage.warning('请选择开始时间');
    return;
  }

  if (!endVotingTime.value) {
    ElMessage.warning('请设置投票截止时间');
    return;
  }

  if (minPlayers.value < 2) {
    ElMessage.warning('最小成行人数不能少于2人');
    return;
  }

  loading.value = true;
  try {
    const response = await sessionsApi.create({
      gameOptions: validOptions,
      startTime: startTime.value,
      endVotingTime: endVotingTime.value,
      minPlayers: minPlayers.value,
    });

    ElMessage.success('活动创建成功！');
    // 触发全局刷新事件，通知其他用户
    window.dispatchEvent(new CustomEvent('gamepact:refresh'));
    router.push('/dashboard');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '创建活动失败');
  } finally {
    loading.value = false;
  }
};

// 取消
const handleCancel = () => {
  router.push('/dashboard');
};

onMounted(() => {
  if (isAdmin.value) {
    ElMessage.warning('管理员不能发起活动');
    router.push('/dashboard');
  }
  loadPresetGames();
});
</script>

<template>
  <div class="page-container">
    <div class="max-w-3xl mx-auto">
      <!-- 返回按钮 -->
      <button
        @click="router.back()"
        class="btn btn-ghost mb-6"
      >
        <Icon icon="mdi:arrow-left" class="mr-2 h-5 w-5" />
        返回
      </button>

      <!-- 页面标题 -->
      <div class="mb-8">
        <h1 class="title-display mb-2 text-[#f5f0e6]">发起活动</h1>
        <p class="font-mono-retro text-[#8b8178]">> 创建一个新的游戏聚会活动</p>
      </div>

      <div class="card p-6">
        <form @submit.prevent="handleSubmit" class="space-y-8">
          <!-- 游戏选项 -->
          <div>
            <label class="mb-3 block font-mono-retro text-lg text-[#c4b8a8]">
              <Icon icon="mdi:game-controller-variant" class="mr-2 h-5 w-5 text-[#c4941f]" />
              游戏选项
              <span class="text-[#6b5a45]">（至少一个）</span>
            </label>
            <div class="space-y-3">
              <div v-for="(option, index) in gameOptions" :key="index" class="border-2 border-[#6b5a45] bg-[#1a1814] rounded p-4">
                <!-- 游戏名称行 -->
                <div class="flex items-center gap-3 mb-3">
                  <div class="flex-1">
                    <input
                      v-model="option.name"
                      type="text"
                      placeholder="> 输入游戏名称"
                      class="input-field"
                    />
                  </div>
                  <button
                    type="button"
                    @click="toggleLinkInput(index)"
                    class="btn btn-ghost"
                    title="添加链接"
                  >
                    <Icon :icon="option.showLinkInput ? 'mdi:chevron-up' : 'mdi:link'" class="h-5 w-5 mr-1" />
                    {{ option.showLinkInput ? '收起' : '添加链接' }}
                  </button>
                  <button
                    v-if="gameOptions.length > 1"
                    type="button"
                    @click="removeGameOption(index)"
                    class="btn btn-danger"
                    title="删除"
                  >
                    <Icon icon="mdi:close" class="h-5 w-5" />
                  </button>
                </div>

                <!-- 可展开的链接输入 -->
                <div v-if="option.showLinkInput" class="pl-4 border-l-2 border-[#6b5a45]">
                  <label class="mb-2 block font-mono-retro text-xs text-[#8b8178]">
                    游戏介绍链接（可选）
                  </label>
                  <input
                    v-model="option.link"
                    type="url"
                    placeholder="> https://example.com （Steam、游戏官网等）"
                    class="input-field"
                  />
                </div>
              </div>
            </div>
            <div class="mt-3 flex gap-3">
              <button
                type="button"
                @click="addGameOption"
                class="btn btn-ghost"
              >
                <Icon icon="mdi:plus" class="mr-2 h-5 w-5" />
                添加更多选项
              </button>
              <button
                type="button"
                @click="showPresetGameDialog = true"
                class="btn btn-ghost"
              >
                <Icon icon="mdi:gamepad-variant" class="mr-2 h-5 w-5" />
                从预设添加
              </button>
            </div>
          </div>

          <!-- 时间设置 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- 开始时间 -->
            <div>
              <label class="mb-3 block font-mono-retro text-lg text-[#c4b8a8]">
                <Icon icon="mdi:calendar" class="mr-2 h-5 w-5 text-[#6b9b7a]" />
                开始时间
              </label>
              <input
                v-model="startTime"
                type="datetime-local"
                class="input-field"
                :min="new Date().toISOString().slice(0, 16)"
              />
            </div>

            <!-- 投票截止时间 -->
            <div>
              <label class="mb-3 block font-mono-retro text-lg text-[#c4b8a8]">
                <Icon icon="mdi:timer" class="mr-2 h-5 w-5 text-[#a34d1d]" />
                投票截止时间
                <span class="text-[#6b5a45]">（必须早于开始时间）</span>
              </label>
              <input
                v-model="endVotingTime"
                type="datetime-local"
                class="input-field"
                :min="new Date().toISOString().slice(0, 16)"
              />
            </div>
          </div>

          <!-- 最小成行人数 -->
          <div>
            <label class="mb-3 block font-mono-retro text-lg text-[#c4b8a8]">
              <Icon icon="mdi:account-group" class="mr-2 h-5 w-5 text-[#c4941f]" />
              最小成行人数
            </label>
            <div class="flex items-center space-x-4">
              <input
                v-model.number="minPlayers"
                type="number"
                min="2"
                class="input-field w-32"
              />
              <p class="font-mono-retro text-sm text-[#8b8178]">
                达到此人数活动才会成行
              </p>
            </div>
          </div>

          <!-- 按钮 -->
          <div class="flex justify-end space-x-3 pt-6 border-t-2 border-[#6b5a45]">
            <button
              type="button"
              @click="handleCancel"
              class="btn btn-ghost"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="btn btn-primary"
            >
              <Icon v-if="loading" icon="mdi:loading" class="mr-2 h-5 w-5 animate-spin" />
              <Icon v-else icon="mdi:plus-circle" class="mr-2 h-5 w-5" />
              <span v-if="loading">创建中...</span>
              <span v-else>创建活动</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 预设游戏对话框 -->
    <teleport to="body">
      <div v-if="showPresetGameDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div class="card w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="title-subsection text-[#f5f0e6]">选择预设游戏</h3>
            <button @click="showPresetGameDialog = false" class="btn btn-ghost">
              <Icon icon="mdi:close" class="h-5 w-5" />
            </button>
          </div>

          <!-- 搜索框 -->
          <div class="mb-4">
            <input
              v-model="presetGameSearch"
              type="text"
              class="input-field"
              placeholder="> 搜索预设游戏..."
            />
          </div>

          <!-- 游戏列表 -->
          <div v-if="loadingPresetGames" class="py-8 text-center font-mono-retro text-[#8b8178]">
            > 加载中...
          </div>

          <div
            v-else-if="filteredPresetGames.length === 0"
            class="py-8 text-center font-mono-retro text-[#6b5a45]"
          >
            > {{ presetGameSearch ? '未找到匹配的游戏' : '暂无预设游戏' }}
          </div>

          <div v-else class="max-h-96 space-y-2 overflow-y-auto">
            <button
              v-for="game in filteredPresetGames"
              :key="game.id"
              type="button"
              @click="addPresetGame(game)"
              class="w-full flex items-center justify-between border-2 border-[#6b5a45] bg-[#1a1814] px-4 py-3 hover:border-[#c4941f] transition-all text-left"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2">
                  <span class="font-medium text-[#f5f0e6]">{{ game.name }}</span>
                  <a
                    v-if="game.link"
                    :href="game.link"
                    target="_blank"
                    rel="noopener noreferrer"
                    @click.stop
                    class="text-[#8b8178] hover:text-[#c4941f] flex-shrink-0"
                    title="查看链接"
                  >
                    <Icon icon="mdi:open-in-new" class="h-4 w-4" />
                  </a>
                </div>
                <div v-if="game.link" class="font-mono-retro text-xs text-[#8b8178] mt-1 truncate">
                  {{ game.link }}
                </div>
              </div>
              <Icon icon="mdi:plus-circle" class="h-6 w-6 text-[#6b9b7a] flex-shrink-0 ml-3" />
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
.input-field {
  width: 100%;
  border: 2px solid #6b5a45;
  background-color: #1a1814;
  padding: 0.75rem 1rem;
  font-family: 'Courier Prime', monospace;
  color: #f5f0e6;
}

.input-field::placeholder {
  color: #6b5a45;
}

.input-field:focus {
  outline: none;
  border-color: #c4941f;
}
</style>
