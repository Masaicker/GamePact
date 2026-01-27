import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import './assets/main.css';
import './style.css';
import App from './App.vue';
import router from './router';

// 验证必需的环境变量
if (!import.meta.env.VITE_API_URL) {
  console.error('❌ 缺少必需的环境变量配置:');
  console.error('   - VITE_API_URL');
  console.error('\n请检查 frontend/.env 文件是否配置完整。');
  console.error('可以从 frontend/.env.example 复制模板。\n');
  throw new Error('Missing VITE_API_URL environment variable');
}

// 创建应用实例
const app = createApp(App);

// 使用插件
app.use(createPinia());
app.use(router);
app.use(ElementPlus);

// 挂载应用
app.mount('#app');
