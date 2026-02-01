<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { useUserStore } from '../stores/user';
import { onMounted, onUnmounted, ref } from 'vue';
import VanillaTilt from 'vanilla-tilt';

const userStore = useUserStore();

const cardRefs = ref<HTMLElement[]>([]);
const hoveredIndex = ref<number | null>(null);

const cards = [
  {
    icon: 'mdi:vote',
    iconColor: 'text-[#c4941f]',
    title: '民主投票',
  },
  {
    icon: 'mdi:shield-account',
    iconColor: 'text-[#a34d1d]',
    title: '信誉系统',
  },
  {
    icon: 'mdi:trophy',
    iconColor: 'text-[#6b9b7a]',
    title: '徽章收藏',
  },
  {
    icon: 'mdi:lightning-bolt',
    iconColor: 'text-[#4a9eff]',
    title: '实时同步',
  },
  {
    icon: 'mdi:cog',
    iconColor: 'text-[#8b7355]',
    title: '管理后台',
  },
  {
    icon: 'mdi:shield-lock',
    iconColor: 'text-[#d4a017]',
    title: '安全防护',
  },
];

onMounted(() => {
  cardRefs.value.forEach((el, index) => {
    VanillaTilt.init(el, {
      max: 10,
      speed: 300,
      glare: true,
      'max-glare': 0.3,
      scale: 1.05,
      'full-page-listening': false,
      gyroscope: false,
    });

    el.addEventListener('mouseenter', () => {
      hoveredIndex.value = index;
    });

    el.addEventListener('mouseleave', () => {
      hoveredIndex.value = null;
    });
  });
});

onUnmounted(() => {
  cardRefs.value.forEach((el) => {
    (el as any).vanillaTilt?.destroy();
  });
});
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
                  <div class="grid gap-6 md:grid-cols-3 lg:grid-cols-6 mb-12 max-w-6xl mx-auto">
                    <div
                      v-for="(card, index) in cards"
                      :key="index"
                      :ref="(el) => { if (el) cardRefs[index] = el as HTMLElement; }"
                      data-tilt
                      class="tilt-card mx-auto w-48"
                    >
                      <div class="card-lifter">
                        <div
                          class="card-visuals flex flex-col h-full justify-between py-8 border-2 border-[#6b5a45] bg-[#1a1814] transition-all duration-300"
                          :class="{
                            'visuals-active': hoveredIndex === index,
                            'visuals-inactive': hoveredIndex !== null && hoveredIndex !== index
                          }"
                        >
                          <div class="flex justify-center">
                            <Icon :icon="card.icon" class="h-16 w-16" :class="card.iconColor" />
                          </div>
                          <h3 class="title-subsection text-[#f5f0e6]">
                            {{ card.title }}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>      <!-- CTA -->
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
.tilt-card {
  transform-style: preserve-3d;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  aspect-ratio: 1 / 1.4;
}

.card-lifter {
  transform-style: preserve-3d;
  transform: translateZ(20px);
  width: 100%;
  height: 100%;
}

.card-visuals:hover, .visuals-active {
  border-color: #c4941f;
}

.visuals-active {
  z-index: 10;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

.visuals-inactive {
  opacity: 0.4;
  filter: brightness(0.5) grayscale(0.3);
}
</style>
