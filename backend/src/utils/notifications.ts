import { Server as SocketIOServer } from 'socket.io';

// 通知类型
export enum NotificationType {
  SESSION_CREATED = 'session_created',
  SESSION_VOTED = 'session_voted',
  SESSION_EXCUSED = 'session_excused',
  SESSION_STATUS_CHANGED = 'session_status_changed',
  SESSION_SETTLED = 'session_settled',
}

// 通知数据接口
export interface NotificationData {
  type: NotificationType;
  sessionId: string;
  sessionTitle: string;
  actorId: string;
  actorName: string;
  message: string;
  timestamp: Date;
}

// 发送通知给所有连接的用户
export function broadcastNotification(
  io: SocketIOServer,
  data: NotificationData
): void {
  io.emit('notification', {
    ...data,
    timestamp: data.timestamp.toISOString(),
  });
  console.log(`📢 通知广播: ${data.message}`);
}

// 发送通知给特定用户
export function sendNotificationToUser(
  io: SocketIOServer,
  userId: string,
  data: NotificationData
): void {
  io.to(`user:${userId}`).emit('notification', {
    ...data,
    timestamp: data.timestamp.toISOString(),
  });
  console.log(`📢 通知发送给用户 ${userId}: ${data.message}`);
}

// 创建通知数据的辅助函数
export function createNotificationData(
  type: NotificationType,
  sessionId: string,
  sessionTitle: string,
  actorId: string,
  actorName: string,
  message: string
): NotificationData {
  return {
    type,
    sessionId,
    sessionTitle,
    actorId,
    actorName,
    message,
    timestamp: new Date(),
  };
}
