import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '');

let socket: Socket | null = null;

// 连接 Socket.io
export function connectSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('✅ Socket 已连接');
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket 断开:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket 连接错误:', error);
  });

  return socket;
}

// 断开连接
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// 获取当前 Socket 实例
export function getSocket(): Socket | null {
  return socket;
}

// 监听通知
export function onNotification(callback: (data: any) => void): void {
  if (socket) {
    socket.on('notification', callback);
  }
}

// 取消监听通知
export function offNotification(callback?: (data: any) => void): void {
  if (socket) {
    socket.off('notification', callback);
  }
}

// 加入用户房间（用于接收个人通知）
export function joinUserRoom(userId: string): void {
  if (socket) {
    socket.emit('join', `user:${userId}`);
  }
}

// 离开用户房间
export function leaveUserRoom(userId: string): void {
  if (socket) {
    socket.emit('leave', `user:${userId}`);
  }
}
