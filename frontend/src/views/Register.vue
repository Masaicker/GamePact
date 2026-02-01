<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { authApi } from '../api';
import { Icon } from '@iconify/vue';
import { ElMessage } from 'element-plus';

const router = useRouter();
const userStore = useUserStore();

const form = ref({
  username: '',
  displayName: '',
  password: '',
  confirmPassword: '',
  inviteCode: '',
});

const loading = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);

const handleRegister = async () => {
  // 验证
  if (!form.value.username || !form.value.displayName || !form.value.password || !form.value.inviteCode) {
    ElMessage.warning('请填写所有字段');
    return;
  }

  // 密码强度校验
  if (form.value.password.length < 8) {
    ElMessage.warning('密码长度至少8位');
    return;
  }
  const hasLetter = /[a-zA-Z]/.test(form.value.password);
  const hasNumber = /\d/.test(form.value.password);
  if (!hasLetter || !hasNumber) {
    ElMessage.warning('密码必须包含字母和数字');
    return;
  }
  if (/[^\x00-\x7F]/.test(form.value.password)) {
    ElMessage.warning('密码不能包含中文或非法字符');
    return;
  }
  if (/\s/.test(form.value.password)) {
    ElMessage.warning('密码不能包含空格');
    return;
  }

  if (form.value.password !== form.value.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致');
    return;
  }

  loading.value = true;
  try {
    const response = await authApi.register({
      username: form.value.username,
      displayName: form.value.displayName,
      password: form.value.password,
      inviteCode: form.value.inviteCode,
    });

    // 保存 token 和用户信息
    userStore.setToken(response.data.token);
    userStore.setUser(response.data.user);

    ElMessage.success('注册成功！欢迎加入 GamePact');

    // 跳转到控制台
    router.push('/dashboard');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '注册失败');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="page-container">
    <div class="mx-auto max-w-md">
      <div class="card p-8">
        <div class="mb-8 text-center">
          <Icon icon="mdi:account-plus" class="mx-auto mb-4 h-16 w-16 text-[#c4941f]" />
          <h2 class="title-display text-[#f5f0e6]">
            注册 GamePact
          </h2>
          <p class="font-mono-retro mt-2 text-[#8b8178]">「是啊，玩什么」</p>
        </div>

        <form @submit.prevent="handleRegister" class="space-y-4">
          <div>
            <label class="mb-2 block font-mono-retro text-sm text-[#c4b8a8]">
              > 用户名
            </label>
            <input
              v-model="form.username"
              type="text"
              placeholder="用于登录的用户名"
              class="input-field"
            />
          </div>

          <div>
            <label class="mb-2 block font-mono-retro text-sm text-[#c4b8a8]">
              > 昵称
            </label>
            <input
              v-model="form.displayName"
              type="text"
              placeholder="显示给好友的昵称"
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
                placeholder="至少8位，包含字母和数字"
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

          <div>
            <label class="mb-2 block font-mono-retro text-sm text-[#c4b8a8]">
              > 确认密码
            </label>
            <div class="relative">
              <input
                v-model="form.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="再次输入密码"
                class="input-field pr-12"
              />
              <button
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8178] hover:text-[#c4941f] transition-colors"
              >
                <Icon :icon="showConfirmPassword ? 'mdi:eye-off' : 'mdi:eye'" class="h-5 w-5" />
              </button>
            </div>
          </div>

          <div>
            <label class="mb-2 block font-mono-retro text-sm text-[#c4b8a8]">
              > 邀请码
            </label>
            <input
              v-model="form.inviteCode"
              type="text"
              placeholder="请输入邀请码"
              class="input-field"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="btn btn-primary w-full"
          >
            <Icon v-if="loading" icon="mdi:loading" class="mr-2 h-5 w-5 animate-spin" />
            <Icon v-else icon="mdi:account-plus" class="mr-2 h-5 w-5" />
            <span v-if="loading">注册中...</span>
            <span v-else>注册</span>
          </button>
        </form>

        <div class="mt-6 text-center font-mono-retro text-sm text-[#8b8178]">
          已有账号？
          <router-link to="/login" class="text-[#c4941f] hover:text-[#d4a017] transition-colors">
            立即登录_
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
