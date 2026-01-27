const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAdminSession() {
  const sessionId = 'add3065b-2e6a-4541-ad55-139dc03ee425';

  try {
    // 删除参与记录
    await prisma.sessionParticipant.deleteMany({
      where: { sessionId }
    });

    // 删除活动
    await prisma.session.delete({
      where: { id: sessionId }
    });

    console.log('✅ 成功删除管理员创建的活动');
  } catch (error) {
    if (error.code === 'P2025') {
      console.log('⚠️  活动不存在或已被删除');
    } else {
      console.error('❌ 删除失败:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

deleteAdminSession();
