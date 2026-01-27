<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const form = ref({
  username: '',
  displayName: '',
  password: '',
  confirmPassword: '',
  inviteCode: '',
});

const message = ref('');
const loading = ref(false);

const handleRegister = async () => {
  console.log('注册按钮被点击', form.value);

  if (!form.value.username || !form.value.displayName || !form.value.password || !form.value.inviteCode) {
    message.value = '请填写所有字段';
    return;
  }

  // 密码强度校验
  if (form.value.password.length < 8) {
    message.value = '密码长度至少8位';
    return;
  }
  const hasLetter = /[a-zA-Z]/.test(form.value.password);
  const hasNumber = /\d/.test(form.value.password);
  if (!hasLetter || !hasNumber) {
    message.value = '密码必须包含至少一个字母和一个数字';
    return;
  }
  if (/[^\x00-\x7F]/.test(form.value.password)) {
    message.value = '密码不能包含中文或非法字符';
    return;
  }
  if (/\s/.test(form.value.password)) {
    message.value = '密码不能包含空格';
    return;
  }

  if (form.value.password !== form.value.confirmPassword) {
    message.value = '两次输入的密码不一致';
    return;
  }

  loading.value = true;
  message.value = '注册中...';

  try {
    // 直接使用 fetch 测试
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const response = await fetch(`${apiUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: form.value.username,
        displayName: form.value.displayName,
        password: form.value.password,
        inviteCode: form.value.inviteCode,
      }),
    });

    const data = await response.json();
    console.log('注册响应:', data);

    if (!response.ok) {
      throw new Error(data.error || '注册失败');
    }

    message.value = '注册成功！即将跳转到控制台...';

    // 保存 token
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    setTimeout(() => {
      router.push('/dashboard');
    }, 1000);
  } catch (error: any) {
    console.error('注册错误:', error);
    message.value = error.message || '注册失败';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="register-container">
    <h1>注册 GamePact</h1>

    <form @submit.prevent="handleRegister">
      <div>
        <label>用户名：</label>
        <input v-model="form.username" type="text" placeholder="用于登录的用户名" />
      </div>

      <div>
        <label>昵称：</label>
        <input v-model="form.displayName" type="text" placeholder="显示给好友的昵称" />
      </div>

      <div>
        <label>密码：</label>
        <input v-model="form.password" type="password" placeholder="至少8位，包含字母和数字" />
      </div>

      <div>
        <label>确认密码：</label>
        <input v-model="form.confirmPassword" type="password" placeholder="再次输入密码" />
      </div>

      <div>
        <label>邀请码：</label>
        <input v-model="form.inviteCode" type="text" placeholder="请输入邀请码" />
      </div>

      <button type="submit" :disabled="loading">
        {{ loading ? '注册中...' : '注册' }}
      </button>

      <div v-if="message" class="message">
        {{ message }}
      </div>
    </form>

    <div class="links">
      <router-link to="/login">已有账号？立即登录</router-link>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
  border: 1px solid #444;
  border-radius: 8px;
  background: #222;
}

h1 {
  color: #fff;
  text-align: center;
}

label {
  display: block;
  color: #ccc;
  margin-bottom: 5px;
}

input {
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #333;
  color: #fff;
}

button {
  width: 100%;
  padding: 12px;
  background: #8b5cf6;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #7c3aed;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.message {
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
  text-align: center;
}

.message:has-str('成功') {
  background: #065f46;
}

.message:has-str('失败') {
  background: #991b1b;
}

.links {
  margin-top: 15px;
  text-align: center;
}

.links a {
  color: #8b5cf6;
  text-decoration: none;
}

.links a:hover {
  text-decoration: underline;
}
</style>
