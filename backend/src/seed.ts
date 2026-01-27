import { PrismaClient } from '@prisma/client';
import { hashPassword, generateInviteCode } from './utils/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始种子数据...');

  // 1. 创建管理员用户
  console.log('创建管理员用户...');
  const adminPasswordHash = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      displayName: '管理员',
      passwordHash: adminPasswordHash,
      isAdmin: true,
      rp: 100,
    },
  });
  console.log(`✓ 管理员用户创建成功: ${admin.username}`);

  // 2. 创建测试邀请码
  console.log('\n创建测试邀请码...');
  const inviteCodes = [
    await prisma.invitation.upsert({
      where: { code: 'TEST2024CODE01' },
      update: {},
      create: {
        code: 'TEST2024CODE01',
        status: 'pending',
        createdBy: { connect: { id: admin.id } },
      },
    }),
    await prisma.invitation.upsert({
      where: { code: 'GAME2024PACT' },
      update: {},
      create: {
        code: 'GAME2024PACT',
        status: 'pending',
        createdBy: { connect: { id: admin.id } },
      },
    }),
  ];
  console.log(`✓ 创建了 ${inviteCodes.length} 个邀请码:`);
  inviteCodes.forEach((inv) => console.log(`  - ${inv.code}`));

  // 3. 创建徽章定义
  console.log('\n创建徽章定义...');

  // 等级徽章
  const rankBadges = [
    { code: 'legendary', name: '传说缔约者', icon: 'mdi:crown', rarity: 'legendary' },
    { code: 'diamond', name: '钻石战神', icon: 'mdi:diamond', rarity: 'legendary' },
    { code: 'gold', name: '黄金大腿', icon: 'mdi:medal', rarity: 'rare' },
    { code: 'silver', name: '白银骑士', icon: 'mdi:shield', rarity: 'epic' },
    { code: 'bronze', name: '青铜玩家', icon: 'mdi:trophy', rarity: 'common' },
    { code: 'pigeon', name: '扑棱鸽子', icon: 'mdi:bird', rarity: 'common' },
    { code: 'old_pigeon', name: '老鸽子', icon: 'mdi:alert', rarity: 'common' },
    { code: 'pigeon_king', name: '鸽王之王', icon: 'mdi:skull', rarity: 'rare' },
    { code: 'missing', name: '失踪人口', icon: 'mdi:account-minus', rarity: 'rare' },
  ];

  // 成就徽章
  const achievementBadges = [
    { code: 'iron_man', name: '铁人', icon: 'mdi:lightning-bolt', rarity: 'legendary' },
    { code: 'pigeon_killer', name: '鸽子杀手', icon: 'mdi:skull-crossbones', rarity: 'legendary' },
    { code: 'race_king', name: '赛鸽之王', icon: 'mdi:emoticon-dead', rarity: 'legendary' },
    { code: 'pro_player', name: '职业选手', icon: 'mdi:skull', rarity: 'rare' },
    { code: 'lost_self', name: '迷失自我', icon: 'mdi:ghost', rarity: 'rare' },
    { code: 'firefighter', name: '救火队员', icon: 'mdi:fire', rarity: 'rare' },
    { code: 'organizer', name: '约战之王', icon: 'mdi:account-group', rarity: 'rare' },
    { code: 'comeback', name: '归来王者', icon: 'mdi:trending-up', rarity: 'rare' },
    { code: 'loyal', name: '守信者', icon: 'mdi:shield-check', rarity: 'epic' },
    { code: 'initiator', name: '组织者', icon: 'mdi:file-document', rarity: 'epic' },
    { code: 'stable', name: '稳定性', icon: 'mdi:pulse', rarity: 'epic' },
    { code: 'first_win', name: '首胜', icon: 'mdi:star', rarity: 'common' },
    { code: 'first_host', name: '首约', icon: 'mdi:certificate', rarity: 'common' },
    { code: 'regular', name: '常客', icon: 'mdi:account-check', rarity: 'common' },
    { code: 'centurion', name: '百人斩', icon: 'mdi:target', rarity: 'legendary' },
    { code: 'perfectionist', name: '完美主义者', icon: 'mdi:check-circle-outline', rarity: 'rare' },
  ];

  // 行为徽章
  const behaviorBadges = [
    { code: 'attended', name: '践约', icon: 'mdi:check-circle', rarity: 'common' },
    { code: 'no_show', name: '毁约', icon: 'mdi:close-circle', rarity: 'common' },
    { code: 'initiated', name: '立约', icon: 'mdi:file-document', rarity: 'common' },
    { code: 'excused', name: '告假', icon: 'mdi:clock-alert', rarity: 'common' },
    { code: 'late_excuse', name: '临时有事', icon: 'mdi:alert', rarity: 'common' },
    { code: 'admin_adjust', name: '神之手', icon: 'mdi:hand-right', rarity: 'rare' },
  ];

  const allBadges = [
    ...rankBadges.map((b) => ({
      ...b,
      category: 'rank' as const,
      description: getBadgeDescription(b.code),
      unlockCondition: JSON.stringify(getBadgeUnlockCondition(b.code)),
    })),
    ...achievementBadges.map((b) => ({
      ...b,
      category: 'achievement' as const,
      description: getBadgeDescription(b.code),
      unlockCondition: JSON.stringify({}),
    })),
    ...behaviorBadges.map((b) => ({
      ...b,
      category: 'behavior' as const,
      description: getBadgeDescription(b.code),
      unlockCondition: JSON.stringify({}),
    })),
  ];

  for (const badge of allBadges) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: {
        name: badge.name,
        icon: badge.icon,
        description: badge.description,
        category: badge.category,
        rarity: badge.rarity,
        unlockCondition: badge.unlockCondition,
      },
      create: {
        code: badge.code,
        name: badge.name,
        icon: badge.icon,
        description: badge.description,
        category: badge.category,
        rarity: badge.rarity,
        unlockCondition: badge.unlockCondition,
      },
    });
  }

  console.log(`✓ 创建了 ${allBadges.length} 个徽章`);

  console.log('\n✅ 种子数据完成!');
  console.log('\n📝 登录信息:');
  console.log('  用户名: admin');
  console.log('  密码: admin123');
  console.log('\n🎫 测试邀请码:');
  inviteCodes.forEach((inv) => console.log(`  - ${inv.code}`));
}

function getBadgeDescription(code: string): string {
  const descriptions: Record<string, string> = {
    // 等级徽章
    legendary: 'RP达到500+，获得传说缔约者称号',
    diamond: 'RP达到350-499，获得钻石战神称号',
    gold: 'RP达到250-349，获得黄金大腿称号',
    silver: 'RP达到180-249，获得白银骑士称号',
    bronze: 'RP达到120-179，获得青铜玩家称号',
    pigeon: 'RP降到80-119，成为扑棱鸽子',
    old_pigeon: 'RP降到50-79，成为老鸽子',
    pigeon_king: 'RP降到20-49，成为鸽王之王',
    missing: 'RP低于20，成为失踪人口',

    // 成就徽章
    iron_man: '连续20次参加活动不缺席',
    pigeon_killer: '累计放鸽子导致3次活动流局',
    race_king: '单次活动放鸽子人数≥3时也放鸽子',
    pro_player: '30天内放鸽子5次以上',
    lost_self: 'RP跌破30',
    firefighter: '5次在活动前1小时加入',
    organizer: '发起10次成功活动',
    comeback: '从RP低于50回升到100+',
    loyal: '连续10次参加活动不缺席',
    initiator: '发起5次成功活动',
    stable: 'RP连续30天保持100+',
    first_win: '第一次成功参与活动',
    first_host: '第一次发起活动',
    regular: '累计参与10次活动',
    centurion: '累计参与100次活动',
    perfectionist: '30天内无请假、无放鸽子',

    // 行为徽章
    attended: '准时参加活动',
    no_show: '投票确认但未到场',
    initiated: '发起活动',
    excused: '提前请假（活动开始前2小时）',
    late_excuse: '超时请假（活动开始前2小时内）',
    admin_adjust: '管理员手动调整积分',
  };

  return descriptions[code] || '';
}

function getBadgeUnlockCondition(code: string): Record<string, number> {
  const conditions: Record<string, Record<string, number>> = {
    // 等级徽章
    legendary: { minRp: 500 },
    diamond: { minRp: 350 },
    gold: { minRp: 250 },
    silver: { minRp: 180 },
    bronze: { minRp: 120 },
    pigeon: { minRp: 80 },
    old_pigeon: { minRp: 50 },
    pigeon_king: { minRp: 20 },
    missing: { maxRp: 19 },
  };

  return conditions[code] || {};
}

main()
  .catch((e) => {
    console.error('❌ 种子数据失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
