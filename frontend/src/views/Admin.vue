<template>
  <div class="page-container crt-flicker">
    <h1 class="title-display mb-8 text-[#f5f0e6]">管理面板</h1>

    <!-- 选项卡导航 -->
    <div class="mb-6 flex border-b-2 border-[#6b5a45]">
      <button
        @click="activeTab = 'invites'"
        :class="[
          'px-4 py-2 font-mono-retro text-sm font-medium transition-colors',
          activeTab === 'invites'
            ? 'border-b-2 border-[#c4941f] text-[#c4941f]'
            : 'text-[#8b8178] hover:text-[#f5f0e6]'
        ]"
      >
        <Icon icon="mdi:ticket-account" class="mr-2 h-5 w-5" />
        邀请码管理
      </button>
      <button
        @click="activeTab = 'users'"
        :class="[
          'px-4 py-2 font-mono-retro text-sm font-medium transition-colors',
          activeTab === 'users'
            ? 'border-b-2 border-[#c4941f] text-[#c4941f]'
            : 'text-[#8b8178] hover:text-[#f5f0e6]'
        ]"
      >
        <Icon icon="mdi:account-cog" class="mr-2 h-5 w-5" />
        用户管理
      </button>
      <button
        @click="activeTab = 'audit'"
        :class="[
          'px-4 py-2 font-mono-retro text-sm font-medium transition-colors',
          activeTab === 'audit'
            ? 'border-b-2 border-[#c4941f] text-[#c4941f]'
            : 'text-[#8b8178] hover:text-[#f5f0e6]'
        ]"
      >
        <Icon icon="mdi:file-document" class="mr-2 h-5 w-5" />
        审计日志
      </button>
      <button
        @click="activeTab = 'backup'"
        :class="[
          'px-4 py-2 font-mono-retro text-sm font-medium transition-colors',
          activeTab === 'backup'
            ? 'border-b-2 border-[#c4941f] text-[#c4941f]'
            : 'text-[#8b8178] hover:text-[#f5f0e6]'
        ]"
      >
        <Icon icon="mdi:database-export" class="mr-2 h-5 w-5" />
        数据备份
      </button>
    </div>

    <!-- 邀请码管理 -->
    <div v-if="activeTab === 'invites'">
      <div class="card mb-6 p-6">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="title-subsection text-[#f5f0e6]">生成邀请码</h2>
        </div>

        <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label class="mb-2 block font-mono-retro text-sm text-[#c4b8a8]">生成数量</label>
            <input
              v-model.number="inviteCount"
              type="number"
              min="1"
              max="100"
              class="input-field"
            />
          </div>
          <div>
            <label class="mb-2 block font-mono-retro text-sm text-[#c4b8a8]">有效期（天）</label>
            <input
              v-model.number="inviteExpires"
              type="number"
              min="0"
              max="365"
              class="input-field"
              placeholder="0代表30秒测试"
            />
          </div>
          <div class="flex items-end">
            <button
              @click="generateInvites"
              :disabled="generating"
              class="btn btn-primary w-full"
            >
              <Icon v-if="generating" icon="mdi:loading" class="mr-2 h-5 w-5 animate-spin" />
              <Icon v-else icon="mdi:plus" class="mr-2 h-5 w-5" />
              生成邀请码
            </button>
          </div>
        </div>
      </div>

      <!-- 邀请码列表 -->
      <div class="card p-6">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="title-subsection text-[#f5f0e6]">邀请码列表</h2>
          <button
            @click="loadInvites"
            class="btn btn-ghost"
            title="刷新列表"
          >
            <Icon icon="mdi:refresh" class="h-5 w-5" />
          </button>
        </div>

        <div v-if="loadingInvites" class="py-8 text-center font-mono-retro text-[#8b8178]">
          > 加载中...
        </div>

        <div v-else-if="invites.length === 0" class="py-8 text-center font-mono-retro text-[#6b5a45]">
          > 暂无邀请码
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="invite in invites"
            :key="invite.id"
            class="flex items-center justify-between border-2 border-[#6b5a45] bg-[#1a1814] px-4 py-3 hover:border-[#c4941f] transition-all"
          >
            <div class="flex-1">
              <div class="mb-1 flex items-center space-x-2">
                <code class="rounded border border-[#6b5a45] bg-[#242220] px-2 py-1 font-mono-retro text-sm text-[#c4941f]">
                  {{ invite.code }}
                </code>
                <span
                  class="badge"
                  :class="getStatusClass(invite.status)"
                >
                  {{ getStatusText(invite.status) }}
                </span>
              </div>
              <div class="font-mono-retro text-xs text-[#8b8178]">
                创建于 {{ formatDate(invite.createdAt) }}
                <span v-if="invite.expiresAt">
                  · 过期于 {{ formatDate(invite.expiresAt) }}
                </span>
                <span v-if="invite.usedBy" class="text-[#6b9b7a]">
                  · 使用者: {{ invite.usedBy.displayName }} (@{{ invite.usedBy.username }})
                </span>
              </div>
            </div>

            <div class="flex items-center space-x-2">
              <button
                @click="copyInviteCode(invite.code)"
                class="btn btn-ghost"
                title="复制邀请码"
              >
                <Icon icon="mdi:content-copy" class="h-5 w-5" />
              </button>
              <button
                v-if="invite.status === 'pending'"
                @click="deleteInvite(invite.id)"
                class="btn btn-danger"
                title="删除邀请码"
              >
                <Icon icon="mdi:delete" class="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 用户管理 -->
    <div v-if="activeTab === 'users'">
      <!-- 用户列表 -->
      <div class="card p-6">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="title-subsection text-[#f5f0e6]">用户列表</h2>
          <div class="flex items-center space-x-2">
            <button
              @click="openSelfPasswordDialog"
              class="btn btn-ghost"
              title="修改我的密码"
            >
              <Icon icon="mdi:lock-reset" class="h-5 w-5" />
            </button>
            <button @click="loadUsers" class="btn btn-ghost" title="刷新列表">
              <Icon icon="mdi:refresh" class="h-5 w-5" />
            </button>
            <button @click="simulateNotification" class="btn btn-ghost" title="模拟通知">
              <Icon icon="mdi:bell-ring" class="h-5 w-5" />
            </button>
          </div>
        </div>

        <div v-if="loadingUsers" class="py-8 text-center font-mono-retro text-[#8b8178]">
          > 加载中...
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="user in users"
            :key="user.id"
            class="flex items-center justify-between border-2 border-[#6b5a45] bg-[#1a1814] px-4 py-3 hover:border-[#c4941f] transition-all"
          >
            <div class="flex-1">
              <div class="mb-1 flex items-center space-x-2">
                <span class="font-medium text-[#f5f0e6]">{{ user.displayName }}</span>
                <span class="font-mono-retro text-sm text-[#8b8178]">@{{ user.username }}</span>
                <span
                  v-if="user.isAdmin"
                  class="badge badge-primary"
                >
                  管理员
                </span>
              </div>
              <div class="font-mono-retro text-sm text-[#8b8178]">
                当前积分: <span class="text-[#6b9b7a]">{{ user.rp }}</span> RP
              </div>
            </div>

            <div class="flex items-center space-x-2">
              <button
                @click="openHistoryDialog(user)"
                class="btn btn-ghost"
                title="查看历史"
              >
                <Icon icon="mdi:history" class="h-5 w-5" />
              </button>
              <button
                @click="openScoreDialog(user)"
                class="btn btn-ghost"
                title="调整积分"
              >
                <Icon icon="mdi:chart-line" class="h-5 w-5" />
              </button>
              <button
                @click="resetUserPassword(user)"
                class="btn btn-ghost"
                title="重置密码"
              >
                <Icon icon="mdi:lock-reset" class="h-5 w-5" />
              </button>
              <button
                @click="deleteUser(user)"
                class="btn btn-danger"
                title="删除用户"
              >
                <Icon icon="mdi:delete" class="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 审计日志 -->
    <div v-if="activeTab === 'audit'">
      <div class="card p-6">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="title-subsection text-[#f5f0e6]">审计日志</h2>
          <button @click="loadAuditLogs" class="btn btn-ghost" title="刷新日志">
            <Icon icon="mdi:refresh" class="h-5 w-5" />
          </button>
        </div>

        <div v-if="loadingLogs" class="py-8 text-center font-mono-retro text-[#8b8178]">
          > 加载中...
        </div>

        <div v-else-if="auditLogs.length === 0" class="py-8 text-center font-mono-retro text-[#6b5a45]">
          > 暂无审计日志
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="log in auditLogs"
            :key="log.id"
            class="border-2 border-[#6b5a45] bg-[#1a1814] px-4 py-3"
          >
            <div class="mb-2 flex items-center justify-between">
              <span class="badge" :class="getActionClass(log.action)">
                {{ getActionText(log.action) }}
              </span>
              <span class="font-mono-retro text-xs text-[#8b8178]">{{ formatDate(log.createdAt) }}</span>
            </div>
            <div class="text-sm text-[#c4b8a8]">
              {{ log.description || getActionDescription(log) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据备份 -->
    <div v-if="activeTab === 'backup'">
      <div class="card p-6">
        <h2 class="title-subsection mb-4 text-[#f5f0e6]">数据导出</h2>
        <div class="mb-6 max-w-md">
          <label class="mb-2 block font-mono-retro text-sm text-[#c4b8a8]">导出范围</label>
          <select v-model="exportRange" class="input-field mb-4">
            <option value="all">全部数据</option>
            <option value="30days">最近30天</option>
          </select>
          
          <button 
            @click="handleExport" 
            :disabled="exporting"
            class="btn btn-primary w-full"
          >
            <Icon v-if="exporting" icon="mdi:loading" class="mr-2 h-5 w-5 animate-spin" />
            <Icon v-else icon="mdi:download" class="mr-2 h-5 w-5" />
            一键导出 (JSON)
          </button>
        </div>
        
        <div class="rounded border border-[#6b5a45] bg-[#1a1814] p-4 text-sm text-[#8b8178]">
          <p class="mb-2 font-bold text-[#c4941f]">注意：</p>
          <ul class="list-disc pl-5 space-y-1">
            <li>导出文件包含用户列表、活动记录、积分历史等敏感数据。</li>
            <li>请妥善保管导出文件，避免泄露。</li>
            <li>导出格式为 JSON，可用于系统恢复或数据分析。</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 积分调整对话框 -->
    <teleport to="body">
      <div v-if="showScoreDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div class="card w-full max-w-md p-6">
          <h3 class="title-subsection mb-4 text-[#f5f0e6]">调整积分</h3>
          <div class="mb-4">
            <p class="text-[#c4b8a8]">
              用户: <span class="font-medium text-[#f5f0e6]">{{ selectedUser?.displayName }}</span>
            </p>
            <p class="font-mono-retro text-sm text-[#8b8178]">
              当前积分: <span class="text-[#c4941f]">{{ selectedUser?.rp }}</span> RP
            </p>
          </div>
          <div class="mb-4">
            <label class="mb-2 block font-mono-retro text-sm text-[#c4b8a8]">积分变化</label>
            <input
              v-model.number="scoreChange"
              type="number"
              class="input-field"
              placeholder="正数增加，负数减少"
            />
          </div>
          <div class="mb-4">
            <label class="mb-2 block font-mono-retro text-sm text-[#c4b8a8]">调整原因</label>
            <textarea
              v-model="scoreReason"
              class="input-field"
              rows="3"
              placeholder="请输入调整原因"
            ></textarea>
          </div>
          <div class="flex justify-end space-x-3">
            <button
              @click="showScoreDialog = false"
              class="btn btn-ghost"
            >
              取消
            </button>
            <button
              @click="adjustScore"
              :disabled="adjusting || !scoreChange || !scoreReason"
              class="btn btn-primary"
            >
              {{ adjusting ? '处理中...' : '确定' }}
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 积分历史对话框 -->
    <teleport to="body">
      <div v-if="showHistoryDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div class="card w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="title-subsection text-[#f5f0e6]">积分历史</h3>
            <button @click="showHistoryDialog = false" class="btn btn-ghost">
              <Icon icon="mdi:close" class="h-5 w-5" />
            </button>
          </div>

          <div class="mb-4">
            <p class="text-[#c4b8a8]">
              用户: <span class="font-medium text-[#f5f0e6]">{{ selectedUser?.displayName }}</span>
            </p>
          </div>

          <div v-if="loadingHistory" class="py-8 text-center font-mono-retro text-[#8b8178]">
            > 加载中...
          </div>

          <div v-else-if="historyRecords.length === 0" class="py-8 text-center font-mono-retro text-[#6b5a45]">
            > 暂无积分记录
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="record in historyRecords"
              :key="record.id"
              class="flex items-center justify-between border-2 px-4 py-2"
              :class="record.isDeleted ? 'border-[#2d2a26] bg-[#2d2a26]/50 opacity-60' : 'border-[#6b5a45] bg-[#1a1814]'"
            >
              <div class="flex-1" :class="{ 'line-through': record.isDeleted }">
                <div class="flex items-center space-x-2">
                  <Icon
                    :icon="getHistoryIcon(record.reason)"
                    class="h-4 w-4"
                    :class="getHistoryIconColor(record.scoreChange, record.reason)"
                  />
                  <span class="font-mono-retro text-sm" :class="record.scoreChange > 0 ? 'text-[#6b9b7a]' : 'text-[#a34d1d]'">
                    {{ record.scoreChange > 0 ? '+' : '' }}{{ record.scoreChange }}
                  </span>
                  <span class="font-mono-retro text-xs text-[#8b8178]">{{ formatDate(record.createdAt) }}</span>
                  <span v-if="record.isDeleted" class="badge badge-secondary">
                    已作废
                  </span>
                </div>
                <div class="text-sm text-[#c4b8a8]">{{ record.description }}</div>
              </div>
              <div class="flex items-center space-x-2">
                <button
                  v-if="!record.isDeleted && record.reason === 'admin_adjust'"
                  @click="deleteScoreHistory(record.id)"
                  class="btn btn-danger"
                  title="删除记录"
                >
                  <Icon icon="mdi:delete" class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 修改自身密码对话框 -->
    <teleport to="body">
      <div v-if="showSelfPasswordDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div class="card w-full max-w-md p-6">
          <h3 class="title-subsection mb-4 text-[#f5f0e6]">修改我的密码</h3>
          
          <div class="mb-4">
            <label class="block text-sm font-mono-retro text-[#c4b8a8] mb-1">旧密码</label>
            <div class="relative">
              <input 
                v-model="selfPasswordForm.oldPassword" 
                :type="showSelfOldPassword ? 'text' : 'password'"
                class="input-field pr-10"
                placeholder="请输入当前密码"
              >
              <button 
                @click="showSelfOldPassword = !showSelfOldPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8178] hover:text-[#c4941f]"
                type="button"
              >
                <Icon :icon="showSelfOldPassword ? 'mdi:eye-off' : 'mdi:eye'" class="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-mono-retro text-[#c4b8a8] mb-1">新密码</label>
            <div class="relative">
              <input 
                v-model="selfPasswordForm.newPassword" 
                :type="showSelfNewPassword ? 'text' : 'password'"
                class="input-field pr-10"
                placeholder="至少8位，包含字母和数字"
              >
              <button 
                @click="showSelfNewPassword = !showSelfNewPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8178] hover:text-[#c4941f]"
                type="button"
              >
                <Icon :icon="showSelfNewPassword ? 'mdi:eye-off' : 'mdi:eye'" class="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div class="mb-6">
            <label class="block text-sm font-mono-retro text-[#c4b8a8] mb-1">确认新密码</label>
            <div class="relative">
              <input 
                v-model="selfPasswordForm.confirmPassword" 
                :type="showSelfConfirmPassword ? 'text' : 'password'"
                class="input-field pr-10"
                placeholder="再次输入新密码"
              >
              <button 
                @click="showSelfConfirmPassword = !showSelfConfirmPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8178] hover:text-[#c4941f]"
                type="button"
              >
                <Icon :icon="showSelfConfirmPassword ? 'mdi:eye-off' : 'mdi:eye'" class="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div class="flex justify-end space-x-3">
            <button @click="showSelfPasswordDialog = false" class="btn btn-ghost">
              取消
            </button>
            <button @click="handleChangeSelfPassword" :disabled="changingSelfPassword" class="btn btn-primary">
              {{ changingSelfPassword ? '提交中...' : '确认修改' }}
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi, authApi } from '../api';

const activeTab = ref<'invites' | 'users' | 'audit' | 'backup'>('invites');

// 监听标签切换，自动加载数据
watch(activeTab, (newTab) => {
  if (newTab === 'users' && users.value.length === 0) {
    loadUsers();
  } else if (newTab === 'audit' && auditLogs.value.length === 0) {
    loadAuditLogs();
  }
});
const inviteCount = ref(1);
const inviteExpires = ref(30);
const generating = ref(false);
const loadingInvites = ref(false);
const invites = ref<any[]>([]);

// 加载邀请码列表
const loadInvites = async () => {
  loadingInvites.value = true;
  try {
    const response = await adminApi.getInvites();
    invites.value = response.data;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '加载邀请码列表失败');
  } finally {
    loadingInvites.value = false;
  }
};

// 生成邀请码
const generateInvites = async () => {
  if (!inviteCount.value || inviteCount.value < 1) {
    ElMessage.warning('请输入有效的生成数量');
    return;
  }

  if (!inviteExpires.value && inviteExpires.value !== 0) {
    ElMessage.warning('请输入有效的有效期');
    return;
  }

  if (inviteExpires.value < 0) {
    ElMessage.warning('有效期不能为负数');
    return;
  }

  generating.value = true;
  try {
    const response = await adminApi.createInvite({
      count: inviteCount.value,
      expiresIn: inviteExpires.value,
    });

    ElMessage.success(response.data.message);
    await loadInvites();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '生成邀请码失败');
  } finally {
    generating.value = false;
  }
};

// 复制邀请码
const copyInviteCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code);
    ElMessage.success('邀请码已复制到剪贴板');
  } catch (error) {
    ElMessage.error('复制失败，请手动复制');
  }
};

// 删除邀请码
const deleteInvite = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这个邀请码吗？', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await adminApi.deleteInvite(id);
    ElMessage.success('邀请码已删除');
    await loadInvites();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.error || '删除邀请码失败');
    }
  }
};

// 获取状态样式
const getStatusClass = (status: string) => {
  const classMap: Record<string, string> = {
    pending: 'badge-success',
    used: 'badge-primary',
    expired: 'badge-secondary',
    deleted: 'badge-danger',
  };
  return classMap[status] || 'badge-secondary';
};

// 获取状态文本
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    pending: '待使用',
    used: '已使用',
    expired: '已过期',
    deleted: '已删除',
  };
  return textMap[status] || status;
};

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
};

// ==================== 用户管理 ====================
const users = ref<any[]>([]);
const loadingUsers = ref(false);
const showScoreDialog = ref(false);
const showHistoryDialog = ref(false);
const selectedUser = ref<any>(null);
const scoreChange = ref<number | null>(null);
const scoreReason = ref('');
const adjusting = ref(false);

// 积分历史
const historyRecords = ref<any[]>([]);
const loadingHistory = ref(false);

// 加载用户列表
const loadUsers = async () => {
  loadingUsers.value = true;
  try {
    const response = await adminApi.getAuditLogs({ limit: 100 });
    // 从审计日志或用户API获取用户列表
    // 这里需要调用实际的用户列表API
    const usersResponse = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });
    if (usersResponse.ok) {
      const data = await usersResponse.json();
      users.value = data;
    }
  } catch (error: any) {
    ElMessage.error('加载用户列表失败');
  } finally {
    loadingUsers.value = false;
  }
};

// 模拟通知测试
const mockNotifications = [
  '张三 发起了新活动：英雄联盟',
  '李四 投票了：英雄联盟',
  '王五 请假了',
  '赵六 完成了活动结算：王者荣耀',
  '孙七 流局了活动：原神',
  '周八 发起了新活动：绝地求生',
  '吴九 投票了：绝地求生',
  '郑十 请假了',
  '钱十一 删除了活动：英雄联盟',
];

const simulateNotification = () => {
  const randomMessage = mockNotifications[Math.floor(Math.random() * mockNotifications.length)];

  // 触发自定义事件，通知 App.vue 的通知栏
  window.dispatchEvent(new CustomEvent('gamepact:notification', {
    detail: {
      message: randomMessage,
      sessionId: 'mock',
    },
  }));

  ElMessage.success(`已发送模拟通知: ${randomMessage}`);
};

// 打开积分调整对话框
const openScoreDialog = (user: any) => {
  selectedUser.value = user;
  scoreChange.value = null;
  scoreReason.value = '';
  showScoreDialog.value = true;
};

// 调整积分
const adjustScore = async () => {
  if (!scoreChange.value || scoreChange.value === 0) {
    ElMessage.warning('请输入有效的积分变化');
    return;
  }

  if (!scoreReason.value.trim()) {
    ElMessage.warning('请输入调整原因');
    return;
  }

  adjusting.value = true;
  try {
    await adminApi.adjustScore(selectedUser.value.id, {
      scoreChange: scoreChange.value,
      reason: scoreReason.value,
    });

    ElMessage.success('积分调整成功');
    showScoreDialog.value = false;
    await loadUsers();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '积分调整失败');
  } finally {
    adjusting.value = false;
  }
};

// 打开历史对话框
const openHistoryDialog = async (user: any) => {
  selectedUser.value = user;
  showHistoryDialog.value = true;
  await loadUserHistory(user.id);
};

// 加载用户积分历史
const loadUserHistory = async (userId: string) => {
  loadingHistory.value = true;
  try {
    const response = await adminApi.getUserHistory(userId);
    historyRecords.value = response.data;
  } catch (error: any) {
    ElMessage.error('加载积分历史失败');
  } finally {
    loadingHistory.value = false;
  }
};

// 删除积分历史记录
const deleteScoreHistory = async (recordId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这条积分记录吗？如果是管理员调整的记录，积分会自动回退。', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await adminApi.deleteScoreHistory(recordId);
    ElMessage.success('积分记录已删除');

    // 重新加载历史和用户列表（积分可能变化）
    await loadUserHistory(selectedUser.value.id);
    await loadUsers();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.error || '删除积分记录失败');
    }
  }
};

// 删除用户
const deleteUser = async (user: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 ${user.displayName} (@${user.username}) 吗？此操作不可恢复。`,
      '删除用户确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    await adminApi.deleteUser(user.id);
    ElMessage.success('用户已删除');

    // 重新加载用户列表
    await loadUsers();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.error || '删除用户失败');
    }
  }
};

// 重置用户密码
const resetUserPassword = async (user: any) => {
  try {
    const { value: newPassword } = await ElMessageBox.prompt(
      `请输入用户 ${user.displayName} 的新密码`,
      '重置密码',
      {
        confirmButtonText: '重置',
        cancelButtonText: '取消',
        inputType: 'text', // 明文显示方便管理员确认
        inputPlaceholder: '请输入新密码（至少8位，包含字母和数字）',
        inputValidator: (value) => {
          if (!value || value.length < 8) {
            return '密码长度至少8位';
          }
          const hasLetter = /[a-zA-Z]/.test(value);
          const hasNumber = /\d/.test(value);
          if (!hasLetter || !hasNumber) {
            return '密码必须包含至少一个字母和一个数字';
          }
          if (/[^\x00-\x7F]/.test(value)) {
            return '密码不能包含中文或非法字符';
          }
          if (/\s/.test(value)) {
            return '密码不能包含空格';
          }
          return true;
        },
      }
    );

    if (newPassword) {
      await adminApi.resetUserPassword(user.id, { newPassword });
      ElMessage.success(`用户 ${user.displayName} 的密码已重置`);
      // 可选：记录审计日志已经在后端完成
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.error || '重置密码失败');
    }
  }
};

// 获取历史图标
const getHistoryIcon = (reason: string) => {
  const iconMap: Record<string, string> = {
    attended: 'mdi:check-circle',
    initiated: 'mdi:scroll-text',
    no_show: 'mdi:x-circle',
    late_excuse: 'mdi:clock-alert',
    admin_adjust: 'mdi:hand',
  };
  return iconMap[reason] || 'mdi:information';
};

// 获取历史图标颜色
const getHistoryIconColor = (scoreChange: number, reason: string) => {
  if (reason === 'admin_adjust') return 'text-[#c4941f]';
  if (scoreChange > 0) return 'text-[#6b9b7a]';
  if (reason === 'late_excuse') return 'text-[#a34d1d]';
  return 'text-[#c45c26]';
};

// ==================== 审计日志 ====================
const auditLogs = ref<any[]>([]);
const loadingLogs = ref(false);

// 加载审计日志
const loadAuditLogs = async () => {
  loadingLogs.value = true;
  try {
    const response = await adminApi.getAuditLogs({ limit: 50 });
    auditLogs.value = response.data;
  } catch (error: any) {
    ElMessage.error('加载审计日志失败');
  } finally {
    loadingLogs.value = false;
  }
};

// 获取操作样式
const getActionClass = (action: string) => {
  const classMap: Record<string, string> = {
    adjust_score: 'badge-accent',
    delete_invite: 'badge-accent',
    create_invite: 'badge-success',
  };
  return classMap[action] || 'badge-secondary';
};

// 获取操作文本
const getActionText = (action: string) => {
  const textMap: Record<string, string> = {
    adjust_score: '积分调整',
    delete_invite: '删除邀请码',
    create_invite: '生成邀请码',
  };
  return textMap[action] || action;
};

// 获取操作描述
const getActionDescription = (log: any) => {
  if (log.action === 'adjust_score') {
    // 解析 JSON 字符串
    let details = {};
    try {
      details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
    } catch {
      details = {};
    }
    const { scoreChange, reason } = details;
    const changeText = scoreChange > 0 ? `+${scoreChange}` : scoreChange;
    return `调整积分 ${changeText} RP：${reason || '无原因'}`;
  }
  if (log.action === 'delete_record') {
    // 不显示敏感信息
    return '删除记录';
  }
  if (log.action === 'delete_user') {
    // 不显示敏感信息
    return '删除用户';
  }
  return log.description || '';
};

// ==================== 修改自身密码 ====================
const showSelfPasswordDialog = ref(false);
const showSelfOldPassword = ref(false);
const showSelfNewPassword = ref(false);
const showSelfConfirmPassword = ref(false);

const selfPasswordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});
const changingSelfPassword = ref(false);

const openSelfPasswordDialog = () => {
  selfPasswordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' };
  showSelfOldPassword.value = false;
  showSelfNewPassword.value = false;
  showSelfConfirmPassword.value = false;
  showSelfPasswordDialog.value = true;
};

const handleChangeSelfPassword = async () => {
  const { oldPassword, newPassword, confirmPassword } = selfPasswordForm.value;

  if (!oldPassword || !newPassword || !confirmPassword) {
    ElMessage.warning('请填写所有密码字段');
    return;
  }

  if (newPassword !== confirmPassword) {
    ElMessage.warning('新密码和确认密码不一致');
    return;
  }

  // 密码强度校验
  if (newPassword.length < 8) {
    ElMessage.warning('新密码长度不能少于8位');
    return;
  }
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  if (!hasLetter || !hasNumber) {
    ElMessage.warning('新密码必须包含字母和数字');
    return;
  }
  if (/[^\x00-\x7F]/.test(newPassword)) {
    ElMessage.warning('新密码不能包含中文或非法字符');
    return;
  }
  if (/\s/.test(newPassword)) {
    ElMessage.warning('新密码不能包含空格');
    return;
  }

  if (oldPassword === newPassword) {
    ElMessage.warning('新密码不能与旧密码相同');
    return;
  }

  changingSelfPassword.value = true;
  try {
    await authApi.changePassword({ oldPassword, newPassword });
    ElMessage.success('密码修改成功');
    showSelfPasswordDialog.value = false;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '密码修改失败');
  } finally {
    changingSelfPassword.value = false;
  }
};

// ==================== 数据备份 ====================
const exportRange = ref('all');
const exporting = ref(false);

const handleExport = async () => {
  exporting.value = true;
  try {
    const response = await adminApi.exportData({ range: exportRange.value });
    
    // Create blob link to download
    const dataStr = JSON.stringify(response.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    a.download = `gamepact_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    ElMessage.success('导出成功');
  } catch (error: any) {
    ElMessage.error('导出失败: ' + (error.response?.data?.error || error.message));
  } finally {
    exporting.value = false;
  }
};

onMounted(() => {
  loadInvites();
});
</script>

<style scoped>
.input-field {
  width: 100%;
  border: 2px solid #6b5a45;
  background-color: #1a1814;
  padding: 0.5rem 1rem;
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
