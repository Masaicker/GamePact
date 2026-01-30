<template>
  <div class="notification-wrapper">
    <div class="notification-slider">
      <transition name="slide-up">
        <div v-if="currentMessage" :key="currentMessageKey" class="notification-message">
          {{ displayedMessage }}
        </div>
        <div v-else key="placeholder" class="notification-placeholder">
          请输入文本
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// 当前显示的消息
const currentMessage = ref<string | null>(null);
// 当前消息的唯一 key（用于触发动画）
const currentMessageKey = ref<number>(0);
// 消息队列
const messageQueue: string[] = [];
// 定时器
let nextMessageTimer: number | null = null;

// 容器宽度（px）
const CONTAINER_WIDTH = 300;

// 尾部省略号截断函数
const truncateEnd = (text: string, maxWidth: number): string => {
  // 估算字符宽度（中文约13px，英文约7px）
  const estimateWidth = (str: string) => {
    return Array.from(str).reduce((width, char) => {
      if (/[\u4e00-\u9fa5]/.test(char)) {
        return width + 13;
      } else if (/[a-zA-Z0-9]/.test(char)) {
        return width + 7;
      } else {
        return width + 10;
      }
    }, 0);
  };

  const textWidth = estimateWidth(text);
  if (textWidth <= maxWidth) {
    return text;
  }

  // 计算可用的宽度（留出 "..." 的宽度，约15px）
  const availableWidth = maxWidth - 15;

  // 从前向后截取
  let result = '';
  let currentWidth = 0;
  for (const char of text) {
    const charWidth = /[\u4e00-\u9fa5]/.test(char) ? 13 : (/[a-zA-Z0-9]/.test(char) ? 7 : 10);
    if (currentWidth + charWidth > availableWidth) break;
    result += char;
    currentWidth += charWidth;
  }

  return result + '...';
};

// 计算实际显示的消息（可能被截断）
const displayedMessage = computed(() => {
  if (!currentMessage.value) return '';
  return truncateEnd(currentMessage.value, CONTAINER_WIDTH);
});

// 处理队列中的下一条消息
const processNextMessage = () => {
  if (messageQueue.length > 0) {
    // 取出队列中的第一条消息
    const message = messageQueue.shift()!;
    // 更新 key，触发过渡动画
    currentMessageKey.value++;
    currentMessage.value = message;

    // 5秒后处理下一条
    nextMessageTimer = window.setTimeout(() => {
      processNextMessage();
    }, 5000);
  } else {
    // 队列空了，显示占位
    currentMessage.value = null;
    nextMessageTimer = null;
  }
};

// 添加消息到队列
const showNotification = (data: any) => {
  const message = data.message;

  if (!currentMessage.value) {
    // 当前没有消息，立即显示
    currentMessageKey.value++;
    currentMessage.value = message;
    nextMessageTimer = window.setTimeout(() => {
      processNextMessage();
    }, 5000);
  } else {
    // 当前有消息，加入队列
    messageQueue.push(message);
  }
};

// 暴露方法供外部调用
defineExpose({
  showNotification,
});
</script>

<style scoped>
.notification-wrapper {
  width: 300px;
  height: 24px;
  overflow: hidden;
  position: relative;
  margin-top: 4px;
}

.notification-slider {
  width: 100%;
  height: 100%;
  position: relative;
}

.notification-message,
.notification-placeholder {
  position: absolute;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notification-message {
  color: #f5f0e6;
  font-weight: 500;
}

.notification-placeholder {
  color: #8b8178;
  font-style: italic;
}

/* 向上滚动进入 */
.slide-up-enter-active {
  animation: slideUpIn 0.3s ease-out;
}

.slide-up-leave-active {
  animation: slideUpOut 0.3s ease-in;
}

@keyframes slideUpIn {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUpOut {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-100%);
  }
}
</style>
