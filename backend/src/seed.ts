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
    await prisma.invitation.create({
      data: {
        code: 'TEST2024CODE01',
        status: 'pending',
        createdBy: { connect: { id: admin.id } },
      },
    }),
    await prisma.invitation.create({
      data: {
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
    { code: 'legendary', name: '传说缔约者', icon: 'crown', rarity: 'legendary' },
    { code: 'diamond', name: '钻石战神', icon: 'gem', rarity: 'legendary' },
    { code: 'gold', name: '黄金大腿', icon: 'medal', rarity: 'rare' },
    { code: 'silver', name: '白银骑士', icon: 'shield', rarity: 'epic' },
    { code: 'bronze', name: '青铜玩家', icon: 'award', rarity: 'common' },
    { code: 'pigeon', name: '扑棱鸽子', icon: 'bird', rarity: 'common' },
    { code: 'old_pigeon', name: '老鸽子', icon: 'alert-triangle', rarity: 'common' },
    { code: 'pigeon_king', name: '鸽王之王', icon: 'skull', rarity: 'rare' },
    { code: 'missing', name: '失踪人口', icon: 'user-minus', rarity: 'rare' },
  ];

  // 成就徽章
  const achievementBadges = [
    { code: 'iron_man', name: '铁人', icon: 'zap', rarity: 'legendary' },
    { code: 'pigeon_killer', name: '鸽子杀手', icon: 'skull-cross', rarity: 'legendary' },
    { code: 'race_king', name: '赛鸽之王', icon: 'bird-off', rarity: 'legendary' },
    { code: 'pro_player', name: '职业选手', icon: 'skull', rarity: 'rare' },
    { code: 'lost_self', name: '迷失自我', icon: 'ghost', rarity: 'rare' },
    { code: 'firefighter', name: '救火队员', icon: 'flame', rarity: 'rare' },
    { code: 'organizer', name: '约战之王', icon: 'users-three', rarity: 'rare' },
    { code: 'comeback', name: '归来王者', icon: 'trending-up', rarity: 'rare' },
    { code: 'loyal', name: '守信者', icon: 'shield-check', rarity: 'epic' },
    { code: 'initiator', name: '组织者', icon: 'scroll-text', rarity: 'epic' },
    { code: 'stable', name: '稳定性', icon: 'activity', rarity: 'epic' },
    { code: 'first_win', name: '首胜', icon: 'star', rarity: 'common' },
    { code: 'first_host', name: '首约', icon: 'scroll', rarity: 'common' },
    { code: 'regular', name: '常客', icon: 'user-check', rarity: 'common' },
    { code: 'centurion', name: '百人斩', icon: 'target', rarity: 'legendary' },
    { code: 'perfectionist', name: '完美主义者', icon: 'check-circle-2', rarity: 'rare' },
  ];

  // 行为徽章
  const behaviorBadges = [
    { code: 'attended', name: '践约', icon: 'check-circle', rarity: 'common' },
    { code: 'no_show', name: '毁约', icon: 'x-circle', rarity: 'common' },
    { code: 'initiated', name: '立约', icon: 'scroll-text', rarity: 'common' },
    { code: 'excused', name: '告假', icon: 'clock-alert', rarity: 'common' },
    { code: 'late_excuse', name: '临时有事', icon: 'alert-triangle', rarity: 'common' },
    { code: 'admin_adjust', name: '神之手', icon: 'hand', rarity: 'rare' },
  ];

  const allBadges = [
    ...rankBadges.map((b) => ({ ...b, category: 'rank' as const, description: getBadgeDescription(b.code) })),
    ...achievementBadges.map((b) => ({ ...b, category: 'achievement' as const, description: getBadgeDescription(b.code) })),
    ...behaviorBadges.map((b) => ({ ...b, category: 'behavior' as const, description: getBadgeDescription(b.code) })),
  ];

  for (const badge of allBadges) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: {},
      create: {
        code: badge.code,
        name: badge.name,
        icon: badge.icon,
        description: badge.description,
        category: badge.category,
        rarity: badge.rarity,
        unlockCondition: JSON.stringify({}),
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
    legendary: 'RP达到150+，获得传说缔约者称号',
    diamond: 'RP达到130-149，获得钻石战神称号',
    gold: 'RP达到115-129，获得黄金大腿称号',
    silver: 'RP达到100-114，获得白银骑士称号',
    bronze: 'RP达到85-99，获得青铜玩家称号',
    pigeon: 'RP降到70-84，成为扑棱鸽子',
    old_pigeon: 'RP降到50-69，成为老鸽子',
    pigeon_king: 'RP降到30-49，成为鸽王之王',
    missing: 'RP低于30，成为失踪人口',

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

main()
  .catch((e) => {
    console.error('❌ 种子数据失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
