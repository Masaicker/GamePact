import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const test33UserId = 'c1649c8b-6c41-4d56-972c-432458147843';

  // 获取所有徽章
  const allBadges = await prisma.badge.findMany();

  console.log(`找到 ${allBadges.length} 个徽章`);

  // 解锁所有徽章
  for (const badge of allBadges) {
    const existing = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId: test33UserId,
          badgeId: badge.id,
        },
      },
    });

    if (!existing) {
      await prisma.userBadge.create({
        data: {
          userId: test33UserId,
          badgeId: badge.id,
        },
      });
      console.log(`✓ 解锁徽章: ${badge.name}`);
    } else {
      console.log(`- 已解锁: ${badge.name}`);
    }
  }

  console.log('\n完成！test33用户已解锁所有徽章');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
