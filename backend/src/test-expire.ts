import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const expiredTime = new Date();
  expiredTime.setHours(expiredTime.getHours() - 1); // 设置为1小时前过期

  const invite = await prisma.invitation.create({
    data: {
      code: 'TEST-EXPIRED',
      status: 'pending', // 初始状态设为待使用
      expiresAt: expiredTime,
    },
  });

  console.log('成功创建测试过期邀请码:', invite.code);
  console.log('过期时间设置为:', invite.expiresAt);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
