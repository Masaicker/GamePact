import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 等级徽章数据
const rankBadges = [
  {
    code: 'legendary',
    name: '传说缔约者',
    icon: 'mdi:crown',
    description: 'RP达到500，游戏圈的传说人物',
    category: 'rank',
    rarity: 'legendary',
    unlockCondition: { minRp: 500 },
  },
  {
    code: 'diamond',
    name: '钻石战神',
    icon: 'mdi:gem',
    description: 'RP达到350，战无不胜的钻石级玩家',
    category: 'rank',
    rarity: 'legendary',
    unlockCondition: { minRp: 350 },
  },
  {
    code: 'gold',
    name: '黄金大腿',
    icon: 'mdi:medal',
    description: 'RP达到250，值得信赖的强力队友',
    category: 'rank',
    rarity: 'rare',
    unlockCondition: { minRp: 250 },
  },
  {
    code: 'silver',
    name: '白银骑士',
    icon: 'mdi:shield',
    description: 'RP达到180，稳定的游戏参与者',
    category: 'rank',
    rarity: 'rare',
    unlockCondition: { minRp: 180 },
  },
  {
    code: 'bronze',
    name: '青铜玩家',
    icon: 'mdi:award',
    description: 'RP达到120，正在成长的玩家',
    category: 'rank',
    rarity: 'epic',
    unlockCondition: { minRp: 120 },
  },
  {
    code: 'pigeon',
    name: '扑棱鸽子',
    icon: 'mdi:bird',
    description: 'RP达到80，偶尔会鸽但还算活跃',
    category: 'rank',
    rarity: 'epic',
    unlockCondition: { minRp: 80 },
  },
  {
    code: 'old_pigeon',
    name: '老鸽子',
    icon: 'mdi:alert-triangle',
    description: 'RP达到50，鸽子身份坐实',
    category: 'rank',
    rarity: 'common',
    unlockCondition: { minRp: 50 },
  },
  {
    code: 'pigeon_king',
    name: '鸽王之王',
    icon: 'mdi:skull',
    description: 'RP达到20，名副其实的鸽王',
    category: 'rank',
    rarity: 'common',
    unlockCondition: { minRp: 20 },
  },
  {
    code: 'missing',
    name: '失踪人口',
    icon: 'mdi:user-minus',
    description: 'RP低于20，长期失踪状态',
    category: 'rank',
    rarity: 'common',
    unlockCondition: { maxRp: 19 },
  },
];

// 成就徽章数据
const achievementBadges = [
  {
    code: 'iron_man',
    name: '铁人',
    icon: 'mdi:flash',
    description: '连续20次参加不缺席',
    category: 'achievement',
    rarity: 'legendary',
    unlockCondition: { type: 'consecutive_attended', count: 20 },
  },
  {
    code: 'pigeon_killer',
    name: '鸽子杀手',
    icon: 'mdi:skull',
    description: '累计放鸽子导致3次活动流局',
    category: 'achievement',
    rarity: 'legendary',
    unlockCondition: { type: 'caused_cancellation', count: 3 },
  },
  {
    code: 'race_king',
    name: '赛鸽之王',
    icon: 'mdi:bird',
    description: '单次活动放鸽子人数≥3时也放鸽子',
    category: 'achievement',
    rarity: 'legendary',
    unlockCondition: { type: 'no_show_in_mass_pigeon_session' },
  },
  {
    code: 'pro_player',
    name: '职业选手',
    icon: 'mdi:skull',
    description: '30天内放鸽子5次以上',
    category: 'achievement',
    rarity: 'rare',
    unlockCondition: { type: 'no_show_count_in_period', days: 30, count: 5 },
  },
  {
    code: 'lost_self',
    name: '迷失自我',
    icon: 'mdi:ghost',
    description: 'RP跌破30',
    category: 'achievement',
    rarity: 'rare',
    unlockCondition: { type: 'rp_below', threshold: 30 },
  },
  {
    code: 'firefighter',
    name: '救火队员',
    icon: 'mdi:fire',
    description: '5次在活动前1小时加入',
    category: 'achievement',
    rarity: 'rare',
    unlockCondition: { type: 'last_minute_join', count: 5 },
  },
  {
    code: 'organizer',
    name: '约战之王',
    icon: 'mdi:account-group',
    description: '发起10次成功活动',
    category: 'achievement',
    rarity: 'rare',
    unlockCondition: { type: 'initiated_sessions', count: 10 },
  },
  {
    code: 'comeback',
    name: '归来王者',
    icon: 'mdi:trending-up',
    description: '从低于50分回升到120+',
    category: 'achievement',
    rarity: 'rare',
    unlockCondition: { type: 'comeback', from: 50, to: 120 },
  },
  {
    code: 'loyal',
    name: '守信者',
    icon: 'mdi:shield-check',
    description: '连续10次参加不缺席',
    category: 'achievement',
    rarity: 'epic',
    unlockCondition: { type: 'consecutive_attended', count: 10 },
  },
  {
    code: 'initiator',
    name: '组织者',
    icon: 'mdi:script-text',
    description: '发起5次成功活动',
    category: 'achievement',
    rarity: 'epic',
    unlockCondition: { type: 'initiated_sessions', count: 5 },
  },
  {
    code: 'stable',
    name: '稳定性',
    icon: 'mdi:chart-line',
    description: 'RP连续30天保持120+',
    category: 'achievement',
    rarity: 'epic',
    unlockCondition: { type: 'stable_rp', days: 30, threshold: 120 },
  },
  {
    code: 'first_win',
    name: '首胜',
    icon: 'mdi:star',
    description: '第一次成功参与活动',
    category: 'achievement',
    rarity: 'common',
    unlockCondition: { type: 'first_attended' },
  },
  {
    code: 'first_host',
    name: '首约',
    icon: 'mdi:script-text',
    description: '第一次发起活动',
    category: 'achievement',
    rarity: 'common',
    unlockCondition: { type: 'first_initiated' },
  },
  {
    code: 'regular',
    name: '常客',
    icon: 'mdi:account-check',
    description: '累计参与10次活动',
    category: 'achievement',
    rarity: 'common',
    unlockCondition: { type: 'attended_sessions', count: 10 },
  },
  {
    code: 'centurion',
    name: '百人斩',
    icon: 'mdi:target',
    description: '累计参与100次活动',
    category: 'achievement',
    rarity: 'legendary',
    unlockCondition: { type: 'attended_sessions', count: 100 },
  },
  {
    code: 'perfectionist',
    name: '完美主义者',
    icon: 'mdi:check-circle',
    description: '30天内无请假、无放鸽子',
    category: 'achievement',
    rarity: 'rare',
    unlockCondition: { type: 'perfect_30_days' },
  },
];

// 行为徽章数据
const behaviorBadges = [
  {
    code: 'attended',
    name: '践约',
    icon: 'mdi:check-circle',
    description: '准时参加活动',
    category: 'behavior',
    rarity: 'common',
    unlockCondition: {},
  },
  {
    code: 'no_show',
    name: '毁约',
    icon: 'mdi:close-circle',
    description: '放鸽子',
    category: 'behavior',
    rarity: 'common',
    unlockCondition: {},
  },
  {
    code: 'initiated',
    name: '立约',
    icon: 'mdi:script-text',
    description: '发起活动',
    category: 'behavior',
    rarity: 'common',
    unlockCondition: {},
  },
  {
    code: 'excused',
    name: '告假',
    icon: 'mdi:clock-alert',
    description: '提前请假',
    category: 'behavior',
    rarity: 'common',
    unlockCondition: {},
  },
  {
    code: 'late_excuse',
    name: '临时有事',
    icon: 'mdi:alert',
    description: '超时请假',
    category: 'behavior',
    rarity: 'common',
    unlockCondition: {},
  },
  {
    code: 'admin_adjust',
    name: '神之手',
    icon: 'mdi:hand',
    description: '管理员调整',
    category: 'behavior',
    rarity: 'rare',
    unlockCondition: {},
  },
];

async function main() {
  console.log('开始初始化徽章数据...');

  // 使用upsert更新或插入等级徽章
  for (const badge of rankBadges) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: {
        name: badge.name,
        icon: badge.icon,
        description: badge.description,
        category: badge.category,
        rarity: badge.rarity,
        unlockCondition: JSON.stringify(badge.unlockCondition),
      },
      create: {
        ...badge,
        unlockCondition: JSON.stringify(badge.unlockCondition),
      },
    });
  }
  console.log(`✓ 更新/插入 ${rankBadges.length} 个等级徽章`);

  // 更新/插入成就徽章
  for (const badge of achievementBadges) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: {
        name: badge.name,
        icon: badge.icon,
        description: badge.description,
        category: badge.category,
        rarity: badge.rarity,
        unlockCondition: JSON.stringify(badge.unlockCondition),
      },
      create: {
        ...badge,
        unlockCondition: JSON.stringify(badge.unlockCondition),
      },
    });
  }
  console.log(`✓ 更新/插入 ${achievementBadges.length} 个成就徽章`);

  // 更新/插入行为徽章
  for (const badge of behaviorBadges) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: {
        name: badge.name,
        icon: badge.icon,
        description: badge.description,
        category: badge.category,
        rarity: badge.rarity,
        unlockCondition: JSON.stringify(badge.unlockCondition),
      },
      create: {
        ...badge,
        unlockCondition: JSON.stringify(badge.unlockCondition),
      },
    });
  }
  console.log(`✓ 更新/插入 ${behaviorBadges.length} 个行为徽章`);

  console.log('徽章数据初始化完成！');
  console.log(`总计: ${rankBadges.length + achievementBadges.length + behaviorBadges.length} 个徽章`);
}

main()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
