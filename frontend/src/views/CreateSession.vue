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

const gameOptions = ref<string[]>(['']);
const startTime = ref('');
const endVotingTime = ref('');
const minPlayers = ref(2);
const loading = ref(false);

// 添加游戏选项
const addGameOption = () => {
  gameOptions.value.push('');
};

// 删除游戏选项
const removeGameOption = (index: number) => {
  if (gameOptions.value.length > 1) {
    gameOptions.value.splice(index, 1);
  }
};

// 提交创建
const handleSubmit = async () => {
  // 过滤空选项
  const validOptions = gameOptions.value.filter(opt => opt.trim());

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
});
</script>

<template>
  <div class="page-container crt-flicker">
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
              <div v-for="(option, index) in gameOptions" :key="index" class="flex items-center space-x-3">
                <div class="flex-1">
                  <input
                    v-model="gameOptions[index]"
                    type="text"
                    :placeholder="`> 游戏 ${index + 1}`"
                    class="input-field"
                  />
                </div>
                <button
                  v-if="gameOptions.length > 1"
                  type="button"
                  @click="removeGameOption(index)"
                  class="btn btn-danger"
                >
                  <Icon icon="mdi:close" class="h-5 w-5" />
                </button>
              </div>
            </div>
            <button
              type="button"
              @click="addGameOption"
              class="mt-3 btn btn-ghost"
            >
              <Icon icon="mdi:plus" class="mr-2 h-5 w-5" />
              添加更多选项
            </button>
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
