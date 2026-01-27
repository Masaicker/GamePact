import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useUserStore } from '../stores/user';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/sessions/create',
    name: 'CreateSession',
    component: () => import('../views/CreateSession.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/sessions/:id',
    name: 'SessionDetail',
    component: () => import('../views/SessionDetail.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profile/:id',
    name: 'Profile',
    component: () => import('../views/Profile.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/Admin.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/icon-test',
    name: 'IconTest',
    component: () => import('../views/IconTest.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();

  // 如果有 token 但没有用户信息，等待加载
  if (userStore.token && !userStore.user) {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${userStore.token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        userStore.setUser(data.user);
      } else {
        userStore.logout();
        next({ name: 'Login', query: { redirect: to.fullPath } });
        return;
      }
    } catch (error) {
      // Token 无效，清除
      userStore.logout();
      next({ name: 'Login', query: { redirect: to.fullPath } });
      return;
    }
  }

  // 现在检查认证状态（用户信息已加载）
  if (to.meta.requiresAuth && !userStore.token && !userStore.user) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
  } else if (to.meta.requiresAdmin) {
    // 再次确认用户已加载
    if (!userStore.user) {
      next({ name: 'Dashboard' });
    } else if (!userStore.user.isAdmin) {
      next({ name: 'Dashboard' });
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
