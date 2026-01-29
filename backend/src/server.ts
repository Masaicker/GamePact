import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { networkInterfaces } from 'os';
import steamRouter from './routes/steam';

// 加载环境变量
dotenv.config();

// 验证必需的环境变量
const requiredEnvVars = ['PORT', 'DATABASE_URL', 'JWT_SECRET', 'BASE_URL', 'CORS_ORIGIN'];
const missing = requiredEnvVars.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ 缺少必需的环境变量配置:');
  missing.forEach(key => console.error(`   - ${key}`));
  console.error('\n请检查 backend/.env 文件是否配置完整。');
  console.error('可以从 backend/.env.example 复制模板。\n');
  process.exit(1);
}

const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);

// Socket.io 配置
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  },
});

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'GamePact Backend is running' });
});

// API 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/badges', require('./routes/badges'));
app.use('/api/preset-games', require('./routes/presetGames'));
app.use('/api/steam', steamRouter); // 新增 Steam 路由

// Socket.io 连接处理
io.on('connection', (socket) => {
  console.log(`用户连接: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`用户断开: ${socket.id}`);
  });
});

// 使 io 实例全局可用（用于在其他模块中发送通知）
(app as any).io = io;

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || '服务器内部错误',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

// 获取本机局域网 IP
function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// 启动服务器
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  const localIP = getLocalIP();
  console.log(`\n=================================================`);
  console.log(`🚀 GamePact 后端服务已启动!`);
  console.log(`-------------------------------------------------`);
  console.log(`👉 本机访问: http://localhost:${PORT}`);
  console.log(`👉 局域网/手机访问: http://${localIP}:${PORT}`);
  console.log(`📡 WebSocket 服务已就绪`);
  console.log(`=================================================\n`);
});

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  await prisma.$disconnect();
  httpServer.close();
  process.exit(0);
});

export { prisma, io };
