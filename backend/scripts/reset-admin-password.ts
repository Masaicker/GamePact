import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/auth';

const prisma = new PrismaClient();

async function main() {
  const newPassword = 'admin123';
  const passwordHash = await hashPassword(newPassword);

  const admin = await prisma.user.update({
    where: { username: 'admin' },
    data: { passwordHash },
  });

  console.log('✅ 管理员密码已重置');
  console.log(`用户名: ${admin.username}`);
  console.log(`新密码: ${newPassword}`);
}

main()
  .catch((e) => {
    console.error('❌ 重置失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
