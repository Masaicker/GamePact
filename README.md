# GamePact (游戏公约)

> **Slogan**: 不鸽，才是真爱

专为 3-10 人好友圈子打造的游戏聚会约战平台，完美解决“今晚玩什么”和“谁鸽了”的千古难题。采用复古未来主义 (Retro Sci-Fi) 视觉风格。

## 核心功能

- **民主投票**：发起活动，提名游戏，全员投票决定今晚项目。
- **信誉系统 (RP)**：
  - 准时到场 +RP，无故放鸽子 -RP。
  - 动态头衔：从“传说缔约者”到“鸽王之王”。
- **徽章成就**：基于行为自动解锁的成就系统。
- **实时同步**：基于 WebSocket，投票、状态变更毫秒级同步。
- **管理后台**：
  - 邀请码生成与管理。
  - 数据一键备份 (JSON)。
  - 积分手动裁决。
  - 密码重置与安全管理。
- **安全机制**：
  - 密码强度校验（8位+字母数字）。
  - 防暴破与敏感操作审计。

## 技术栈

- **Frontend**: Vue 3, Vite, Tailwind CSS, Element Plus, Pinia
- **Backend**: Node.js, Express, Socket.io, Prisma ORM
- **Database**: SQLite (默认/开发), PostgreSQL (生产环境支持)
- **Language**: TypeScript (全栈)

## 快速开始 (Windows)

本项目内置了 PowerShell 自动化脚本，可一键完成环境配置、启动和关闭。

### 环境要求
- Node.js (v18+)
- npm

### 1. 初始化 (仅首次)
双击根目录下的 **`setup.ps1`**，脚本将自动：
- 安装前后端依赖 (`npm install`)
- 配置环境变量 (`.env`)
- 初始化数据库并生成表结构 (`prisma migrate`)
- 注入初始种子数据

### 2. 一键启动
双击根目录下的 **`start.ps1`**，脚本将自动：
- 启动后端 API 服务 (Port 3001)
- 启动前端开发服务器 (Port 5173)
- 自动打开默认浏览器

### 3. 一键关闭
双击根目录下的 **`stop.ps1`**，脚本将自动：
- 停止所有相关服务进程
- 关闭服务所在的终端窗口

## 项目结构

```text
gamepact/
├── backend/                    # Express 后端服务
│   ├── src/                   # 源代码
│   │   ├── routes/           # API 路由
│   │   ├── prisma/           # 数据库 Schema
│   │   └── server.ts         # 服务入口
│   ├── .env.example          # 后端配置模板
│   └── package.json
├── frontend/                   # Vue 3 前端界面
│   ├── src/                  # 源代码
│   │   ├── views/            # 页面组件
│   │   ├── api/              # API 调用
│   │   └── main.ts           # 入口文件
│   ├── .env.example          # 前端配置模板
│   ├── vite.config.ts        # Vite 配置
│   └── package.json
├── setup.ps1                   # 初始化脚本（首次使用）
├── start.ps1                   # 一键启动脚本
├── stop.ps1                    # 一键停止脚本
└── README.md                   # 项目文档
```

## 数据与隐私说明

- **密码安全**：所有密码均经过哈希加密存储，管理员无法查看明文，仅可重置。
- **数据备份**：管理员可在后台下载全量数据 JSON 备份。