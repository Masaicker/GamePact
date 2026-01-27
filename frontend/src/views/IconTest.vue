<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Icon } from '@iconify/vue';

interface Badge {
  code: string;
  name: string;
  icon: string;
  rarity: string;
  category: string;
}

const badges = ref<Badge[]>([]);
const loading = ref(false);
const iconStatus = ref<Record<string, boolean>>({});
const iconErrors = ref<string[]>([]);

onMounted(async () => {
  loading.value = true;
  try {
    const apiBaseUrl = import.meta.env.VITE_API_URL;
    const token = localStorage.getItem('token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${apiBaseUrl}/badges`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    badges.value = data;
  } catch (error) {
    console.error('加载徽章失败:', error);
  } finally {
    loading.value = false;
  }
});

function checkIcon(iconName: string) {
  iconStatus.value[iconName] = false;
}

function handleIconError(code: string, iconName: string) {
  iconStatus.value[iconName] = true;
  iconErrors.value.push(`${code} - ${iconName}`);
}

function handleIconLoad(code: string, iconName: string) {
  iconStatus.value[iconName] = false;
}
</script>

<template>
  <div class="icon-test-page">
    <h1>图标测试页面</h1>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else class="badge-grid">
      <div
        v-for="badge in badges"
        :key="badge.code"
        class="badge-item"
        :class="{ 'error': iconStatus[badge.icon] }"
      >
        <div class="icon-wrapper">
          <Icon
            :icon="badge.icon"
            class="badge-icon"
            :class="{ 'icon-error': iconStatus[badge.icon] }"
            @error="handleIconError(badge.code, badge.icon)"
          />
        </div>
        <div class="badge-info">
          <div class="badge-code">{{ badge.code }}</div>
          <div class="badge-name">{{ badge.name }}</div>
          <div class="badge-icon-code">{{ badge.icon }}</div>
          <div class="badge-category">{{ badge.category }}</div>
          <div class="badge-rarity" :class="`rarity-${badge.rarity}`">
            {{ badge.rarity }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="iconErrors.length > 0" class="errors">
      <h2>加载失败的图标 ({{ iconErrors.length }})</h2>
      <ul>
        <li v-for="(error, index) in iconErrors" :key="index">
          {{ error }}
        </li>
      </ul>
    </div>

    <div class="summary">
      <h2>统计</h2>
      <p>总图标数: {{ badges.length }}</p>
      <p class="success">成功加载: {{ badges.length - iconErrors.length }}</p>
      <p class="error">加载失败: {{ iconErrors.length }}</p>
    </div>
  </div>
</template>

<style scoped>
.icon-test-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  text-align: center;
  margin-bottom: 2rem;
  color: #f5f0e6;
}

.loading {
  text-align: center;
  font-size: 1.5rem;
  color: #8b8178;
}

.badge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.badge-item {
  border: 2px solid #6b5a45;
  background: #1a1814;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s;
}

.badge-item:hover {
  border-color: #c4941f;
}

.badge-item.error {
  border-color: #c45c26;
  background: rgba(196, 92, 38, 0.1);
}

.icon-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
  margin-bottom: 1rem;
  background: #242220;
  border-radius: 50%;
  width: 80px;
  margin-left: auto;
  margin-right: auto;
}

.badge-icon {
  width: 48px;
  height: 48px;
  color: #c4941f;
}

.badge-icon.icon-error {
  color: #c45c26;
  opacity: 0.5;
}

.badge-info {
  text-align: left;
}

.badge-code {
  font-size: 0.75rem;
  color: #6b5a45;
  font-family: monospace;
  margin-bottom: 0.25rem;
}

.badge-name {
  font-size: 1rem;
  font-weight: bold;
  color: #f5f0e6;
  margin-bottom: 0.25rem;
}

.badge-icon-code {
  font-size: 0.7rem;
  color: #8b8178;
  font-family: monospace;
  margin-bottom: 0.25rem;
  word-break: break-all;
}

.badge-category {
  font-size: 0.75rem;
  color: #c4b8a8;
  margin-bottom: 0.5rem;
}

.badge-rarity {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
}

.rarity-legendary {
  background: #c4941f;
  color: #1a1814;
}

.rarity-rare {
  background: #9333ea;
  color: #f5f0e6;
}

.rarity-epic {
  background: #2563eb;
  color: #f5f0e6;
}

.rarity-common {
  background: #6b5a45;
  color: #f5f0e6;
}

.errors {
  background: rgba(196, 92, 38, 0.1);
  border: 2px solid #c45c26;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.errors h2 {
  color: #c45c26;
  margin-bottom: 1rem;
}

.errors ul {
  list-style: none;
  padding: 0;
}

.errors li {
  color: #f5f0e6;
  padding: 0.5rem 0;
  border-bottom: 1px solid #6b5a45;
}

.errors li:last-child {
  border-bottom: none;
}

.summary {
  background: #1a1814;
  border: 2px solid #6b5a45;
  border-radius: 8px;
  padding: 1.5rem;
}

.summary h2 {
  color: #f5f0e6;
  margin-bottom: 1rem;
}

.summary p {
  margin: 0.5rem 0;
  color: #8b8178;
}

.summary .success {
  color: #6b9b7a;
}

.summary .error {
  color: #c45c26;
}
</style>
