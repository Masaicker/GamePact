<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '../stores/user';
import { authApi } from '../api';
import { Icon } from '@iconify/vue';
import { ElMessage } from 'element-plus';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const form = ref({
  username: '',
  password: '',
});

const loading = ref(false);
const showPassword = ref(false);

const handleLogin = async () => {
  if (!form.value.username || !form.value.password) {
    ElMessage.warning('请输入用户名和密码');
    return;
  }

  loading.value = true;
  try {
    const response = await authApi.login(form.value);

    // 保存 token 和用户信息
    userStore.setToken(response.data.token);
    userStore.setUser(response.data.user);

    ElMessage.success('登录成功！');

    // 跳转到原始页面或控制台
    const redirect = route.query.redirect as string;
    router.push(redirect || '/dashboard');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '登录失败');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="page-container crt-flicker">
    <div class="mx-auto max-w-md">
      <div class="card p-8">
        <div class="mb-8 text-center">
          <Icon icon="mdi:game-controller-variant" class="mx-auto mb-4 h-16 w-16 text-[#c4941f]" />
          <h2 class="title-display text-[#f5f0e6]">
            登录 GamePact
          </h2>
          <p class="font-mono-retro mt-2 text-[#8b8178]">「不鸽，才是真爱」</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-6">
          <div>
            <label class="mb-2 block font-mono-retro text-sm text-[#c4b8a8]">
              > 用户名
            </label>
            <input
              v-model="form.username"
              type="text"
              placeholder="请输入用户名"
              class="input-field"
            />
          </div>

          <div>
            <label class="mb-2 block font-mono-retro text-sm text-[#c4b8a8]">
              > 密码
            </label>
            <div class="relative">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                class="input-field pr-12"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8178] hover:text-[#c4941f] transition-colors"
              >
                <Icon :icon="showPassword ? 'mdi:eye-off' : 'mdi:eye'" class="h-5 w-5" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="btn btn-primary w-full"
          >
            <Icon v-if="loading" icon="mdi:loading" class="mr-2 h-5 w-5 animate-spin" />
            <Icon v-else icon="mdi:login" class="mr-2 h-5 w-5" />
            <span v-if="loading">登录中...</span>
            <span v-else>登录</span>
          </button>
        </form>

        <div class="mt-6 text-center font-mono-retro text-sm text-[#8b8178]">
          还没有账号？
          <router-link to="/register" class="text-[#c4941f] hover:text-[#d4a017] transition-colors">
            立即注册_
          </router-link>
        </div>
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
