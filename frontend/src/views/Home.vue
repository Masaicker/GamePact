<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { useUserStore } from '../stores/user';
import { onMounted, onUnmounted, ref, watch, nextTick } from 'vue';
import VanillaTilt from 'vanilla-tilt';

const userStore = useUserStore();

const cardRefs = ref<HTMLElement[]>([]);
const hoveredIndex = ref<number | null>(null);
const isReverse = ref(false);

const cards = [
  {
    icon: 'mdi:vote',
    iconColor: 'text-[#c4941f]',
    title: '民主投票',
  },
  {
    icon: 'mdi:scale-balance',
    iconColor: 'text-[#ef4444]',
    title: '信誉积分',
  },
  {
    icon: 'mdi:medal',
    iconColor: 'text-[#fbbf24]',
    title: '荣誉徽章',
  },
  {
    icon: 'mdi:lightning-bolt',
    iconColor: 'text-[#3b82f6]',
    title: '实时响应',
  },
  {
    icon: 'mdi:coffee-off',
    iconColor: 'text-[#14b8a6]',
    title: '无责请假',
  },
  {
    icon: 'mdi:history',
    iconColor: 'text-[#d97706]',
    title: '战绩档案',
  },
  {
    icon: 'mdi:bird',
    iconColor: 'text-[#a8a29e]',
    title: '鸽子雷达',
  },
  {
    icon: 'mdi:playlist-edit',
    iconColor: 'text-[#8b5cf6]',
    title: '自由提议',
  },
];

const updateTilt = () => {
  cardRefs.value.forEach((el) => {
    if (!el) return;
    
    // 如果已存在实例，先销毁
    if ((el as any).vanillaTilt) {
      (el as any).vanillaTilt.destroy();
    }

    // 重新初始化
    VanillaTilt.init(el, {
      max: 10,
      speed: 300,
      glare: true,
      'max-glare': 0.3,
      scale: 1.05,
      reverse: isReverse.value,
      'full-page-listening': false,
      gyroscope: false,
    });
  });
};

watch(isReverse, () => {
  updateTilt();
});

onMounted(() => {
  // 绑定鼠标事件（只需绑定一次）
  cardRefs.value.forEach((el, index) => {
    if (!el) return;
    el.addEventListener('mouseenter', () => {
      hoveredIndex.value = index;
    });

    el.addEventListener('mouseleave', () => {
      hoveredIndex.value = null;
    });
  });

  // 初始化 Tilt
  updateTilt();
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

      <!-- 交互控制开关 -->
      <div class="mb-8 flex justify-center items-center space-x-4">
        <span class="font-mono-retro text-xs text-[#8b8178]" :class="{ 'text-[#c4941f] font-bold': !isReverse }">
          <Icon icon="mdi:arrow-up-bold" class="inline mb-0.5" /> 浮起
        </span>
        
        <button 
          @click="isReverse = !isReverse"
          class="relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none"
          :class="isReverse ? 'bg-[#a34d1d]' : 'bg-[#c4941f]'"
        >
          <div 
            class="absolute top-1 left-1 bg-[#f5f0e6] w-4 h-4 rounded-full transition-transform duration-300 shadow-md"
            :class="isReverse ? 'translate-x-6' : 'translate-x-0'"
          ></div>
        </button>

        <span class="font-mono-retro text-xs text-[#8b8178]" :class="{ 'text-[#a34d1d] font-bold': isReverse }">
          <Icon icon="mdi:arrow-down-bold" class="inline mb-0.5" /> 按压
        </span>
      </div>

      <!-- 特性 -->
                  <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-12 w-fit mx-auto px-4">
                    <div
                      v-for="(card, index) in cards"
                      :key="index"
                      :ref="(el) => { if (el) cardRefs[index] = el as HTMLElement; }"
                      data-tilt
                      class="tilt-card mx-auto w-48"
                      :class="{ 'relative z-50': hoveredIndex === index }"
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
                  </div>
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

:deep(.js-tilt-glare) {
  transform: translateZ(30px);
}
</style>
