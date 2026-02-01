<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
</script>

<template>
  <div class="page-container">
    <div class="text-center">
      <!-- Hero -->
      <div class="mb-12">
        <div class="mb-6 flex items-center justify-center">
          <div class="relative">
            <Icon icon="mdi:game-controller-variant" class="h-24 w-24 text-[#c4941f]" />
            <div class="absolute -bottom-2 -right-2 h-6 w-6 rounded-full bg-[#a34d1d] border-2 border-[#242220]"></div>
          </div>
        </div>
        <h1 class="mb-4 title-display text-[#f5f0e6]">
          GamePact
          <span class="cursor-blink"></span>
        </h1>
        <p class="text-xl text-[#c4941f] font-sans">
          好玩，爱玩，多玩
        </p>
      </div>

      <!-- 特性 -->
      <div class="grid gap-8 md:grid-cols-3 mb-12">
        <div class="card p-6 border-2 border-[#6b5a45] bg-[#1a1814] hover:border-[#c4941f] transition-all">
          <div class="mb-4 flex justify-center">
            <Icon icon="mdi:vote" class="h-16 w-16 text-[#c4941f]" />
          </div>
          <h3 class="mb-2 title-subsection text-[#f5f0e6]">
            民主投票
          </h3>
          <p class="font-mono-retro text-[#8b8178]">
            投票决定今晚玩什么游戏，告别选择困难症
          </p>
        </div>

        <div class="card p-6 border-2 border-[#6b5a45] bg-[#1a1814] hover:border-[#c4941f] transition-all">
          <div class="mb-4 flex justify-center">
            <Icon icon="mdi:shield-account" class="h-16 w-16 text-[#a34d1d]" />
          </div>
          <h3 class="mb-2 title-subsection text-[#f5f0e6]">
            信誉系统
          </h3>
          <p class="font-mono-retro text-[#8b8178]">
            RP（信誉点数）记录谁守信、谁放鸽子
          </p>
        </div>

        <div class="card p-6 border-2 border-[#6b5a45] bg-[#1a1814] hover:border-[#c4941f] transition-all">
          <div class="mb-4 flex justify-center">
            <Icon icon="mdi:trophy" class="h-16 w-16 text-[#6b9b7a]" />
          </div>
          <h3 class="mb-2 title-subsection text-[#f5f0e6]">
            徽章收藏
          </h3>
          <p class="font-mono-retro text-[#8b8178]">
            解锁各种徽章，展示你的游戏成就
          </p>
        </div>
      </div>

      <!-- CTA -->
      <div v-if="!userStore.isAuthenticated" class="flex flex-col items-center space-y-4">
        <router-link to="/register" class="btn btn-primary px-12 py-4 text-lg">
          <Icon icon="mdi:rocket-launch" class="mr-2 h-6 w-6" />
          立即加入
        </router-link>
        <router-link to="/login" class="btn btn-secondary px-12 py-4 text-lg">
          <Icon icon="mdi:login" class="mr-2 h-6 w-6" />
          已有账号？登录
        </router-link>
      </div>

      <div v-else class="flex flex-col items-center space-y-4">
        <router-link to="/dashboard" class="btn btn-primary px-12 py-4 text-lg">
          <Icon icon="mdi:monitor-dashboard" class="mr-2 h-6 w-6" />
          进入控制台
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 无额外样式 */
</style>
