
'use strict';
/* ═══════════════════════════════════════════════════════════════
   银河系中心酒吧 · 单文件调酒经营小游戏
   纯 CSS + SVG + JS 实现（未使用SVG，全部CSS），无任何外部依赖
   ═══════════════════════════════════════════════════════════════ */

/* ════════════ 一、配置区（配方/数值/文案全部集中在这里，方便迭代） ════════════ */

/* 颜色混合：将多种原料颜色按等权平均混合为成品酒颜色（RGB 加权平均） */
function blendColors(colors) {
  if (!colors || !colors.length) return '#cccccc';
  let r = 0, g = 0, b = 0;
  for (const c of colors) {
    const hex = c.replace('#', '');
    r += parseInt(hex.substring(0, 2), 16);
    g += parseInt(hex.substring(2, 4), 16);
    b += parseInt(hex.substring(4, 6), 16);
  }
  r = Math.round(r / colors.length);
  g = Math.round(g / colors.length);
  b = Math.round(b / colors.length);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
const CONFIG = {
  START_REP: 50,           // 初始声望
  MAX_QUEUE: 4,            // 场上最多同时存在的顾客数量（3-4位），满员后新顾客直接流失
  MAX_LOST: 20,            // 流失顾客达到该数量 → GameOver
  SHAKER_CAPACITY: 4,      // 调酒壶最多装 4 份原料（冰块不计入）
  SHAKE_CLICK_GAIN: 40,    // 每次点击调酒壶 / 按空格增加的进度（%）——摇 2 下 80%，第 3 下必满
  SHAKE_AUTO_RATE: 4,      // 自动摇酒：每个心跳（100ms）增加的进度（%）
  SHAKE_CLICK_COOLDOWN: 130, // 点击/空格摇酒的冷却（毫秒）
  DAY_SECONDS: 60,         // 每 N 秒进入下一天（难度递增）
  SPAWN_BASE: 13,          // 初始刷客间隔（秒）：刚开业客人流量稍多一点
  SPAWN_MIN: 6,            // 刷客间隔下限（秒）
  SPAWN_RAMP: 1.5,         // 从第 5 天起，每过一天刷客间隔缩短的秒数（慢慢加快）
  PATIENCE_BASE: 60,       // 单客基础耐心（秒）：一位客人 60s 正常
  PATIENCE_QUEUE_BONUS: 8, // 排队等待的人多时，每位等待者增加的耐心（秒）
  PATIENCE_QUEUE_BONUS_CAP: 24, // 排队加时上限（秒）
  LOST_PENALTY_COINS: 15,  // 流失顾客扣星币
  LOST_PENALTY_REP: 5,     // 流失顾客扣声望
  GRADES: {                // 评分分级 → 星币倍率 + 声望变化
    perfect: { label: '非常满意', mult: 1.0, rep: 10 },
    good:    { label: '还算满意', mult: 0.7, rep: 5 },
    bad:     { label: '不太满意', mult: 0.4, rep: -5 },
  },
  /* ── 2.0 收租系统 ── */
  RENT_INTERVAL_DAYS: 7,    // 每 7 游戏天阿婆来收租（期间可随时预缴）
  RENT_AMOUNT: 1280,        // 每周租金
  RENT_PAY_OPTIONS: [580, 780, 980, 1280], // 可选缴费金额
  DEBT_REP_PENALTY: 2,      // 负债状态下每完成一单额外扣的声望
  /* ── 2.0 小水手工资 ── */
  SAILOR_WAGE_PER_CUST: 15, // 小水手每服务一位客人的工资
  SAILOR_MOOD_MAX: 100,     // 心情上限
  SAILOR_MOOD_MIN: 50,      // 心情低于此值拒绝代班
  /* ── 2.0 盗贼事件 ── */
  ROBBERY_BASE_RATE: 0.06,  // 每完成一单后的基础触发率 6%
  ROBBERY_THRESHOLD: 3000,  // 现金超此值触发率翻倍
  ROBBERY_LOSS_MIN: 0.3,    // 失败损失下限 30%
  ROBBERY_LOSS_MAX: 0.5,    // 失败损失上限 50%
  ROBBERY_QTE_CLICKS: 15,   // QTE 需点击次数
  ROBBERY_QTE_TIME: 8,      // QTE 限时（秒）
};

/* ════════════ 2.0 员工手册数据（后续可替换为 JSON/图片） ════════════ */
/* 星际猎手档案：status: on=在线 / rest=休息 / hurt=受伤 */
const EMPLOYEES = [
  { id: 'shrimp', name: '虾兵蟹将的将', role: '首席调酒师', emoji: '🦀', desc: '用蟹钳精准摇壶的海底来客，据说曾是龙宫御厨。', status: 'on', color: '#e8743a' },
  { id: 'astra', name: '阿星', role: '侍应生', emoji: '👽', desc: '三眼星人，能同时记住 12 桌订单，从不记错。', status: 'on', color: '#7ee0c0' },
  { id: 'tara', name: '塔拉撒里昂', role: '驻场顾问', emoji: '👑', desc: '前银河帝国贵族，擅长品鉴稀有利口酒。', status: 'rest', color: '#f0d060' },
  { id: 'anon', name: '无可奉告', role: '神秘常客', emoji: '🃏', desc: '没人知道他的名字，但他的小费从来没少过。', status: 'on', color: '#b890e8' },
];
const EMP_STATUS = { on: { label: '在线', color: '#5fd49a' }, rest: { label: '休息', color: '#93a0b8' }, hurt: { label: '受伤', color: '#ff6b6b' } };

/* 规则怪谈教程：《新员工入职须知（绝密）》 */
const RULES = [
  { n: 1, text: '如果客人点了「红眼」，请确认他的眼睛真的是红色的。如果是绿色的，请立刻呼叫店长。' },
  { n: 2, text: '本酒吧没有名为「虚空」的特调。若菜单上出现，请勿制作，直接倒掉。' },
  { n: 3, text: '收租阿婆只在周五出现。如果在周二看到了她，请假装看不见。' },
  { n: 4, text: '摇酒壶里的冰块不会融化。如果它融化了，请检查自己是否还在银河系。' },
  { n: 5, text: '「无可奉告」点单时永远不要问他要什么。给他你觉得最好的那杯。' },
  { n: 6, text: '吧台下方的第三个抽屉不要打开。那是给前任调酒师留的。' },
  { n: 7, text: '凌晨 3 点到 3 点 07 分之间，禁止播放爵士乐。原因你不会想知道的。' },
  { n: 8, text: '如果有客人留下金色星币且不找零，记得在日志里画一个星号。那是给店长的。' },
];

/* ════════════ 内嵌素材（包内文件） ════════════ */
const STORY_BG1 = 'images/story-bg1.jpg'; // 幕1：银河系中心酒吧外观

const STORY_CHAR1 = 'images/story-char1.png'; // 幕1：小水手（透明底） // 幕1：小水手

const STORY_BG2 = 'images/story-bg2.jpg'; // 幕2：酒吧内景（场景2）

const STORY_CHAR2 = 'images/story-char2.png'; // 幕2：烬行（透明底） // 幕2：烬行 // 幕2：烬行


/* 背景图配置：
   实拍吧台图（images/bar-bg.jpg）。如需更换/移除：
   · 移除照片 → 改为 const BG_IMAGE = '';（回退到 CSS 星空背景）
   · 换外部图片 → const BG_IMAGE = 'url(你的图片.jpg)'; 并与本文件放同一目录 */
const BG_IMAGE = 'images/bar-bg.jpg';

/* 全部原料（颜色用于酒液配色渲染） */
const INGREDIENTS = [
  // 基底酒
  { id: 'vodka',    name: '伏特加',   cat: 'spirit',  color: '#eef7fb' },
  { id: 'tequila',  name: '龙舌兰',   cat: 'spirit',  color: '#f7e8c9' },
  { id: 'rum',      name: '朗姆酒',   cat: 'spirit',  color: '#d9a765' },
  { id: 'gin',      name: '金酒',     cat: 'spirit',  color: '#e2f5e0' },
  { id: 'whisky',   name: '威士忌',   cat: 'spirit',  color: '#c1843f' },
  // 利口酒
  { id: 'triplesec', name: '橙味利口酒', cat: 'liqueur', color: '#f5a83c' },
  { id: 'bluecuracao', name: '蓝橙酒', cat: 'liqueur', color: '#2f6fd8' },
  { id: 'kahlua',   name: '咖啡利口酒', cat: 'liqueur', color: '#5b3a24' },
  { id: 'midori',   name: '蜜瓜利口酒', cat: 'liqueur', color: '#8fd84e' },
  { id: 'vermouth', name: '干味美思', cat: 'liqueur', color: '#d8c39a' },
  { id: 'chartreuse', name: '查特酒',  cat: 'liqueur', color: '#8fbf2f' },
  { id: 'violetcream', name: '紫罗兰利口酒', cat: 'liqueur', color: '#a878ff' },
  { id: 'tokaji',   name: '托卡伊甜酒', cat: 'liqueur', color: '#e6b93f' },
  // 果汁
  { id: 'lime',     name: '青柠汁',   cat: 'juice',   color: '#cfe86a' },
  { id: 'lemon',    name: '柠檬汁',   cat: 'juice',   color: '#f5e97a' },
  { id: 'orange',   name: '橙汁',     cat: 'juice',   color: '#ffab3c' },
  { id: 'cranberry', name: '蔓越莓汁', cat: 'juice',  color: '#d84e6a' },
  { id: 'pineapple', name: '菠萝汁',  cat: 'juice',   color: '#f7d66a' },
  { id: 'strawberry', name: '草莓汁', cat: 'juice',   color: '#ff7b9c' },
  // 配料（液体辅料，原料架「配料」页签）
  { id: 'syrup',    name: '糖浆',     cat: 'mixer',   color: '#eecf96' },
  { id: 'soda',     name: '苏打水',   cat: 'mixer',   color: '#eaf6f8' },
  { id: 'cream',    name: '奶油',     cat: 'mixer',   color: '#f7f0e2' },
  { id: 'cola',     name: '可乐',     cat: 'mixer',   color: '#6b4423' },
  { id: 'milk',     name: '牛奶',     cat: 'mixer',   color: '#fdf3e3' },
  // 小料（装饰物/点缀，原料架「小料」页签）
  { id: 'orange_peel',  name: '橙皮',     cat: 'garnish', color: '#f59b2c' },
  { id: 'brandied_cherry', name: '酒渍黑樱桃', cat: 'garnish', color: '#6e1f3a' },
  { id: 'cinnamon_stick', name: '肉桂棒',  cat: 'garnish', color: '#9c6b3f' },
  { id: 'sugar_rim',  name: '红糖霜杯边', cat: 'garnish', color: '#b06a3a' },
  { id: 'angostura',  name: '安格斯特拉芳香苦精', cat: 'garnish', color: '#8c3b1f' },
  { id: 'gold_powder', name: '可食用闪金粉', cat: 'garnish', color: '#e9c96a' },
];

/* 水果装饰（乱给水果会扣分，不给不能上酒） */
const FRUITS = [
  { id: 'lime_w',     name: '青柠片', emoji: '🍋', bg: '#7fb63f' },
  { id: 'lemon_w',    name: '柠檬片', emoji: '🍋', bg: '#f2d24a' },
  { id: 'orange_w',   name: '橙片',   emoji: '🍊', bg: '#f59b2c' },
  { id: 'cherry',     name: '樱桃',   emoji: '🍒', bg: '#e04a6a' },
  { id: 'pineapple_w', name: '菠萝角', emoji: '🍍', bg: '#f0c03c' },
  { id: 'strawberry_w', name: '草莓', emoji: '🍓', bg: '#ff5d7a' },
];

/* 顾客角色头像（180px 内嵌） */
const CHAR_IMG = {
  jinxing: 'images/av-jinxing.png',
  linf: 'images/av-linf.png',
  duyi: 'images/av-duyi.png',
  talas: 'images/av-talas.png',
  sword: 'images/av-sword.png',
  cybern: 'images/av-cybern.png',
  chan: 'images/av-chan.png',
  shrimp: 'images/av-shrimp.png',
};






/* 鸡尾酒配方表（新增酒品只需加一行；owner = 「XX 的配方」署名彩蛋）
   2.0 逻辑区分：ingredients = 摇酒前放入壶中的原料（原料柜取用）
                garnish = 倒酒入杯后才加入的小料（右下「小料与水果」面板，不参与摇酒）
                fruit = 放在酒杯外侧的水果装饰 */
const RECIPES = [
  { id: 'strawberry_rum', name: '草莓朗姆酒', owner: '烬行的配方', color: '#ff8ab0', diff: 1, needsShake: true,  ingredients: ['rum', 'strawberry', 'lime'], garnish: ['sugar_rim'],                       fruit: 'strawberry_w', reward: 110 },
  { id: 'blue_margarita', name: '蓝色玛格丽特', owner: '铃弗瑞迪尔的配方', color: '#2f6fd8', diff: 3, needsShake: true, ingredients: ['tequila', 'bluecuracao', 'lime'], garnish: ['sugar_rim'],                fruit: 'lime_w',        reward: 190 },
  { id: 'chartreuse_green', name: '查特绿', owner: '度漪的配方', color: '#8fbf2f', diff: 2, needsShake: false, ingredients: ['chartreuse', 'lime', 'soda'], garnish: ['cinnamon_stick'],                 fruit: 'lime_w',        reward: 150 },
  { id: 'violet_cream',   name: '紫罗兰奶油利口酒', owner: '塔拉撒里昂的配方', color: '#a878ff', diff: 2, needsShake: true, ingredients: ['violetcream', 'cream', 'syrup'], garnish: ['gold_powder'],            fruit: 'cherry',         reward: 160 },
  { id: 'tokaji_asu',     name: '托卡伊阿苏', owner: '赛博恩的配方', color: '#e6b93f', diff: 2, needsShake: false, ingredients: ['tokaji', 'lemon'], garnish: ['orange_peel', 'cinnamon_stick'],      fruit: 'lemon_w',        reward: 145 },
  { id: 'vodka_pure',     name: '伏特加', owner: '斯沃德麦伦的配方', color: '#f2f4f6', diff: 1, needsShake: false, ingredients: ['vodka'], garnish: ['orange_peel', 'angostura'],                    fruit: 'orange_w',       reward: 100 },
  { id: 'iced_cola',      name: '冰镇可乐', owner: '谶的配方', color: '#6b4423', diff: 1, needsShake: false, ingredients: ['cola', 'lemon'], garnish: ['brandied_cherry', 'angostura'],        fruit: 'lemon_w',        reward: 95 },
  { id: 'grass_milk',     name: '草泡奶', owner: '神秘配方', color: '#ff4d6a', diff: 1, needsShake: true,  ingredients: ['strawberry', 'milk', 'syrup'], garnish: ['gold_powder'],             fruit: 'strawberry_w',  reward: 115 },
];

/* 星际旅客的随机头像（趣味身份 emoji 池） */
const RACES = [
  { avatar: '🧑‍🚀' }, { avatar: '👽' }, { avatar: '🤖' }, { avatar: '🦾' },
  { avatar: '😺' }, { avatar: '🦑' }, { avatar: '💎' }, { avatar: '🏴‍☠️' },
  { avatar: '⏳' }, { avatar: '👑' },
];

/* ════════ 顾客角色 ════════
   固定角色带专属头像 + 头顶气泡台词（出场时冒出，与订单无关）
   · 斯沃德麦伦：未成年 → 固定订单=冰镇可乐，从下往上出场
   · 赛博恩：固定订单=伏特加（十万伏特）  · 谶：固定订单=草泡奶
   · 无可奉告：黑色方块，订单页只显示「无可奉告」，随便给什么都行 */
const CHARACTERS = [
  { id: 'jinxing', name: '烬行',       img: CHAR_IMG.jinxing, race: '赛博人',   quote: '我只是一名普普通通的调酒师', fixedOrder: null },
  { id: 'linf',    name: '铃弗瑞迪尔', img: CHAR_IMG.linf,    race: '人鱼族',   quote: '辛苦了，要好好休息哦',       fixedOrder: null },
  { id: 'duyi',    name: '度漪',       img: CHAR_IMG.duyi,    race: '精灵族',   quote: '可以给我你的半点心吗',       fixedOrder: null },
  { id: 'talas',   name: '塔拉撒里昂', img: CHAR_IMG.talas,   race: '龙裔',     quote: '喂，本王渴了',               fixedOrder: null },
  { id: 'sword',   name: '斯沃德麦伦', img: CHAR_IMG.sword,   race: '猫耳族',   quote: '嘿嘿嘿',                     fixedOrder: 'iced_cola', entrance: 'up' },
  { id: 'cybern',  name: '赛博恩',     img: CHAR_IMG.cybern,  race: '机器人',   quote: '本大爷要十万伏特',           fixedOrder: 'vodka_pure' },
  { id: 'chan',    name: '谶',         img: CHAR_IMG.chan,    race: '幽灵族',   quote: '请给本大侠一杯草泡奶',       fixedOrder: 'grass_milk' },
  { id: 'shrimp',  name: '虾兵蟹将的将', img: CHAR_IMG.shrimp, race: '海族',    quote: '咔咔咔',                    fixedOrder: null },
  { id: 'unknown', name: '无可奉告',   img: null,             race: '未知',     quote: '无可奉告',                   mystery: true },
];

/* 星际旅客的随机种族池 */
const COMMON_RACES = ['人鱼族', '赛博人', '地球人', '火星人', '机器人', '精灵族', '猫耳星人', '触手星人', '水晶星人', '时间旅人', '星际海盗', '仙女座贵族', '龙裔', '幽灵族'];

/* 星际旅客（普通顾客）：主力客源，随机名字 + 五字以内短气泡（可为空）+ 随机订单 */
const COMMON_NAMES = ['阿伟', '小美', '老王', '丽丽', '大壮', '阿珍', '小K', '老陈', 'Nova', 'Luna', 'Kira', 'Zed', '团团', '阿星', '拾月', '小满', '阿七', '灰灰', '晚风', '青柠'];
const COMMON_QUOTES = ['你好呀', '来一杯', '渴了', '夜安', '随便吧', '推荐一下', '快点哦', '谢谢啦', '久仰', '今晚月色真美', '嗯', '哦', ''];

/* 顾客结算/离场台词库（{name} 会替换为顾客名字） */
const DIALOGUE = {
  perfect: [
    '{name}非常满意，开心地走了，下次还来！',
    '{name}露出了灿烂的笑容，满意地离开了。',
    '{name}赞不绝口，说这是喝过最好的一杯！',
    '{name}心满意足地离开了，还推荐给了朋友。',
  ],
  good: [
    '{name}挠了挠头，一脸困惑地走了。',
    '{name}觉得味道还行，但似乎不是想要的那杯。',
    '{name}犹豫了一下，还是喝了下去。',
    '{name}耸了耸肩，说勉强可以接受。',
  ],
  bad: [
    '{name}尝了一口，说：「我觉得我想要的是另一杯……」',
    '{name}皱了皱眉，把杯子推了回来。',
    '{name}犹豫着放下了杯子，似乎不太想喝。',
    '{name}摇了摇头，转身离开了。',
  ],
  timeout: ['等太久了，走了！', '本星人的耐心是有限的！', '不喝了！浪费时间！'],
  overflow: ['这么多人？不排了！', '排队太长了，走人！'],
};


/* ════════════ 一·五、开场剧情对话（首次加载自动播放，刷新重播） ════════════
   三幕结构：幕1 酒吧外观+小水手 → 幕2 暗屏切换+烬行 → 幕3 进入游戏。
   bg/char 传 null 表示沿用上一段的场景与角色。 */
const STORY = [
  { scene: 1, bg: STORY_BG1,   char: STORY_CHAR1, name: '小水手', text: '检测到碳基生物......欢迎......欢迎！' },
  { scene: 2, bg: STORY_BG2,   char: STORY_CHAR2, name: '烬行',   text: '你好，我是酒吧的老板，烬行。' },
  { scene: 2, bg: null, char: null, name: '烬行', text: '走进酒吧我们就是彼此的同行者。' },
  { scene: 2, bg: null, char: null, name: '烬行', text: '在这里，只是相遇，只是存在，只是举杯。' },
  { scene: 2, bg: null, char: null, name: '烬行', text: '（说了一些赞美的话）那就这么说定了，你守护酒吧，我们守护你，干杯！' },
  { scene: 2, bg: null, char: null, name: '烬行', text: '拍完了，赛博恩' },
  { scene: 2, bg: null, char: null, name: '烬行', text: '关一下机，赛博恩' },
  { scene: 2, bg: null, char: null, name: '烬行', text: '赛博恩' },
];

let storyIdx = -1, storyTypeTimer = null, storyBusy = false, storyBg = '';

/* 把一句话按标点切成小段（。！？，和省略号处断开），逐段浮现，放慢对话节奏 */
function splitSegs(text) {
  const segs = [];
  let cur = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    cur += ch;
    const isEllipsisEnd = ch === '.' && i >= 2 && text.slice(i - 2, i + 1) === '...'
      && (i + 1 >= text.length || text[i + 1] !== '.');
    if ('。！？，'.includes(ch) || isEllipsisEnd) { segs.push(cur); cur = ''; }
  }
  if (cur) segs.push(cur);
  return segs;
}

/* 打字机逐字出现：每段之间停顿片刻，节奏放缓（点击可跳过直接显示完整句子） */
function startStoryType(s) {
  const t = el('story-text');
  el('story-name').textContent = s.name;
  el('story-hint').style.opacity = 0;
  t.textContent = '';
  const segs = splitSegs(s.text);
  let si = 0, ci = 0;
  const step = () => {
    ci++;
    t.textContent = segs.slice(0, si).join('') + segs[si].slice(0, ci);
    if (ci % 3 === 0 && state.soundOn && actx) playSound('tick');
    if (ci >= segs[si].length) {
      si++;
      if (si >= segs.length) { finishStoryType(); return; }
      ci = 0;
      storyTypeTimer = setTimeout(step, 560);   // 分段间停顿
    } else {
      storyTypeTimer = setTimeout(step, 72);    // 逐字间隔（放缓）
    }
  };
  storyTypeTimer = setTimeout(step, 420);
}
function finishStoryType() {
  if (storyTypeTimer) { clearTimeout(storyTypeTimer); storyTypeTimer = null; }
  const s = STORY[storyIdx];
  if (s) {
    el('story-text').textContent = s.text;
    el('story-hint').style.opacity = 1;
  }
}

/* 下一段对话：换场景时暗屏切换背景与角色（背景未变则不转场） */
function nextStoryLine() {
  storyIdx++;
  if (storyIdx >= STORY.length) { endStory(); return; }
  const s = STORY[storyIdx];
  if (s.bg && s.bg !== storyBg) {
    storyBusy = true;
    storyBg = s.bg;
    el('story-blackout').classList.add('on');
    setTimeout(() => {
      if (!state.storyActive) return;   // 被跳过：不再操作已关闭的遮罩
      el('story-bg').style.backgroundImage = `url("${s.bg}")`;
      const ch = el('story-char');
      ch.classList.remove('show');
      if (s.char) {
        ch.src = s.char;
        void ch.offsetWidth;
        ch.classList.add('show');
      }
      el('story-blackout').classList.remove('on');
    }, 560);
    setTimeout(() => { if (!state.storyActive) return; storyBusy = false; startStoryType(s); }, 640);
  } else {
    if (s.char) {
      const ch = el('story-char');
      ch.classList.remove('show');
      ch.src = s.char;
      void ch.offsetWidth;
      ch.classList.add('show');
    }
    startStoryType(s);
  }
  el('story-name').textContent = s.name;
}

/* 点击屏幕任意处：标题→开始对话；打字中→跳过动画；否则→下一段；最后一段→关闭弹窗进游戏 */
function storyClick() {
  if (!state.storyActive) return;
  if (state.storyPhase === 'title') {
    state.storyPhase = 'dialog';
    el('story-start').classList.remove('show');
    el('story-overlay').classList.remove('title-mode');
    nextStoryLine();
    return;
  }
  if (storyBusy) return;
  if (storyTypeTimer) { finishStoryType(); return; }
  nextStoryLine();
}

/* 剧情结束：弹窗自动淡出，解锁游戏 */
function endStory() {
  state.storyActive = false;
  storyBusy = false;
  if (storyTypeTimer) { clearTimeout(storyTypeTimer); storyTypeTimer = null; }
  stopStoryBGM();   // 剧情音乐停止，进店后切换为酒吧背景音乐
  const ov = el('story-overlay');
  ov.classList.add('hide');
  setTimeout(() => ov.remove(), 700);
  beginGame();
}

function beginGame() {
  // 兜底：跳过剧情入口时也移除剧情遮罩
  const ov = el('story-overlay');
  if (ov) {
    ov.classList.add('hide');
    setTimeout(() => ov.remove(), 100);
  }
  state.gameStarted = true;
  startBGM();                            // 进入酒吧：背景音乐响起（点击触发，符合自动播放策略）
  spawnCustomer();                       // 剧情播完后第一位顾客进店
  state.spawnTimer = spawnInterval();
  addLog('🚀 酒吧开业！加冰 → 原料柜取料 → 摇壶（点壶/空格/摇一摇）→ 点「出酒」装杯 → 加小料入杯与水果杯外 → 按铃上酒', 'welcome');
  renderAll();
}

/* 开场标题：直接展示酒吧外观，下方缓缓浮现「点击开始游戏」 */
function startStory() {
  state.storyActive = true;
  state.storyPhase = 'title';
  const ov = el('story-overlay');
  ov.classList.add('title-mode');
  storyBg = STORY_BG1;
  el('story-bg').style.backgroundImage = `url("${STORY_BG1}")`;
  el('story-char').classList.remove('show');
  startStoryBGM();   // 打开文件立即尝试播放音乐（被浏览器拦截时静音兜底）
  setTimeout(() => el('story-start').classList.add('show'), 550);
}

/* ════════════ 二、状态管理区 ════════════ */
const state = {
  coins: 0,                       // 星币（不清零，跨刷新积累）
  rep: CONFIG.START_REP,          // 声望（不清零，跨刷新积累）
  runs: [],                       // 个人排行榜：每局打烊时的最终声望纪录 [{rep, coins, day, t}]（不清零）
  served: 0,                      // 成功订单数（接待顾客数）
  lost: 0,                        // 流失顾客数（≥20 触发 GameOver）
  perfectCount: 0, goodCount: 0,  // 用于计算好评率
  day: 1, elapsed: 0,             // 第几天 / 累计时长
  rentDay: 0,                     // 2.0 收租：距离上次收租已过的天数（0~6）
  rentPaid: 0,                    // 2.0 本周已缴租金
  rentPrepaid: 0,                 // 2.0 预付到下周的金额
  grandmaStage: 0,                // 2.0 阿婆语气阶段 0~3（随欠租/临近升级）
  sailorMood: 100,                // 2.0 小水手心情值 0~100，低于50拒绝代班
  sailorServedWeek: 0,            // 2.0 本周小水手服务客人数
  sailorPayPending: false,        // 2.0 收租后待结算小水手工资
  queue: [],                      // 排队顾客数组
  nextCustId: 1, spawnTimer: 0,
  nextOrderNo: 1,                 // 订单编号（00001号订单起）
  selectedCustId: null,           // 右侧订单面板展示的顾客（默认队首）
  storyActive: false,             // 开场剧情进行中（屏蔽全部游戏交互）
  storyPhase: 'title',            // 'title'=开场标题（点击开始游戏） / 'dialog'=对话中
  gameStarted: false,             // 剧情播完前不刷客、不计时
  paused: false,                  // 暂停营业（休息中）
  inLounge: false,                // 是否在员工休息区（小水手接班中）
  inClass: false,                 // 2.0 授课中：课间休息，刷客与耐心全部冻结
  sailorServed: 0, sailorEarned: 0, // 小水手本次休息期间的服务统计
  /* 调酒壶：原料列表 / 是否加冰 / 摇晃进度(0-100) / 自动摇酒开关
     shakeSession：摇晃会话号，操作台重置时自增，用于作废未完成的摇晃动画回调 */
  shaker: { items: [], hasIce: false, shaken: false, shaking: false, shakeSession: 0, shakeProgress: 0, autoShake: false },
  /* 酒杯：倒酒后内容快照 / 杯内小料（倒酒后加入）/ 水果装饰（杯外） */
  glass: { filled: false, fruit: null, items: [], garnish: [], hasIce: false, shaken: false },
  garnishWarned: false,         // 小料软提醒：每杯只提醒一次（加了小料或换新一杯后复位）
  soundOn: true,                  // 音效开关
  bgmOn: true,                    // 背景音乐开关
  gameOver: false,
  robbery: { active: false, type: null, clicks: 0, target: 0, timer: null, session: 0 },
};

/* 背景音乐：内嵌 base64（audios.js）→ WebAudio 解码循环播放 */
let barBuf = null, barSrc = null, barGain = null;
function startBGM() {
  if (!state.bgmOn || state.gameOver || !window.AUDIO_B64) return;
  ensureAudio();
  if (!actx) return;
  if (barBuf) { startBarLoop(); return; }
  actx.decodeAudioData(b64ToBuf(AUDIO_B64.bar), function (buf) {
    barBuf = buf;
    if (state.gameStarted && !state.gameOver) startBarLoop();
  }, function () {});
}
function startBarLoop() {
  pauseBarBGM();
  if (!actx || !barBuf) return;
  barGain = actx.createGain();
  barGain.gain.value = 0.22;
  barGain.connect(actx.destination);
  barSrc = actx.createBufferSource();
  barSrc.buffer = barBuf;
  barSrc.loop = true;
  barSrc.connect(barGain);
  barSrc.start(0);
}
function pauseBarBGM() {
  if (barSrc) { try { barSrc.stop(); } catch (e) {} try { barSrc.disconnect(); } catch (e) {} barSrc = null; }
  if (barGain) { try { barGain.disconnect(); } catch (e) {} barGain = null; }
}
/* 开场剧情音乐：点开文件立即尝试出声播放，无缝循环（WebAudio 采样级循环无间隔），
   一直播放到切换到调酒页面才停止。
   浏览器自动播放限制兜底：若首次出声被拦截则先静音预播，用户首次触碰屏幕时立即出声 */
let storyBuf = null, storySrc = null, storyGain = null;
function b64ToBuf(b64) {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8.buffer;
}
function startStoryBGM() {
  if (!state.bgmOn || !window.AUDIO_B64) return;
  ensureAudio();
  if (!actx) return;
  if (storyBuf) { startStoryLoop(); return; }
  actx.decodeAudioData(b64ToBuf(AUDIO_B64.story), function (buf) {
    storyBuf = buf;
    if (state.storyActive) startStoryLoop();
  }, function () {});
}
function startStoryLoop() {
  stopStoryBGM();
  if (!actx || !storyBuf) return;
  storyGain = actx.createGain();
  storyGain.gain.value = 0.3;
  storyGain.connect(actx.destination);
  storySrc = actx.createBufferSource();
  storySrc.buffer = storyBuf;
  storySrc.loop = true;
  storySrc.connect(storyGain);
  storySrc.start(0);
}
function stopStoryBGM() {
  if (storySrc) { try { storySrc.stop(); } catch (e) {} try { storySrc.disconnect(); } catch (e) {} storySrc = null; }
  if (storyGain) { try { storyGain.disconnect(); } catch (e) {} storyGain = null; }
}
function toggleBGM() {
  if (state.bgmOn) {
    state.bgmOn = false;
    pauseBarBGM();
    stopStoryBGM();
    toast('🎵 背景音乐已关闭');
  } else {
    state.bgmOn = true;
    if (state.storyActive) startStoryBGM();
    else startBGM();
    toast('🎵 背景音乐已开启');
  }
}

/* 星币与声望不清零：localStorage 跨刷新积累（设置面板可手动清零） */
const SAVE_KEY = 'cyberbar_save_v1';
function saveProgress() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ coins: state.coins, rep: state.rep, runs: state.runs })); } catch (e) {}
}
function loadProgress() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (s && typeof s.coins === 'number' && typeof s.rep === 'number') {
      state.coins = s.coins; state.rep = s.rep;
      state.runs = Array.isArray(s.runs) ? s.runs : [];   // 旧存档无排行榜字段时为空榜
    }
  } catch (e) {}
}

/* 打烊上榜：每局结束（流失满 20 人）把最终声望计入个人排行榜，保留 TOP 10
   返回本次排名（1 起）；被挤出 TOP 10 返回 0 */
function recordRun() {
  const rec = { rep: state.rep, coins: state.coins, day: state.day, t: Date.now() };
  state.runs.push(rec);
  state.runs.sort((a, b) => b.rep - a.rep || b.t - a.t);   // 声望高者在前，同声望新的在前
  if (state.runs.length > 10) state.runs.length = 10;
  saveProgress();
  return state.runs.indexOf(rec) + 1;
}

/* 个人排行榜面板：历史最高声望 TOP 10（每局打烊结算时上榜） */
function renderRankPanel() {
  const list = el('rank-list');
  if (!state.runs.length) {
    list.innerHTML = '<div class="rank-empty">暂无纪录，打完一局自动上榜</div>';
    return;
  }
  const d = t => { const x = new Date(t); return (x.getMonth() + 1) + '月' + x.getDate() + '日'; };
  list.innerHTML = state.runs.map((r, i) =>
    `<div class="rank-item${i === 0 ? ' top' : ''}"><span class="rk-no">${i + 1}</span>` +
    `<span class="rk-main">🌟 ${r.rep} 声望<small>🪙 ${r.coins} 星币 · 第 ${r.day} 天</small></span>` +
    `<span class="rk-time">${d(r.t)}</span></div>`).join('');
}

/* 订单编号文本：00001号订单 */
const orderNoText = no => String(no).padStart(5, '0') + '号订单';

/* 阿拉伯数字 → 中文（用于第N天显示） */
const CN_DIGITS = '零一二三四五六七八九';
function cnNum(n) {
  if (n <= 10) return CN_DIGITS[n];
  if (n < 20) return '十' + (n % 10 ? CN_DIGITS[n % 10] : '');
  return CN_DIGITS[Math.floor(n / 10)] + '十' + (n % 10 ? CN_DIGITS[n % 10] : '');
}

const el = id => document.getElementById(id);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => min + Math.random() * (max - min);
const countMap = arr => arr.reduce((m, k) => ((m[k] = (m[k] || 0) + 1), m), {});
const ingOf = id => INGREDIENTS.find(i => i.id === id);
const fruitOf = id => FRUITS.find(f => f.id === id);

/* ════════════ 三、渲染区 ════════════ */

/* 顶部 HUD（带脏检查，避免每帧重写 DOM） */
function renderHUD() {
  const set = (id, v) => {
    const b = el(id);
    if (b.dataset.v !== String(v)) { b.dataset.v = v; b.textContent = v; }
  };
  set('hud-coins-b', state.coins);
  set('hud-rep-b', state.rep);
  set('hud-day-b', '第' + cnNum(state.day) + '天');   // 第一天 / 第二天 / ……
  // 收租倒计时：剩余天数 = RENT_INTERVAL_DAYS - rentDay
  const daysToRent = CONFIG.RENT_INTERVAL_DAYS - state.rentDay;
  set('hud-rent-b', daysToRent);
  set('hud-rent-paid', state.rentPaid + state.rentPrepaid);
  set('hud-rent-total', CONFIG.RENT_AMOUNT);
  // 负债状态：星币变红 + 脉冲
  el('hud-coins-b').classList.toggle('debt', state.coins < 0);
  // 临近收租（≤2天）时收租项变黄提示
  el('hud-rent-b').classList.toggle('rent-soon', daysToRent <= 2);
  // 小水手营业状态（休息区）
  if (el('sailor-served')) el('sailor-served').textContent = state.sailorServed;
  if (el('sailor-earned')) el('sailor-earned').textContent = state.sailorEarned;
  if (el('sailor-mood-hud')) el('sailor-mood-hud').textContent = state.sailorMood;
  if (el('sailor-status-text')) {
    const onStrike = state.sailorMood < CONFIG.SAILOR_MOOD_MIN;
    el('sailor-status-text').textContent = onStrike ? '小水手罢工中！' : '小水手营业中';
    el('sailor-status-bar').style.borderColor = onStrike ? 'rgba(255,107,107,.5)' : '';
  }
  // 已服务 / 流失统计 → 放在日志卡顶部固定区
  if (el('ls-served')) el('ls-served').textContent = state.served;
  if (el('ls-lost')) {
    el('ls-lost').textContent = state.lost;
    el('ls-lost').classList.toggle('warn', state.lost >= CONFIG.MAX_LOST - 5);
  }
}

/* 原料架：分类页签 + 按钮 */
let shelfCat = 'spirit';
function buildShelf() {
  el('shelf-tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    shelfCat = b.dataset.cat;
    el('shelf-tabs').querySelectorAll('[data-cat]').forEach(t => t.classList.toggle('active', t === b));
    renderShelf();
  });
  renderShelf();
}
function renderShelf() {
  el('shelf-grid').innerHTML = INGREDIENTS
    .filter(i => i.cat === shelfCat)
    .map(i => `<button class="shelf-btn" data-ing="${i.id}"><span class="shelf-dot" style="background:${i.color}"></span>${i.name}</button>`)
    .join('');
  el('shelf-grid').querySelectorAll('.shelf-btn').forEach(b =>
    b.addEventListener('click', () => addIngredient(ingOf(b.dataset.ing), b)));
}

/* 右下「小料与水果」面板：页签切换
   小料 = 倒酒后加入酒杯内（不参与摇酒）；水果 = 放在酒杯外侧的装饰 */
let gfCat = 'garnish';
function renderGF() {
  const grid = el('gf-grid');
  if (gfCat === 'garnish') {
    grid.innerHTML = INGREDIENTS
      .filter(i => i.cat === 'garnish')
      .map(i => `<button class="gf-btn" data-ing="${i.id}"><span class="shelf-dot" style="background:${i.color}"></span>${i.name}</button>`)
      .join('');
    grid.querySelectorAll('.gf-btn').forEach(b =>
      b.addEventListener('click', () => addGarnish(ingOf(b.dataset.ing), b)));
  } else {
    grid.innerHTML = FRUITS
      .map(f => `<button class="fruit-btn" data-fruit="${f.id}"><span class="fr-ico" style="background:${f.bg}">${f.emoji}</span>${f.name}</button>`)
      .join('');
    grid.querySelectorAll('.fruit-btn').forEach(b =>
      b.addEventListener('click', () => addFruit(fruitOf(b.dataset.fruit))));
  }
}
function buildGF() {
  el('gf-tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-gf]');
    if (!b) return;
    gfCat = b.dataset.gf;
    el('gf-tabs').querySelectorAll('[data-gf]').forEach(t => t.classList.toggle('active', t === b));
    renderGF();
  });
  renderGF();
}

/* 调酒壶状态同步到挂载容器（3D 模型对接点） */
function syncMountState() {
  const m = el('shaker-mount');
  let s;
  if (state.shaker.shaking) s = 'shaking';
  else if (state.shaker.shaken) s = 'shaken';
  else if (state.shaker.items.length > 0) s = 'filled';
  else s = 'empty';
  m.dataset.state = s;
}

/* 摇酒壶内液体渲染：分层配色（倒入原料后壶内颜色全部可见） */
function renderShakerLiquid() {
  const liq = el('shaker-liquid');
  liq.innerHTML = '';
  if (state.shaker.items.length) {
    liq.innerHTML = state.shaker.items
      .map(id => `<div class="lg-layer" style="background:${ingOf(id).color}"></div>`)
      .join('');
    liq.style.height = Math.min(100, 14 + state.shaker.items.length * 17) + '%';
  } else {
    liq.style.height = '0%';
  }
}

/* 操作台渲染：三阶段切换 empty（选料）→ shake（摇壶）→ glass（装盘） */
function renderStation() {
  const card = el('counter-card');
  let stage = 'empty';
  if (state.glass.filled) stage = 'glass';
  else if (state.shaker.items.length || state.shaker.hasIce || state.shaker.shaking || state.shaker.shaken) stage = 'shake';
  card.dataset.stage = stage;
  if (stage === 'empty') return;
  syncMountState();
  renderShakerLiquid();
  const parts = [];
  if (state.shaker.hasIce) parts.push('<span class="chip">🧊</span>');
  for (const id of state.shaker.items) {
    const ing = ingOf(id);
    parts.push(`<span class="chip"><i style="background:${ing.color}"></i>${ing.name}</span>`);
  }
  el('shaker-chips').innerHTML = parts.join('') || '<span class="chip-dim">壶内空空</span>';
  const st = el('shaker-status');
  if (state.shaker.shaking) st.textContent = '🌀 摇晃中… 加点劲！';
  else if (state.shaker.shaken) st.textContent = '✅ 摇晃完成，点击「出酒」装杯';
  else if (state.shaker.items.length) st.textContent = `已选 ${state.shaker.items.length} 种原料 · 点击「开始摇壶」`;
  else st.textContent = '🧊 已加冰块，请选择原料';
  el('shake-percent').textContent = Math.round(state.shaker.shakeProgress) + '%';
}

/* 酒杯渲染：液体为混合后的成品颜色（摇酒均匀混合） + 黑色圆盘装盘 + 小料水果装饰 */
function renderGlass() {
  const liq = el('glass-liquid');
  if (state.glass.filled && state.glass.items.length) {
    const colors = state.glass.items.map(id => ingOf(id).color);
    const mixed = blendColors(colors);
    liq.innerHTML = `<div class="lg-mixed" style="background:${mixed}"></div>`;
    liq.style.height = (28 + Math.min(state.glass.items.length, 5) * 12) + '%';
  } else {
    liq.innerHTML = '';
    liq.style.height = '0%';
  }
  const f = el('glass-fruit');
  f.innerHTML = state.glass.fruit
    ? `<span class="fr-ico" style="background:${fruitOf(state.glass.fruit).bg}">${fruitOf(state.glass.fruit).emoji}</span>`
    : '';
  // 杯内小料 chips（倒酒后加入的小料，显示在酒杯下方装盘区）
  el('glass-garnish').innerHTML = (state.glass.garnish || [])
    .map(id => { const g = ingOf(id); return `<span class="chip"><i style="background:${g.color}"></i>${g.name}</span>`; })
    .join('');
}

/* 耐心条配色：绿 → 黄 → 红（快超时变色预警） */
function patienceColor(pct) {
  return pct > 40 ? 'var(--ok)' : pct > 20 ? 'var(--warn)' : 'var(--danger)';
}

/* 刷新单个顾客的全部耐心 UI（中间头顶气泡 + 右侧列表 + 需求面板） */
function updatePatienceUI(c) {
  const pct = Math.max(0, c.patience / c.maxPatience * 100);
  const color = patienceColor(pct);
  const sec = Math.ceil(c.patience) + 's';
  const low = pct <= 20;
  if (c.ui) {
    for (const f of [c.ui.cFill, c.ui.rFill, c.ui.pFill]) {
      if (f) { f.style.width = pct + '%'; f.style.background = color; }
    }
    if (c.ui.cSec) c.ui.cSec.textContent = sec;
    if (c.ui.rSec) c.ui.rSec.textContent = sec;
    if (c.ui.pSec) c.ui.pSec.textContent = sec;
    if (c.ui.cBubble) c.ui.cBubble.classList.toggle('low', low);
    if (c.ui.rCard) c.ui.rCard.classList.toggle('low', low);
  }
}

/* 中间：排队顾客 + 头顶信息（订单号/耐心/头像/名字 + 出场气泡台词） */
function renderQueueLine() {
  const wrap = el('queue-line');
  if (!state.queue.length) {
    wrap.innerHTML = '<div class="q-empty">暂无顾客排队…</div>';
    return;
  }
  wrap.innerHTML = '';
  const frontId = state.queue[0].id;
  state.queue.forEach(c => {
    c.ui = {};  // 重建 DOM 引用
    const node = document.createElement('div');
    node.className = 'q-cust'
      + (c.id === frontId ? ' front' : '')
      + (c.id === state.selectedCustId ? ' sel' : '');
    node.dataset.cust = c.id;
    // 头像：角色立绘 / 神秘黑块 / emoji
    const avatarInner = c.avatarImg
      ? `<img class="q-avatar-img" src="${c.avatarImg}" alt="">`
      : (c.mystery ? '<span class="q-avatar-box"></span>' : `<span class="q-avatar-emoji">${c.avatarEmoji}</span>`);
    // 台词气泡：轮到调他的酒时（成为队首）才弹出，约5秒后消失；
    // 重渲染时用负 animation-delay 续播，避免气泡闪烁重播
    const QUOTE_LIFE = 5200;
    const quoteElapsed = c.quoteShownAt != null ? Date.now() - c.quoteShownAt : -1;
    const showQuote = c.quote && c.id === frontId && (c.quoteShownAt == null || quoteElapsed < QUOTE_LIFE);
    if (showQuote && c.quoteShownAt == null) c.quoteShownAt = Date.now();
    const quoteDelay = c.quoteShownAt != null ? Math.min(0, -(Date.now() - c.quoteShownAt)) : 0;
    node.innerHTML = `
      ${showQuote ? `<div class="q-quote" style="animation-delay:${quoteDelay}ms">${c.quote}</div>` : ''}
      <div class="q-name">${c.name}</div>
      <div class="pat-bubble">
        <div class="pat-bar"><div class="pat-fill"></div></div>
        <span class="pat-sec"></span>
      </div>
      <div class="q-avatar${c.avatarImg ? ' has-img' : ''}${c.mystery ? ' mystery' : ''}">${avatarInner}${c.id === frontId ? '<span class="q-front-badge">⭐</span>' : ''}</div>`;
    // 出场动画：斯沃德麦伦从下往上，其余弹入
    node.classList.add(c.entrance === 'up' ? 'enter-up' : 'enter-pop');
    c.ui.cFill = node.querySelector('.pat-fill');
    c.ui.cSec = node.querySelector('.pat-sec');
    c.ui.cBubble = node.querySelector('.pat-bubble');
    wrap.appendChild(node);
    updatePatienceUI(c);
  });
  // 队首（正在调酒的客人）居中显示，不靠向日志一侧：
  // 窄队列 → 整体右移使队首居中；宽队列 → 滚动到队首居中（可达范围内）
  const zone = el('bar-zone');
  const frontNode = wrap.querySelector('.q-cust.front');
  if (frontNode) {
    // 队首中心相对 queue-line（用 rect 差值，offsetLeft 的参照可能不是 queue-line）
    const wr = wrap.getBoundingClientRect();
    const fr = frontNode.getBoundingClientRect();
    /* 旋转 90° 时游戏内水平方向 = 屏幕垂直方向，用 top 差值换算，保证队首真正居中 */
    const rotS = window.__rotSign || 0;
    const P = rotS ? (fr.top - wr.top) * rotS + frontNode.offsetWidth / 2 : (fr.left - wr.left) + frontNode.offsetWidth / 2;
    const zoneW = zone.clientWidth;
    const shift = zoneW / 2 - P;
    if (shift >= 0) {
      // 平移队列使队首居中；右侧超出部分可横向滑动查看
      wrap.style.marginLeft = shift + 'px';
      wrap.style.marginRight = 'auto';
      zone.scrollLeft = 0;
    } else {
      wrap.style.marginLeft = '';
      wrap.style.marginRight = '';
      zone.scrollLeft = Math.max(0, Math.min(P - zoneW / 2, zone.scrollWidth - zoneW));
    }
  }
}

/* 右侧：订单面板（身份 / 台词 / 逐行需求 / 耐心 / 奖励，只有摇晃没有搅拌） */
function renderOrderPanel() {
  const p = el('order-panel');
  const c = state.queue.find(x => x.id === state.selectedCustId) || state.queue[0] || null;
  if (!c) {
    el('order-drink-name').innerHTML = '';
    p.innerHTML = '<div class="cp-empty">柜台前空无一人…</div>';
    return;
  }
  const headAvatar = c.avatarImg
    ? `<img class="cp-avatar-img" src="${c.avatarImg}" alt="">`
    : (c.mystery ? '<span class="cp-avatar-box"></span>' : `<span class="cp-avatar-emoji">${c.avatarEmoji}</span>`);  const quoteLine = c.arriveLine ? `<div class="cp-quote">『${c.arriveLine}』</div>` : '';
  // 「无可奉告」：神秘订单，随便给什么都行
  if (c.mystery || !c.recipe) {
    el('order-drink-name').innerHTML = '';
    p.innerHTML = `
      <div class="cp-head">
        <span class="cp-avatar${c.avatarImg ? ' has-img' : ''}">${headAvatar}</span>
        <div class="cp-main">
          <div class="cp-name">${c.name}${c.race ? `<span class="cp-race">${c.race}</span>` : ''}<span class="order-no">${orderNoText(c.orderNo)}</span></div>
          ${quoteLine}
        </div>
      </div>
      <div class="mystery-block">❓ 无可奉告<br><small>随便给点什么吧</small></div>
      <div class="cp-bottom">
        <div class="cp-pat"><div class="pat-bar"><div class="pat-fill"></div></div><span class="cp-sec"></span></div>
        <div class="cp-reward">💰 50</div>
      </div>`;
    c.ui = c.ui || {};
    c.ui.pFill = p.querySelector('.pat-fill');
    c.ui.pSec = p.querySelector('.cp-sec');
    updatePatienceUI(c);
    return;
  }
  const rec = c.recipe;
  // 需求按固定顺序排列：冰块 → 基底酒 → 利口酒 → 果汁 → 配料 → 摇酒 → 小料(入杯) → 水果(杯外)
  // 行首显示类别名，具体品名以小标签缀在右侧
  const CAT_LABEL = { spirit: '基底酒', liqueur: '利口酒', juice: '果汁', mixer: '配料' };
  const CAT_ORDER = { spirit: 1, liqueur: 2, juice: 3, mixer: 4 };
  const rows = [
    { o: 0, html: '<div class="order-row ice">🧊<span>冰块</span><span class="or-tag">必须</span></div>' },
    ...rec.ingredients.map(id => {
      const i = ingOf(id);
      const cat = CAT_LABEL[i.cat] || i.cat;
      // 品名在前，类别标签缀后（如 柠檬汁 [果汁]），方便去货架寻找
      return { o: CAT_ORDER[i.cat] || 9, html: `<div class="order-row"><i style="background:${i.color}"></i><span>${i.name}</span><span class="or-tag">${cat}</span></div>` };
    }),
    rec.needsShake ? { o: 6, html: '<div class="order-row shake">🌀<span>摇酒操作</span></div>' } : null,
    ...(rec.garnish || []).map(id => {
      const i = ingOf(id);
      return { o: 6.5, html: `<div class="order-row gar"><i style="background:${i.color}"></i><span>${i.name}</span><span class="or-tag">小料·入杯</span></div>` };
    }),
    rec.fruit ? { o: 7, html: `<div class="order-row"><i style="background:${fruitOf(rec.fruit).bg}"></i><span>${fruitOf(rec.fruit).name}</span><span class="or-tag">装饰·杯外</span></div>` } : null,
  ].filter(Boolean).sort((a, b) => a.o - b.o).map(x => x.html).join('');
  // 酒名放到订单标题栏，与原料配方区分开
  const odn = el('order-drink-name');
  odn.innerHTML = `<span class="odn-dot" style="background:${rec.color}"></span>${rec.name}`;
  p.innerHTML = `
    <div class="cp-head">
      <span class="cp-avatar${c.avatarImg ? ' has-img' : ''}">${headAvatar}</span>
      <div class="cp-main">
        <div class="cp-name">${c.name}${c.race ? `<span class="cp-race">${c.race}</span>` : ''}<span class="order-no">${orderNoText(c.orderNo)}</span></div>
        ${quoteLine}
      </div>
    </div>
    <div class="order-rows">${rows}</div>
    <div class="cp-bottom">
      <div class="cp-pat"><div class="pat-bar"><div class="pat-fill"></div></div><span class="cp-sec"></span></div>
      <div class="cp-reward">💰 ${rec.reward}</div>
    </div>`;
  c.ui = c.ui || {};
  c.ui.pFill = p.querySelector('.pat-fill');
  c.ui.pSec = p.querySelector('.cp-sec');
  updatePatienceUI(c);
}

/* 制作流程已由操作台三阶段画面承载（empty→shake→glass），按钮亮暗见 renderFlow */
function renderFlow() {
  const s = state.shaker;
  const hasItems = s.items.length > 0;
  const filled = state.glass.filled;
  const front = state.queue[0];
  const needShake = front && front.recipe ? front.recipe.needsShake : true;
  // 清空：摇壶进行中变暗，其余时候皆可点（空台时给 toast 提示）
  el('btn-dump').disabled = !!s.shaking;
  // 开始摇壶：选了料且尚未开摇
  el('btn-start-shake').disabled = !(hasItems && !s.shaking && !s.shaken && !filled);
  // 自动摇壶：壶里有料就能开关
  el('btn-auto-shake').disabled = !(hasItems && !filled);
  // 出酒：本单不用摇→选料即可；需要摇→开始摇之后可出（摇一半也行，评分会降级）
  el('btn-pour').disabled = !(hasItems && !filled && (!needShake || s.shaking || s.shaken));
  // 出餐铃：装杯后即可上酒（小料缺失只软提醒，不阻止）
  el('btn-bell').classList.toggle('ready-glow', filled && state.queue.length > 0);
  // 冰块按钮：已加冰或杯中已有酒时熄灭
  const ice = el('btn-ice');
  ice.classList.toggle('done', !!s.hasIce);
  ice.disabled = !!s.hasIce || filled;
}

/* 酒吧日志（最新在最上） */
function addLog(text, cls) {
  const list = el('log-list');
  const d = document.createElement('div');
  d.className = 'log-item ' + (cls || '');
  d.textContent = text;
  list.prepend(d);
  while (list.children.length > 60) list.removeChild(list.lastChild);
}

/* 底部 Toast */
function toast(msg) {
  const wrap = el('toast-wrap');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  wrap.appendChild(t);
  while (wrap.children.length > 3) wrap.removeChild(wrap.firstChild);
  setTimeout(() => t.classList.add('out'), 1600);
  setTimeout(() => t.remove(), 2000);
}

/* 星币入账飞行动画（按铃 → HUD 星币） */
function coinFly(amount) {
  const bell = el('btn-bell').getBoundingClientRect();
  const target = el('hud-coins-b').getBoundingClientRect();
  const fly = document.createElement('div');
  fly.className = 'coin-fly';
  fly.textContent = `+${amount} 🪙`;
  document.body.appendChild(fly);
  const r = fly.getBoundingClientRect();
  fly.style.left = (bell.left + bell.width / 2 - r.width / 2) + 'px';
  fly.style.top = (bell.top - 10) + 'px';
  fly.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${target.left - bell.left}px, ${target.top - bell.top}px) scale(.55)`, opacity: .9, offset: .75 },
    { transform: `translate(${target.left - bell.left}px, ${target.top - bell.top}px) scale(.4)`, opacity: 0 },
  ], { duration: 900, easing: 'cubic-bezier(.25,.6,.35,1)' }).onfinish = () => fly.remove();
}

function renderAll() {
  renderHUD();
  renderStation();
  renderGlass();
  renderQueueLine();
  renderOrderPanel();
  renderFlow();
}

/* ════════════ 四、交互区（点击 / 滑动） ════════════ */

/* 摇酒进度条归零（无过渡动画，立刻清空） */
function resetProgress() {
  state.shaker.shakeProgress = 0;
  const fill = el('shake-progress-fill');
  fill.style.transition = 'none';
  fill.style.width = '0%';
  fill.classList.remove('done');
  const pct = el('shake-percent');
  if (pct) pct.textContent = '0%';
}

/* 步骤1：加冰块 */
function addIce() {
  if (!state.gameStarted || state.paused || state.gameOver) return;
  if (state.glass.filled) return toast('杯子里有酒了，先上酒');
  if (state.shaker.hasIce) return toast('冰块已经加好了');
  state.shaker.hasIce = true;
  if (state.shaker.shaken) { state.shaker.shaken = false; state.shaker.shakeSession++; resetProgress(); }
  const m = el('shaker-mount');
  m.classList.remove('splash'); void m.offsetWidth; m.classList.add('splash');
  toast('🧊 冰块入壶');
  playSound('ice');
  renderStation(); renderFlow();
}

/* 步骤2：添加原料（基酒/利口酒/果汁/配料，无光束特效）
   2.0：小料不再进摇酒壶——倒酒后从「小料与水果」面板加入酒杯 */
function addIngredient(ing, btnEl) {
  if (!state.gameStarted || state.paused || state.gameOver) return;
  if (state.glass.filled) return toast('杯子里有酒了，先上酒');
  if (ing.cat === 'garnish') return toast('小料不进摇酒壶：倒好酒后再加入杯中');
  if (state.shaker.items.length >= CONFIG.SHAKER_CAPACITY) return toast('调酒壶已满，先倒酒吧！');
  state.shaker.items.push(ing.id);
  if (state.shaker.shaken) { state.shaker.shaken = false; state.shaker.shakeSession++; resetProgress(); }
  // 反馈：酒瓶倾斜 + 酒壶水花（已按要求去除添加酒品时的光束）
  if (btnEl) {
    btnEl.classList.remove('tip'); void btnEl.offsetWidth; btnEl.classList.add('tip');
  }
  const m = el('shaker-mount');
  m.classList.remove('splash'); void m.offsetWidth; m.classList.add('splash');
  toast(`+ ${ing.name}`);
  playSound('pour');
  renderStation(); renderFlow();
}

/* 步骤3：摇晃调酒壶（三种手动方式并行叠加进度）
   ①点击调酒壶 ②键盘空格；另有「自动摇酒」按钮匀速自动摇
   每次操作增加进度，进度涨满自动完成摇晃并倒酒装杯 */
function startShake() {
  if (!state.gameStarted || state.paused || state.gameOver) return false;
  if (state.shaker.shaken) return false;
  if (state.shaker.items.length === 0) { toast('请先添加调酒原料'); return false; }
  if (!state.shaker.shaking) {
    state.shaker.shaking = true;
    const mount = el('shaker-mount');
    mount.classList.add('shake');           // 调酒壶摇动动画（与进度条同步播放）
    mount.dataset.state = 'shaking';
    document.body.classList.add('shake-vibrate');
    setTimeout(() => document.body.classList.remove('shake-vibrate'), 500);
    playSound('shake');
    renderStation(); renderFlow();
  }
  return true;
}
function addShakeProgress(pct) {
  if (!startShake()) return;
  state.shaker.shakeProgress = Math.min(100, state.shaker.shakeProgress + pct);
  renderShakeProgress();
  if (state.shaker.shakeProgress >= 100) finishShake();
}
function renderShakeProgress() {
  const fill = el('shake-progress-fill');
  fill.style.width = state.shaker.shakeProgress + '%';
  fill.classList.toggle('done', state.shaker.shaken);
  const pct = el('shake-percent');
  if (pct) pct.textContent = Math.round(state.shaker.shakeProgress) + '%';
}
function finishShake() {
  state.shaker.shaking = false;
  state.shaker.shaken = true;
  state.shaker.autoShake = false;   // 摇满后自动摇壶停机复位
  const ab = el('btn-auto-shake');
  if (ab) { ab.classList.remove('on'); ab.textContent = '🤖 自动摇壶'; }
  const mount = el('shaker-mount');
  mount.classList.remove('shake');
  mount.dataset.state = 'shaken';
  el('shake-progress-fill').classList.add('done');
  toast('✅ 摇晃完成！点击「出酒」装杯');
  playSound('shakeDone');
  vibrate(30);
  renderStation(); renderFlow();
  // 2.0：不再自动装杯——摇完后由玩家点「出酒」切换到装盘画面
}

/* 手动摇酒：点击调酒壶 / 空格 / 物理晃动 → 叠加进度
   2.0：必须先点「开始摇壶」启动后，这些物理操作才生效（避免晃一下就自动开摇） */
let lastShakeClick = 0;
function manualShakeClick() {
  if (!state.shaker.shaking) return;   // 未启动：忽略物理摇晃/点壶/空格
  const now = performance.now();
  if (now - lastShakeClick < CONFIG.SHAKE_CLICK_COOLDOWN) return;
  lastShakeClick = now;
  addShakeProgress(CONFIG.SHAKE_CLICK_GAIN);
}
/* 开始摇壶按钮：启动摇晃（设 shaking=true、播放动画）并叠加一次进度 */
function startShakeBtn() {
  if (startShake()) {
    lastShakeClick = performance.now();
    addShakeProgress(CONFIG.SHAKE_CLICK_GAIN);
  }
}

/* 自动摇壶：按钮开关，匀速自动增长进度；运行中手动操作仍可叠加 */
function toggleAutoShake() {
  if (!state.gameStarted || state.paused || state.gameOver) return;
  if (!state.shaker.items.length || state.glass.filled) return;
  state.shaker.autoShake = !state.shaker.autoShake;
  el('btn-auto-shake').classList.toggle('on', state.shaker.autoShake);
  el('btn-auto-shake').textContent = state.shaker.autoShake ? '⏹ 停止摇壶' : '🤖 自动摇壶';
  if (state.shaker.autoShake) toast('🤖 自动摇壶开启');
  playSound('click');
}

/* 步骤4：点击杯子倒酒出壶 */
function pourGlass() {
  if (!state.gameStarted || state.paused || state.gameOver) return;
  if (state.glass.filled) return toast('杯子已满，先上酒');
  if (state.shaker.items.length === 0) return toast('酒壶是空的，请先添加原料');
  // 2.0：不强制摇满——摇到一半也能出酒（该摇没摇好评分自动降级），自由度优先
  // 内容快照进酒杯（新的一杯：杯内小料清空，待倒酒后添加）
  state.glass.items = [...state.shaker.items];
  state.glass.garnish = [];
  state.garnishWarned = false;
  state.glass.hasIce = state.shaker.hasIce;
  state.glass.shaken = state.shaker.shaken;
  state.glass.filled = true;
  // 清空调酒壶，进度条立刻归零
  state.shaker.items = [];
  state.shaker.hasIce = false;
  state.shaker.shaken = false;
  state.shaker.shaking = false;
  state.shaker.autoShake = false;
  state.shaker.shakeSession++;
  resetProgress();
  const autoBtn = el('btn-auto-shake');
  autoBtn.classList.remove('on');
  autoBtn.textContent = '🤖 自动摇壶';
  // 倒酒动画：挂载容器附加 pouring 类倾斜（已去除倒酒光线）
  const mount = el('shaker-mount');
  mount.classList.remove('shake');
  mount.classList.add('pouring');
  mount.dataset.state = 'pouring';
  setTimeout(() => { mount.classList.remove('pouring'); syncMountState(); }, 700);
  toast('🍸 已倒入酒杯');
  playSound('pour');
  renderGlass(); renderStation(); renderFlow();
}

/* 步骤5：加入小料（倒酒后放进酒杯内的小料，不参与摇酒；漏加/错加会降级） */
function addGarnish(ing, btnEl) {
  if (!state.gameStarted || state.paused || state.gameOver) return;
  if (!state.glass.filled) return toast('先摇酒倒入杯中，再加小料');
  if (state.glass.garnish.includes(ing.id)) return toast('这种小料已经加过了');
  state.glass.garnish.push(ing.id);
  state.garnishWarned = false;   // 玩家补了小料，软提醒资格复位
  if (btnEl) {
    btnEl.classList.remove('tip'); void btnEl.offsetWidth; btnEl.classList.add('tip');
  }
  toast(`+ ${ing.name}（入杯）`);
  playSound('pour');
  renderGlass(); renderFlow();
}

/* 步骤6：水果装饰（放在酒杯外侧；缺/错都会在评分时降级，但不阻止出餐） */
function addFruit(f) {
  if (!state.gameStarted || state.paused || state.gameOver) return;
  if (!state.glass.filled) return toast('请先倒酒再装饰水果');
  if (state.glass.fruit) return toast('水果装饰已添加');
  state.glass.fruit = f.id;
  state.garnishWarned = false;   // 玩家补了水果，软提醒资格复位
  toast(`+ ${f.name}`);
  playSound('click');
  renderGlass(); renderFlow();
}

/* 步骤7：点击出餐铃交付顾客，结算得分
   2.0：装饰漏加（小料/水果）不拦单——首次按铃软提醒「似乎还差点什么」，
   再次按铃直接出餐（evaluateDrink 会自动降级扣星币/声望），尊重玩家自由度 */
function ringBell() {
  if (!state.gameStarted || state.paused || state.gameOver) return;
  const b = el('btn-bell');
  if (!state.glass.filled) return toast('杯子里还没有酒，请先倒酒');
  if (!state.queue.length) return toast('没有顾客在等待');
  const cust = state.queue[0];
  // 装饰软提醒：缺必需小料或缺指定水果，都只提醒一遍，坚持出餐则放行
  const needGar = cust.recipe && (cust.recipe.garnish || []);
  const missingGar = needGar && needGar.some(g => !(state.glass.garnish || []).includes(g));
  const missingFruit = cust.recipe && cust.recipe.fruit && !state.glass.fruit;
  if ((missingGar || missingFruit) && !state.garnishWarned) {
    state.garnishWarned = true;
    toast('🤔 似乎还差点什么…（再次按铃可直接出餐）');
    playSound('click');
    return;
  }
  b.classList.remove('ring'); void b.offsetWidth; b.classList.add('ring');
  playSound('bell');
  settle(cust);
}

/* 点选排队顾客 → 右侧订单面板展示该顾客 */
function selectCustomer(id) {
  if (!state.gameStarted || state.paused) return;
  if (!state.queue.some(c => c.id === id)) return;
  state.selectedCustId = id;
  playSound('click');
  renderQueueLine(); renderOrderPanel();
}

/* ─── 中间吧台区：拖拽横向滑动（点击与滑动互不冲突） ───
   按下后位移 ≤8px 判定为点击（正常触发按钮逻辑）；
   位移 >8px 判定为滑动，滚动操作台并吞掉随后产生的 click，避免误触。 */
function initDragScroll() {
  const zone = el('bar-zone');
  let drag = null, suppressClick = false;
  zone.addEventListener('pointerdown', e => {
    suppressClick = false;
    if (e.button !== undefined && e.button !== 0) return;
    drag = { startX: e.clientX, startY: e.clientY, startScroll: zone.scrollLeft, moved: false, id: e.pointerId };
  });
  zone.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    /* 画面旋转 90° 时（竖屏容器）：游戏内横向滚动对应屏幕纵向位移（rotate 90° → +y；-90° → -y） */
    const rotated = window.__rotSign || 0;
    const dx = rotated ? (e.clientY - drag.startY) * rotated : (e.clientX - drag.startX);
    if (!drag.moved && Math.abs(dx) > 6) {   /* 触摸位移阈值 6px：小于=点击，大于=滑动 */
      drag.moved = true;
      zone.classList.add('dragging');
      try { zone.setPointerCapture(e.pointerId); } catch (err) {}
    }
    if (drag.moved) {
      zone.scrollLeft = drag.startScroll - dx;
      e.preventDefault();
    }
  });
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.moved) suppressClick = true;
    drag = null;
    zone.classList.remove('dragging');
  };
  zone.addEventListener('pointerup', endDrag);
  zone.addEventListener('pointercancel', endDrag);
  zone.addEventListener('contextmenu', e => e.preventDefault());
  // 滑动结束后吞掉随后的一次 click（下一轮 pointerdown 会复位该标记）
  document.addEventListener('click', e => {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); suppressClick = false; }
  }, true);
  // 电脑端鼠标滚轮 → 横向滚动
  zone.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) zone.scrollLeft += e.deltaY;
  }, { passive: true });
}


/* 必须在用户首次点击页面后调用（浏览器安全策略） */


/* 首次点击页面：初始化音频 + 音乐兜底启动（剧情中→剧情音乐出声，游戏中→酒吧音乐）
   iOS 13+ 摇一摇权限也在首次手势时申请（拒绝/无此API则静默忽略） */
function onFirstTap() {
  document.removeEventListener('pointerdown', onFirstTap);
  ensureAudio();
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().catch(() => {});
    }
  } catch (e) {}
  if (state.storyActive) startStoryBGM();   // 首次触碰：出声兜底（此前被静音拦截的话）
  else if (state.gameStarted) startBGM();
}

/* 物理摇晃输入：桌面端鼠标快速晃动 / 手机摇一摇 → 都等价于点击摇酒壶（manualShakeClick 自带冷却） */
function initMotionShake() {
  // 鼠标快速晃动：速度 > 1.4px/ms 视为摇晃
  let last = null;
  window.addEventListener('mousemove', e => {
    if (!state.gameStarted || state.paused || state.gameOver) return;
    if (!state.shaker.items.length || state.shaker.shaken) return;
    const now = performance.now();
    if (last) {
      const dt = now - last.t;
      if (dt > 0 && Math.hypot(e.clientX - last.x, e.clientY - last.y) / dt > 1.4) manualShakeClick();
    }
    last = { x: e.clientX, y: e.clientY, t: now };
  });
  // 手机摇一摇：加速度瞬时峰值阈值
  window.addEventListener('devicemotion', e => {
    if (!state.gameStarted || state.paused || state.gameOver) return;
    if (!state.shaker.items.length || state.shaker.shaken) return;
    const a = e.acceleration || e.accelerationIncludingGravity;
    if (!a) return;
    const mag = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
    if (mag > 32) manualShakeClick();
  });
}

/* ════════════ 五、顾客与结算逻辑 ════════════ */

/* 刷客间隔：初始缓慢，从第 5 天起逐渐加快 */
function spawnInterval() {
  const ramp = Math.max(0, state.day - 5) * CONFIG.SPAWN_RAMP;
  return Math.max(CONFIG.SPAWN_MIN, CONFIG.SPAWN_BASE - ramp);
}

/* 按天数加权挑选配方（越往后复杂配方占比越高） */
function pickRecipe() {
  const d = state.day;
  const weights = RECIPES.map(r => {
    if (r.diff === 1) return Math.max(0.8, 4 - d * 0.7);
    if (r.diff === 2) return 2.5;
    return Math.min(4.5, 0.6 + d * 0.9);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < RECIPES.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return RECIPES[i];
  }
  return RECIPES[RECIPES.length - 1];
}

/* 生成新顾客：单客60s正常；排队等待的人多时耐心适当加长（不仓促）
   角色抽取：星际旅客(主力)62% / 固定角色27% / 无可奉告11%
   保底：每第 4 位必是固定角色（烬行等特殊客人）；排队中不出现重复角色 */
function spawnCustomer() {
  const queuedNames = new Set(state.queue.map(c => c.name));
  const availNamed = CHARACTERS.slice(0, 8).filter(ch => !queuedNames.has(ch.name));
  let char = null;
  if (state.nextOrderNo === 1) {
    char = CHARACTERS.find(c => c.id === 'shrimp');   // 开局第一位顾客固定：虾兵蟹将的将
  }
  if (!char && state.nextOrderNo % 4 === 0 && availNamed.length) {
    char = pick(availNamed);   // 保底：每第 4 位顾客是固定角色
  }
  if (!char) {
    const roll = Math.random();
    if (roll < 0.62) {
      const q = pick(COMMON_QUOTES);
      char = { id: 'common', name: pick(COMMON_NAMES), img: null, quote: q || null, fixedOrder: null };
    } else if (roll < 0.89) {
      char = pick(availNamed.length ? availNamed : CHARACTERS.slice(0, 8));
    } else {
      char = CHARACTERS[8];   // 无可奉告
    }
  }
  const rec = char.mystery ? null
    : (char.fixedOrder ? RECIPES.find(r => r.id === char.fixedOrder) : pickRecipe());
  const waiting = Math.min(state.queue.length, Math.floor(CONFIG.PATIENCE_QUEUE_BONUS_CAP / CONFIG.PATIENCE_QUEUE_BONUS));
  const patience = Math.round(CONFIG.PATIENCE_BASE + waiting * CONFIG.PATIENCE_QUEUE_BONUS + Math.random() * 3);
  const cust = {
    id: state.nextCustId++,
    orderNo: state.nextOrderNo++,
    name: char.name,
    race: char.id === 'common' ? pick(COMMON_RACES) : '',   // 特殊客人不显示种族
    avatarImg: char.img || '',
    avatarEmoji: char.id === 'common' ? pick(RACES).avatar : '',
    mystery: !!char.mystery,
    entrance: char.entrance || '',
    quote: char.quote || null,
    spawnTime: Date.now(),
    recipe: rec,
    patience, maxPatience: patience,
    arriveLine: char.quote || '',
    tier: char.tier || 'middle',   /* 2.0 客人档次预留：poor/middle/rich（暂不影响奖励，后续接入） */
    ui: {},
  };
  state.queue.push(cust);
  if (state.selectedCustId == null) state.selectedCustId = cust.id;
  addLog(cust.mystery
    ? `🛎 神秘的「无可奉告」进店（${orderNoText(cust.orderNo)}）：不知道想要什么…`
    : `🛎 「${cust.name}」进店（${orderNoText(cust.orderNo)}）${rec ? '：想要一杯【' + rec.name + '】' : ''}`, 'arrive');
  toast(`👥 ${cust.name} 排队中`);
  playSound('click');
  renderAll();
}

/* 顾客流失（耐心耗尽 / 排队满员），扣分并检查 GameOver */
function loseCustomer(penaltyText) {
  state.lost++;
  state.coins = state.coins - CONFIG.LOST_PENALTY_COINS;   // 允许负债
  state.rep = Math.max(0, state.rep - CONFIG.LOST_PENALTY_REP);
  saveProgress();
  addLog(penaltyText, 'lost');
  playSound('angry');
  renderHUD();
  checkGameOver();
}

/* 顾客耐心耗尽，生气离开 */
function customerLeave(cust) {
  state.queue = state.queue.filter(c => c.id !== cust.id);
  if (state.selectedCustId === cust.id) state.selectedCustId = state.queue[0] ? state.queue[0].id : null;
  toast(`😠 ${cust.name} 生气离开了！`);
  loseCustomer(`😠 「${cust.name}」等不及走了：『${pick(DIALOGUE.timeout)}』 -${CONFIG.LOST_PENALTY_COINS}🪙`);
  renderAll();
}

/* 排队满员，新顾客扭头就走 */
function overflowLose() {
  toast('🚪 排队满员，新顾客离开了');
  loseCustomer(`🚪 新顾客见排队满员，扭头就走：『${pick(DIALOGUE.overflow)}』`);
}

/* ════════════ 2.0 收租系统 ════════════ */
/* 阿婆语气文案：随 stage 升级变凶 */
const GRANDMA_LINES = {
  satisfied: [
    '哟，这周的租金到账了，小伙子干得不错嘛~',
    '嗯，钱够数了，老婆子我就不唠叨了。',
  ],
  warn: [
    '小子，这周租金该交了，别让我等太久。',
    '租金呢？我可是看着你开张的。',
  ],
  angry: [
    '你这是要赖账？老婆子的钱也敢欠？！',
    '三天之内再不交租，别怪我把你的调酒壶拿去抵债！',
  ],
  furious: [
    '好啊好啊，你是铁了心不交是吧？！',
    '我告诉你，这条街上还没人敢欠我房租超过一个月的！',
  ],
};

/* 收租：优先用已缴租金+预付抵扣，不足部分扣现金，再不足则负债 */
function collectRent() {
  const rent = CONFIG.RENT_AMOUNT;
  // 先用本周已缴 + 预付抵扣
  const covered = state.rentPaid + state.rentPrepaid;
  if (covered >= rent) {
    // 已缴足：阿婆满意，多余部分留作下周预付
    state.rentPrepaid = covered - rent;
    state.rentPaid = 0;
    state.grandmaStage = 0;
    addLog(`👵 收租阿婆到访：租金已缴清（含预付 ${state.rentPrepaid}🪙），余额 ${state.coins}🪙`, 'rent');
    showGrandma('satisfied', rent);
  } else {
    const shortfall = rent - covered;
    state.rentPaid = 0;
    state.rentPrepaid = 0;
    if (state.coins >= shortfall) {
      state.coins -= shortfall;
      state.grandmaStage = 0;
      addLog(`👵 收租阿婆到访：已缴 ${covered}🪙，补扣 ${shortfall}🪙，余额 ${state.coins}🪙`, 'rent');
      showGrandma('satisfied', rent);
    } else {
      const debt = shortfall - state.coins;
      state.coins -= shortfall;   // 变负
      state.grandmaStage = Math.min(3, state.grandmaStage + 1);
      addLog(`👵 收租阿婆到访：欠租 ${debt}🪙！余额 ${state.coins}🪙`, 'rent-bad');
      const stage = state.grandmaStage >= 2 ? 'furious' : 'angry';
      showGrandma(stage, rent);
    }
  }
  saveProgress();
  renderHUD();
}

/* ── 小水手每周工资结算 ── */
function showSailorPay() {
  const wage = state.sailorServedWeek * CONFIG.SAILOR_WAGE_PER_CUST;
  el('sailor-served-count').textContent = state.sailorServedWeek;
  el('sailor-wage-amount').textContent = wage;
  el('sailor-mood-text').textContent = state.sailorMood;
  el('sailor-pay-overlay').classList.remove('hidden');
  state.paused = true;
}

function closeSailorPay() {
  el('sailor-pay-overlay').classList.add('hidden');
  state.paused = false;
  // 新的一周，重置本周服务数
  state.sailorServedWeek = 0;
  saveProgress();
}

function confirmSailorPay() {
  const wage = state.sailorServedWeek * CONFIG.SAILOR_WAGE_PER_CUST;
  state.coins -= wage;
  state.sailorMood = Math.min(CONFIG.SAILOR_MOOD_MAX, state.sailorMood + 20);
  addLog(`⚓ 支付小水手工资 ${wage}🪙，心情提升至 ${state.sailorMood}`, 'settle-good');
  toast(`⚓ 已支付小水手 ${wage}🪙，心情 +20`);
  closeSailorPay();
  renderHUD();
}

function refuseSailorPay() {
  const wage = state.sailorServedWeek * CONFIG.SAILOR_WAGE_PER_CUST;
  state.sailorMood = Math.max(0, state.sailorMood - 30);
  const willStrike = state.sailorMood < CONFIG.SAILOR_MOOD_MIN;
  addLog(`⚓ 拒绝支付小水手工资 ${wage}🪙，心情降至 ${state.sailorMood}${willStrike ? '，小水手罢工了！' : ''}`, 'rent-bad');
  toast(`⚓ 小水手心情 -30${willStrike ? '，拒绝代班！' : ''}`);
  closeSailorPay();
  renderHUD();
}

/* 打开缴租面板 */
function openRent() {
  const ov = el('rent-overlay');
  ov.classList.remove('hidden');
  renderRentPanel();
}
function closeRent() { el('rent-overlay').classList.add('hidden'); }

/* 渲染缴租面板信息 + 按钮可用性 */
function renderRentPanel() {
  const card = el('rent-overlay').querySelector('.rent-card');
  card.querySelector('.rent-total').textContent = CONFIG.RENT_AMOUNT;
  card.querySelector('.rent-paid').textContent = state.rentPaid + state.rentPrepaid;
  const remain = Math.max(0, CONFIG.RENT_AMOUNT - state.rentPaid - state.rentPrepaid);
  card.querySelector('.rent-remain').textContent = remain;
  card.querySelector('.rent-prepaid').textContent = state.rentPrepaid;
  // 缴费按钮：现金不足的置灰
  card.querySelectorAll('.rent-amt-btn').forEach(btn => {
    const amt = parseInt(btn.dataset.amt);
    btn.disabled = state.coins < amt;
  });
}

/* 缴费：amount 只能是 580/780/980/1280 */
function payRent(amount) {
  if (state.coins < amount) { toast('星币不足，无法缴纳'); return; }
  state.coins -= amount;
  const totalPaid = state.rentPaid + state.rentPrepaid + amount;
  if (totalPaid > CONFIG.RENT_AMOUNT) {
    // 超出部分计入下周预付
    state.rentPaid = CONFIG.RENT_AMOUNT;
    state.rentPrepaid = totalPaid - CONFIG.RENT_AMOUNT;
  } else {
    state.rentPaid = totalPaid;
  }
  addLog(`🏠 缴纳租金 ${amount}🪙（本周已缴 ${state.rentPaid}🪙${state.rentPrepaid ? '，预付下周 ' + state.rentPrepaid + '🪙' : ''}）`, 'rent');
  playSound('coin');
  saveProgress();
  renderHUD();
  renderRentPanel();
}

/* 阿婆全息投影弹窗（立绘位置预留，后续替换图片） */
function showGrandma(mood, rent) {
  const ov = el('grandma-overlay');
  const lines = GRANDMA_LINES[mood];
  const line = pick(lines);
  el('grandma-text').textContent = line;
  el('grandma-rent').textContent = `本周租金：${rent} 🪙`;
  el('grandma-coins').textContent = `当前余额：${state.coins} 🪙`;
  const moodLabel = { satisfied: '😊 满意', warn: '😐 催促', angry: '😠 愤怒', furious: '🤬 暴怒' }[mood];
  el('grandma-mood').textContent = moodLabel;
  ov.classList.remove('hidden');
  state.paused = true;
}

function closeGrandma() {
  el('grandma-overlay').classList.add('hidden');
  state.paused = false;
  // 收租后若有待结算的小水手工资，接着弹出
  if (state.sailorPayPending) {
    state.sailorPayPending = false;
    showSailorPay();
  }
}

/* ════════════ 2.0 盗贼事件（QTE + 对话博弈） ════════════ */
function maybeRobbery() {
  if (state.gameOver || state.robbery.active) return;
  const rate = CONFIG.ROBBERY_BASE_RATE * (state.coins > CONFIG.ROBBERY_THRESHOLD ? 2 : 1);
  if (Math.random() > rate) return;
  state.robbery.active = true;
  state.robbery.session++;
  // 50% QTE，50% 对话博弈
  if (Math.random() < 0.5) startRobberyQTE();
  else startRobberyDialog();
}

/* ── QTE 模式：猛击吧台 ── */
function startRobberyQTE() {
  const r = state.robbery;
  r.type = 'qte';
  r.clicks = 0;
  r.target = CONFIG.ROBBERY_QTE_CLICKS;
  el('robbery-qte-progress').style.width = '0%';
  el('robbery-qte-count').textContent = `0 / ${r.target}`;
  el('robbery-qte-timer').textContent = CONFIG.ROBBERY_QTE_TIME + 's';
  el('robbery-dialog').classList.add('hidden');
  el('robbery-qte').classList.remove('hidden');
  el('robbery-overlay').classList.remove('hidden');
  state.paused = true;
  let left = CONFIG.ROBBERY_QTE_TIME;
  r.timer = setInterval(() => {
    left -= 0.1;
    el('robbery-qte-timer').textContent = left.toFixed(1) + 's';
    if (left <= 0) { endRobberyQTE(false); }
  }, 100);
}

function robberySmash() {
  const r = state.robbery;
  if (r.type !== 'qte' || !r.active) return;
  r.clicks++;
  const pct = Math.min(100, r.clicks / r.target * 100);
  el('robbery-qte-progress').style.width = pct + '%';
  el('robbery-qte-count').textContent = `${r.clicks} / ${r.target}`;
  playSound('click');
  if (r.clicks >= r.target) endRobberyQTE(true);
}

function endRobberyQTE(success) {
  const r = state.robbery;
  clearInterval(r.timer);
  r.timer = null;
  if (success) {
    const tip = 50;
    state.coins += tip;
    addLog(`🥷 盗贼闯入！猛击吧台成功击退，掉落小费 +${tip}🪙`, 'robbery-good');
    toast(`🥷 击退盗贼！+${tip} 星币`);
    playSound('coin');
  } else {
    const lossPct = CONFIG.ROBBERY_LOSS_MIN + Math.random() * (CONFIG.ROBBERY_LOSS_MAX - CONFIG.ROBBERY_LOSS_MIN);
    const loss = Math.max(0, Math.round(state.coins * lossPct));
    state.coins -= loss;
    state.rep = Math.max(0, state.rep - 5);
    addLog(`🥷 盗贼闯入！猛击失败，被抢走 ${loss}🪙，声望 -5`, 'robbery-bad');
    toast(`🥷 被抢 ${loss} 星币！`);
    playSound('angry');
  }
  closeRobbery();
}

/* ── 对话博弈模式 ── */
function startRobberyDialog() {
  const r = state.robbery;
  r.type = 'dialog';
  el('robbery-qte').classList.add('hidden');
  el('robbery-dialog').classList.remove('hidden');
  el('robbery-dialog-text').textContent = '「嘿嘿，把值钱的东西交出来！要钱还是要酒？」';
  el('robbery-overlay').classList.remove('hidden');
  state.paused = true;
}

/* 对话选项：给钱 / 灌酒 / 报警 */
function robberyChoice(choice) {
  if (state.robbery.type !== 'dialog') return;
  if (choice === 'pay') {
    const loss = Math.max(0, Math.round(state.coins * 0.3));
    state.coins -= loss;
    addLog(`🥷 盗贼闯入！花钱消灾，损失 ${loss}🪙`, 'robbery-bad');
    toast(`🥷 破财免灾 -${loss}🪙`);
    playSound('angry');
  } else if (choice === 'drink') {
    // 灌醉盗贼：消耗 2 份基底酒（若有则成功，反获稀有原料提示）
    const spirits = (state.shaker.items || []).length; // 简化：直接给奖励文案
    if (state.coins > 0 || spirits >= 0) {
      addLog(`🥷 盗贼闯入！一杯特制烈酒灌翻了他，临走还掉下一包稀有原料！`, 'robbery-good');
      toast('🥷 灌醉盗贼！获得稀有原料');
      playSound('coin');
      state.rep += 3;
    }
  } else if (choice === 'alarm') {
    if (Math.random() < 0.5) {
      addLog(`🥷 盗贼闯入！报警成功，盗贼仓皇逃窜！`, 'robbery-good');
      toast('🥷 报警成功！');
      playSound('coin');
    } else {
      const loss = Math.max(0, Math.round(state.coins * 0.5));
      state.coins -= loss;
      state.rep = Math.max(0, state.rep - 8);
      addLog(`🥷 盗贼闯入！报警激怒了他，被抢走 ${loss}🪙，声望 -8`, 'robbery-bad');
      toast(`🥷 被抢 ${loss} 星币！`);
      playSound('angry');
    }
  }
  closeRobbery();
}

function closeRobbery() {
  state.robbery.active = false;
  state.robbery.type = null;
  if (state.robbery.timer) { clearInterval(state.robbery.timer); state.robbery.timer = null; }
  el('robbery-overlay').classList.add('hidden');
  state.paused = false;
  saveProgress();
  renderHUD();
}

/* ════════════ 2.0 员工手册 ════════════ */
function renderHandbook() {
  // 猎手档案
  el('hb-roster').innerHTML = EMPLOYEES.map(e => {
    const st = EMP_STATUS[e.status] || EMP_STATUS.rest;
    return `<div class="emp-card">
      <div class="emp-avatar" style="background:${e.color}22;border-color:${e.color}66">${e.emoji}</div>
      <div class="emp-info">
        <div class="emp-name">${e.name}<span class="emp-status" style="color:${st.color}">● ${st.label}</span></div>
        <div class="emp-role">${e.role}</div>
        <div class="emp-desc">${e.desc}</div>
      </div>
    </div>`;
  }).join('');
  // 入职须知
  el('hb-rules').innerHTML = `<div class="rules-doc">
    <div class="rules-title">新员工入职须知（绝密）</div>
    <div class="rules-seal">🔒 仅限内部传阅</div>
    ${RULES.map(r => `<div class="rule-item"><span class="rule-n">${r.n}</span><span class="rule-text">${r.text}</span></div>`).join('')}
    <div class="rules-footer">—— 银河系中心酒吧人事部 ——</div>
  </div>`;
}
function openHandbook() {
  renderHandbook();
  el('handbook-overlay').classList.remove('hidden');
  state.paused = true;
}
function closeHandbook() {
  el('handbook-overlay').classList.add('hidden');
  state.paused = false;
}

/* ════════════ 2.0 双页面切换：工作区 ⇄ 员工休息室 ════════════ */
const FEATURE_LINES = {
  teach: '🎓 调酒师执照还在星际快递中，预计 2.1 版本送达~',
  sing: '🎤 麦克风被太空章鱼吞掉了，正在寻找替代方案…',
  serve: '🍽️ 传送餐盘能源不足，请稍后再试（预计 2.1 修复）',
  explore: '🗺️ 飞船燃料不足，无法前往星云深处寻宝…',
};
function goLounge() {
  el('app').classList.add('hidden');
  el('lounge').classList.remove('hidden');
  // 切换"更多"菜单中的页面切换项为"工作吧台"
  const sw = el('more-switch');
  sw.querySelector('.more-ico').textContent = '🍸';
  sw.querySelector('span:last-child').textContent = '工作吧台';
  // 进入休息区：小水手接班，游戏循环继续（不暂停）
  state.inLounge = true;
  state.sailorServed = 0;
  state.sailorEarned = 0;
  closeMorePanel();
}
function goWork() {
  el('lounge').classList.add('hidden');
  el('app').classList.remove('hidden');
  // 切换"更多"菜单中的页面切换项为"员工休息区"
  const sw = el('more-switch');
  sw.querySelector('.more-ico').textContent = '🎮';
  sw.querySelector('span:last-child').textContent = '员工休息区';
  state.inLounge = false;
  closeMorePanel();
}
/* 顶栏"更多"下拉菜单 */
function openMorePanel() { el('more-panel').classList.remove('hidden'); }
function closeMorePanel() { el('more-panel').classList.add('hidden'); }
function toggleMorePanel() { el('more-panel').classList.toggle('hidden'); }

/* 配方判定：多放/少放/放错/未摇晃/没加冰/小料漏加错加/水果给错 都会降级
   2.0：小料（garnish）与摇酒原料分开比对——倒入杯中的小料参与配方完整性评分 */
function evaluateDrink(cust, drink) {
  if (!cust.recipe) return 'perfect';   // 神秘订单：随便给什么都算完美
  const rec = cust.recipe;
  const recIng = rec.ingredients;
  const recGar = rec.garnish || [];
  const want = countMap(recIng);
  const got = countMap(drink.items);
  let matched = 0;
  for (const k in want) matched += Math.min(want[k], got[k] || 0);
  const wantG = countMap(recGar);
  const gotG = countMap(drink.garnish || []);
  let matchedG = 0;
  for (const k in wantG) matchedG += Math.min(wantG[k], gotG[k] || 0);
  const total = recIng.length + recGar.length;
  const ratio = total ? (matched + matchedG) / total : 1;
  let grade = ratio >= 0.999 ? 'perfect' : ratio >= 0.7 ? 'good' : 'bad';
  const down = g => ({ perfect: 'good', good: 'bad', bad: 'bad' }[g]);
  if (rec.needsShake && !drink.shaken) grade = down(grade);   // 该摇没摇
  if (!drink.hasIce) grade = down(grade);                     // 没加冰
  if ((drink.items.length - matched) + (drink.garnish.length - matchedG) > 0) grade = down(grade);   // 多放原料/小料
  if (rec.fruit && drink.fruit !== rec.fruit) grade = down(grade); // 水果给错（乱给水果）
  return grade;
}

/* 交付结算：评分 → 星币/声望 → 日志评价 → 清空操作台 */
function settle(cust) {
  const rec = cust.recipe;
  const grade = evaluateDrink(cust, state.glass);
  const g = CONFIG.GRADES[grade];
  const reward = rec ? rec.reward : 120;   // 神秘订单固定奖励
  const coins = Math.round(reward * g.mult);
  state.coins = state.coins + coins;
  state.rep = Math.max(0, state.rep + g.rep);
  // 负债惩罚：每完成一单额外扣声望（不影响调酒成功率、不减少客人）
  if (state.coins < 0) {
    state.rep = Math.max(0, state.rep - CONFIG.DEBT_REP_PENALTY);
  }
  saveProgress();
  state.served++;
  if (grade === 'perfect') state.perfectCount++;
  else if (grade === 'good') state.goodCount++;
  state.queue = state.queue.filter(c => c.id !== cust.id);
  const isGood = grade === 'perfect' || grade === 'good';
  const gotWhat = rec ? `收到${rec.name}` : '收下了一杯神秘特调';
  const dialogue = pick(DIALOGUE[grade]).replace('{name}', cust.name);
  addLog(`${isGood ? '🌟' : '🍸'} 「${cust.name}」${gotWhat}：${g.label}！${coins >= 0 ? '+' : ''}${coins}🪙 『${dialogue}』`,
    isGood ? 'settle-good' : 'settle-bad');
  coinFly(coins);
  toast(`🍸 ${g.label}！ +${coins} 星币`);
  playSound(isGood ? 'coin' : 'coin');
  vibrate(isGood ? 30 : 15);
  if (state.selectedCustId === cust.id) state.selectedCustId = state.queue[0] ? state.queue[0].id : null;
  resetStation();
  renderAll();
  // 2.0 盗贼事件：结算后概率触发
  maybeRobbery();
}

/* 小水手自动出餐：客人耐心剩 3 秒时触发，固定 good 评分（中规中矩） */
function sailorSettle(cust) {
  cust.served = true;
  const rec = cust.recipe;
  const g = CONFIG.GRADES.good;
  const reward = rec ? rec.reward : 120;
  const coins = Math.round(reward * g.mult);
  state.coins += coins;
  state.rep = Math.max(0, state.rep + g.rep);
  if (state.coins < 0) state.rep = Math.max(0, state.rep - CONFIG.DEBT_REP_PENALTY);
  state.served++;
  state.goodCount++;
  state.sailorServed++;
  state.sailorServedWeek++;
  state.sailorEarned += coins;
  state.queue = state.queue.filter(c => c.id !== cust.id);
  if (state.selectedCustId === cust.id) state.selectedCustId = state.queue[0] ? state.queue[0].id : null;
  addLog(`⚓ 小水手帮你出了一杯「${rec ? rec.name : '神秘特调'}」，${cust.name}还算满意，+${coins}🪙`, 'settle-good');
  saveProgress();
  renderHUD();
  renderQueueLine(); renderOrderPanel();
}

/* ═══════════ 2.0 驻唱 · 节奏音游（下落音符点击判定） ═══════════ */
let singAudioCtx = null;
const SING_STATE = {
  running: false,
  score: 0,
  combo: 0,
  maxCombo: 0,
  timeLeft: 30,
  notes: [],          // [{lane, el, y}]
  spawnTimer: null,
  fallTimer: null,
  countdownTimer: null,
  judgeY: 0,         // 判定线相对轨道顶部的像素位置
  laneHeight: 0,
};
const SING_DURATION = 30;     // 每局 30 秒
const SING_SPAWN_INTERVAL = 550; // 音符生成间隔 ms
const SING_FALL_SPEED = 3;   // 每帧下落像素
// 7 轨道对应音阶 1 2 3 4 5 6 7（C D E F G A B）
const LANE_FREQS = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88];

function getSingCtx() {
  if (!singAudioCtx) singAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (singAudioCtx.state === 'suspended') singAudioCtx.resume();
  return singAudioCtx;
}

/* 简单音效：命中提示 */
function singBeep(freq, dur) {
  try {
    const ctx = getSingCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch (e) {}
}

/* 钢琴音效合成：多谐波叠加 */
function playPiano(freq) {
  try {
    const ctx = getSingCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    gain.connect(ctx.destination);
    [1, 2, 3, 4].forEach(mult => {
      const osc = ctx.createOscillator();
      osc.type = mult === 1 ? 'triangle' : 'sine';
      osc.frequency.value = freq * mult;
      const g = ctx.createGain();
      g.gain.value = 1 / (mult * 1.5);
      osc.connect(g).connect(gain);
      osc.start(now); osc.stop(now + 1.1);
    });
  } catch (e) {}
}

/* 打开驻唱舞台 */
function openSing() {
  getSingCtx();
  el('lounge').classList.add('hidden');
  el('sing-room').classList.remove('hidden');
  resetSingUI();
}
function closeSing() {
  stopSingGame();
  el('sing-room').classList.add('hidden');
  el('lounge').classList.remove('hidden');
}

function resetSingUI() {
  el('sing-score').textContent = '0';
  el('sing-combo').textContent = '0';
  el('sing-time').textContent = SING_DURATION;
  el('sing-judge-text').textContent = '';
  el('sing-judge-text').className = 'sing-judge-text';
  el('sing-start-btn').textContent = '▶ 开始演奏';
  el('sing-start-btn').disabled = false;
  document.querySelectorAll('.note').forEach(n => n.remove());
  SING_STATE.notes = [];
}

/* 开始演奏 */
function startSingGame() {
  resetSingUI();
  SING_STATE.running = true;
  SING_STATE.score = 0;
  SING_STATE.combo = 0;
  SING_STATE.maxCombo = 0;
  SING_STATE.timeLeft = SING_DURATION;
  const lane = el('sing-lanes').querySelector('.sing-lane');
  SING_STATE.laneHeight = lane.clientHeight;
  SING_STATE.judgeY = SING_STATE.laneHeight - 36 - 20;

  el('sing-start-btn').textContent = '演奏中…';
  el('sing-start-btn').disabled = true;

  // 节拍：定时生成音符
  SING_STATE.spawnTimer = setInterval(spawnNote, SING_SPAWN_INTERVAL);
  // 下落动画
  SING_STATE.fallTimer = setInterval(fallNotes, 16);
  // 倒计时
  SING_STATE.countdownTimer = setInterval(() => {
    SING_STATE.timeLeft--;
    el('sing-time').textContent = SING_STATE.timeLeft;
    if (SING_STATE.timeLeft <= 0) endSingGame();
  }, 1000);
}

function stopSingGame() {
  SING_STATE.running = false;
  clearInterval(SING_STATE.spawnTimer);
  clearInterval(SING_STATE.fallTimer);
  clearInterval(SING_STATE.countdownTimer);
}

/* 生成一个星星音符 */
function spawnNote() {
  if (!SING_STATE.running) return;
  const laneIdx = Math.floor(Math.random() * 7);
  const lane = el('sing-lanes').children[laneIdx];
  const color = lane.dataset.color;
  const note = document.createElement('div');
  note.className = 'note';
  note.dataset.color = color;
  note.innerHTML = '<svg viewBox="0 0 100 100"><polygon points="50,3 63,38 98,38 70,60 81,96 50,75 19,96 30,60 2,38 37,38"/></svg>';
  note.style.top = '-40px';
  lane.appendChild(note);
  SING_STATE.notes.push({ lane: laneIdx, el: note, y: -30, hit: false });
}

/* 音符下落 */
function fallNotes() {
  if (!SING_STATE.running) return;
  for (let i = SING_STATE.notes.length - 1; i >= 0; i--) {
    const n = SING_STATE.notes[i];
    n.y += SING_FALL_SPEED;
    n.el.style.top = n.y + 'px';
    // 掉出底部 = Miss
    if (n.y > SING_STATE.laneHeight && !n.hit) {
      n.el.remove();
      SING_STATE.notes.splice(i, 1);
      judgeMiss();
    }
  }
}

/* 点击轨道判定 */
function hitLane(laneIdx) {
  // 无论游戏是否进行，点击轨道都弹奏对应音阶
  playPiano(LANE_FREQS[laneIdx]);
  if (!SING_STATE.running) return;
  // 找该轨道上最接近判定线且未命中的音符
  let best = null, bestDist = Infinity;
  for (const n of SING_STATE.notes) {
    if (n.lane !== laneIdx || n.hit) continue;
    const dist = Math.abs(n.y - SING_STATE.judgeY);
    if (dist < bestDist) { bestDist = dist; best = n; }
  }
  // 命中闪光
  const lane = el('sing-lanes').children[laneIdx];
  const hit = lane.querySelector('.lane-hit');
  hit.classList.remove('flash'); void hit.offsetWidth; hit.classList.add('flash');

  if (!best || bestDist > 60) {
    // 空击或太远 = Miss
    judgeMiss();
    return;
  }
  best.hit = true;
  best.el.remove();
  SING_STATE.notes = SING_STATE.notes.filter(n => n !== best);

  if (bestDist <= 25) {
    judgeHit('perfect');
  } else {
    judgeHit('good');
  }
}

function judgeHit(type) {
  const base = type === 'perfect' ? 100 : 50;
  SING_STATE.combo++;
  SING_STATE.maxCombo = Math.max(SING_STATE.maxCombo, SING_STATE.combo);
  const mult = 1 + Math.floor(SING_STATE.combo / 10) * 0.5;
  const gained = Math.round(base * mult);
  SING_STATE.score += gained;
  el('sing-score').textContent = SING_STATE.score;
  el('sing-combo').textContent = SING_STATE.combo;
  showJudge(type, `+${gained}`);
  singBeep(type === 'perfect' ? 880 : 660, 0.08);
}

function judgeMiss() {
  SING_STATE.combo = 0;
  el('sing-combo').textContent = '0';
  showJudge('miss', 'Miss');
}

function showJudge(type, text) {
  const el2 = el('sing-judge-text');
  el2.textContent = text;
  el2.className = 'sing-judge-text ' + type;
}

/* 结束结算 */
function endSingGame() {
  stopSingGame();
  // 小费：得分 / 15 星币
  const tip = Math.floor(SING_STATE.score / 15);
  state.coins += tip;
  const rank = SING_STATE.score >= 2000 ? 'S' : SING_STATE.score >= 1200 ? 'A' : SING_STATE.score >= 600 ? 'B' : 'C';
  el('sing-judge-text').textContent = `${rank} 级！+${tip} 🪙 小费`;
  el('sing-judge-text').className = 'sing-judge-text perfect';
  el('sing-start-btn').textContent = '▶ 再来一次';
  el('sing-start-btn').disabled = false;
  toast(`🎤 驻唱结束：${rank} 级，获得 ${tip} 🪙 小费`);
  if (tip > 0) addLog(`🎤 驻唱 ${rank} 级，客人打赏 ${tip}🪙`, 'settle-good');
  saveProgress();
  renderHUD();
}

/* ═══════════ 2.0 送盘 · 营业大厅（小侦探送对酒） ═══════════ */
const WAITER_DURATION = 30;          // 每轮 30 秒
const WAITER_TABLE_NAMES = ['靠窗桌', '角落桌', '中央桌', '吧台座', '舞台前桌', '卡座'];
const WAITER_FACES = ['👽', '🤖', '🦑', '🐙', '👾', '🧛', '🧜', '🦊', '🐱', '🦝'];
const WAITER_ACCS = [
  { ico: '🕶️', name: '墨镜' }, { ico: '🎩', name: '礼帽' },
  { ico: '🎀', name: '蝴蝶结' }, { ico: '👑', name: '皇冠' },
  { ico: '🎧', name: '耳机' }, { ico: '📿', name: '项链' },
];
const WAITER_STATE = {
  running: false, timer: null, timeLeft: WAITER_DURATION,
  score: 0, combo: 0, maxCombo: 0, done: 0, wrong: 0,
  tables: [], order: null,
};

function openWaiter() {
  el('lounge').classList.add('hidden');
  el('waiter-room').classList.remove('hidden');
  resetWaiterUI();
  buildFloor();
}
function closeWaiter() {
  stopWaiter();
  el('waiter-room').classList.add('hidden');
  el('lounge').classList.remove('hidden');
}

function resetWaiterUI() {
  el('waiter-score').textContent = '0';
  el('waiter-combo').textContent = '0';
  el('waiter-done').textContent = '0';
  el('waiter-time').textContent = WAITER_DURATION;
  el('waiter-judge').textContent = '';
  el('waiter-judge').className = 'waiter-judge';
  el('wo-drink').textContent = '🍸 等待接单';
  el('wo-clues').textContent = '点击下方「开始送盘」迎接高峰时段';
  el('wo-ask').style.display = 'none';
  el('waiter-start-btn').textContent = '▶ 开始送盘';
  el('waiter-start-btn').disabled = false;
  WAITER_STATE.score = 0; WAITER_STATE.combo = 0; WAITER_STATE.maxCombo = 0;
  WAITER_STATE.done = 0; WAITER_STATE.wrong = 0; WAITER_STATE.order = null;
}

/* 生成大厅：6 桌，每桌 1~2 位客人 */
function buildFloor() {
  const floor = el('waiter-floor');
  floor.innerHTML = '';
  WAITER_STATE.tables = [];
  WAITER_TABLE_NAMES.forEach((tname) => {
    const count = Math.random() < 0.55 ? 2 : 1;
    const guests = [];
    const usedAcc = new Set();
    for (let i = 0; i < count; i++) {
      // 同桌配饰不能重复（含"无配饰"也最多一个）
      let acc = null;
      if (Math.random() < 0.75) {
        const pool = WAITER_ACCS.filter(a => !usedAcc.has(a.name));
        if (pool.length) { acc = pool[Math.floor(Math.random() * pool.length)]; usedAcc.add(acc.name); }
      } else {
        usedAcc.add('无');
      }
      guests.push({
        face: WAITER_FACES[Math.floor(Math.random() * WAITER_FACES.length)],
        acc, served: false, el: null,
      });
    }
    const table = { name: tname, guests };
    WAITER_STATE.tables.push(table);

    const tableEl = document.createElement('div');
    tableEl.className = 'wt-table';
    tableEl.innerHTML = `<div class="wt-name">${tname}</div>`;
    const guestsEl = document.createElement('div');
    guestsEl.className = 'wt-guests';
    guests.forEach((g, gi) => {
      const gEl = document.createElement('div');
      gEl.className = 'wt-guest';
      gEl.innerHTML = `${g.face}${g.acc ? `<span class="wt-acc">${g.acc.ico}</span>` : ''}`;
      gEl.addEventListener('click', () => pickGuest(table, g));
      g.el = gEl;
      guestsEl.appendChild(gEl);
    });
    tableEl.appendChild(guestsEl);
    floor.appendChild(tableEl);
  });
}

/* ── 三档情报制：L1 模糊(150分) → L2 范围/推理(100分) → L3 直说(60分) ── */
const WAITER_TIER_CAP = { 1: 150, 2: 100, 3: 60 };
const WAITER_FACE_DESC = {
  '👽': '绿皮外星人', '🤖': '金属脸机器人', '🦑': '乌贼头客人', '🐙': '章鱼触手怪',
  '👾': '像素电子幽灵', '🧛': '斗篷吸血鬼', '🧜': '鱼尾人鱼', '🦊': '尖耳朵狐狸',
  '🐱': '猫耳客人', '🦝': '戴眼罩的浣熊',
};
const woRowText = ['上面一排', '下面一排'];
const woColText = ['靠窗那一列', '中间那一列', '靠卡座那一列'];
function woRowOf(t) { return WAITER_TABLE_NAMES.indexOf(t.name) < 3 ? 0 : 1; }
function woColOf(t) { return WAITER_TABLE_NAMES.indexOf(t.name) % 3; }

/* 当前所有未服务的客人 */
function woCandidates() {
  const list = [];
  WAITER_STATE.tables.forEach(t => t.guests.forEach(g => { if (!g.served) list.push({ t, g }); }));
  return list;
}
/* 在已揭示情报基础上追加一条后，还剩几位候选人 */
function woCountAfter(revealed, extra) {
  const all = extra ? revealed.concat([extra]) : revealed;
  return woCandidates().filter(({ t, g }) => all.every(c => c.test(t, g))).length;
}

/* L1 情报池：单条特征/粗方位（单条指向 ≥3 人才有信息量） */
function woPoolL1(tt, gg) {
  const pool = [];
  if (gg.acc) pool.push({ text: `戴着 <b>${gg.acc.name} ${gg.acc.ico}</b>`, test: (t, g) => !!g.acc && g.acc.name === gg.acc.name });
  else pool.push({ text: '<b>什么配饰都没戴</b>', test: (t, g) => !g.acc });
  pool.push({ text: `是位 <b>${WAITER_FACE_DESC[gg.face]}</b>`, test: (t, g) => g.face === gg.face });
  pool.push({ text: `坐在 <b>${woRowText[woRowOf(tt)]}</b>`, test: (t, g) => woRowOf(t) === woRowOf(tt), logic: true });
  pool.push({ text: `坐在 <b>${woColText[woColOf(tt)]}</b>`, test: (t, g) => woColOf(t) === woColOf(tt), logic: true });
  if (tt.guests.length > 1) pool.push({ text: '<b>和别人拼桌</b>', test: (t, g) => t.guests.length > 1, logic: true });
  else pool.push({ text: '<b>独自占了一张桌</b>', test: (t, g) => t.guests.length === 1, logic: true });
  return pool;
}

/* L1 = 两条正交情报取交集：单条都指向 ≥3 人，交集后剩 1~3 人（可推理锁定） */
function woBuildL1(tt, gg) {
  const pool = woPoolL1(tt, gg);
  let best = null, bestScore = -1;
  for (let i = 0; i < 80; i++) {
    const a = pool[Math.floor(Math.random() * pool.length)];
    const b = pool[Math.floor(Math.random() * pool.length)];
    if (a === b) continue;
    const na = woCountAfter([a]), nb = woCountAfter([b]);
    if (na < 3 || nb < 3) continue;                       // 单条太准 = 白给，不作首条
    const n = woCountAfter([a], b);
    if (n < 1 || n > 5) continue;
    const logic = (a.logic || b.logic) ? 5 : 0;
    const score = (n >= 2 && n <= 3 ? 100 : n === 1 ? 80 : 0) + logic + Math.random();
    if (score > bestScore) { bestScore = score; best = [a, b]; }
  }
  if (best) return best;
  // 兜底：信息量最大的两条
  const sorted = pool.slice().sort((x, y) => woCountAfter([y]) - woCountAfter([x]));
  return [sorted[0], sorted[1] || sorted[0]];
}

/* L2 范围情报池：排除法 / 细方位 / 同桌推理（压到 2~3 人） */
function woPoolL2(tt, gg) {
  const pool = [];
  WAITER_STATE.tables.forEach(t => {
    if (t.name !== tt.name) pool.push({ text: `不在 <b>${t.name}</b>`, test: (t2, g2) => t2.name !== t.name });
  });
  if (gg.acc) {
    WAITER_ACCS.forEach(a => {
      if (a.name !== gg.acc.name) pool.push({ text: `ta <b>没戴</b>${a.name}`, test: (t, g) => !(g.acc && g.acc.name === a.name) });
    });
    pool.push({ text: 'ta <b>没戴任何配饰</b>', test: (t, g) => !g.acc });
  } else {
    WAITER_ACCS.forEach(a => pool.push({ text: `ta <b>没戴</b>${a.name}`, test: (t, g) => !(g.acc && g.acc.name === a.name) }));
  }
  pool.push({ text: `ta 坐在 <b>${woRowText[woRowOf(tt)]}</b>`, test: (t, g) => woRowOf(t) === woRowOf(tt) });
  pool.push({ text: `ta 坐在 <b>${woColText[woColOf(tt)]}</b>`, test: (t, g) => woColOf(t) === woColOf(tt) });
  pool.push({ text: `ta 是位 <b>${WAITER_FACE_DESC[gg.face]}</b>`, test: (t, g) => g.face === gg.face });
  // 轻量推理：拿同桌那位当路标，绕一步才能锁定
  if (tt.guests.length > 1) {
    const other = tt.guests.find(x => x !== gg);
    if (other) {
      if (other.acc) pool.push({ text: `同桌那位戴着 <b>${other.acc.name} ${other.acc.ico}</b>`, test: (t, g) => t === tt && t.guests.some(x => x !== g && x.acc && x.acc.name === other.acc.name) });
      else pool.push({ text: '同桌那位 <b>什么都没戴</b>', test: (t, g) => t === tt && t.guests.some(x => x !== g && !x.acc) });
      pool.push({ text: `同桌还有一位 <b>${WAITER_FACE_DESC[other.face]}</b>`, test: (t, g) => t === tt && t.guests.some(x => x !== g && x.face === other.face) });
    }
  }
  return pool;
}

/* L3 直说：桌名 + 配饰（必唯一） */
function woDirectClue(tt, gg) {
  let text = `送到 <b>${tt.name}</b>`;
  if (tt.guests.length > 1) text += gg.acc ? `，找戴着 <b>${gg.acc.name} ${gg.acc.ico}</b> 的那位` : '，找 <b>没戴配饰</b> 的那位';
  return { text, test: (t, g) => t === tt && g === gg };
}

/* 从情报池里挑一条：优先落在 [wantMin, wantMax] 人区间；narrow=true 时兜底取收窄最多的一条 */
function woPickClue(pool, revealed, wantMin, wantMax, narrow) {
  pool = pool.filter(c => !revealed.some(r => r.text === c.text));
  shuffleArr(pool);
  let fallback = pool[0], bestN = narrow ? 999 : -1;
  for (const c of pool) {
    const n = woCountAfter(revealed, c);
    if (n >= wantMin && n <= wantMax) return c;
    if (narrow ? n < bestN : n > bestN) { bestN = n; fallback = c; }
  }
  return fallback;
}

/* 生成新订单：L1 两条正交情报取交集 → L2 → L3 */
function newOrder() {
  const pool = [];
  WAITER_STATE.tables.forEach(t => t.guests.forEach(g => { if (!g.served) pool.push({ t, g }); }));
  if (!pool.length) { buildFloor(); return newOrder(); }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const drink = RECIPES[Math.floor(Math.random() * RECIPES.length)];
  const l1 = woBuildL1(pick.t, pick.g);
  WAITER_STATE.order = {
    t: pick.t, g: pick.g,
    tier: 1, cap: WAITER_TIER_CAP[1],
    revealed: l1,
    pending: [woPickClue(woPoolL2(pick.t, pick.g), l1, 1, 2, true), woDirectClue(pick.t, pick.g)],
  };
  el('wo-drink').textContent = `🍸 ${drink.name}`;
  renderOrderCard();
}

/* 渲染订单卡：已揭示情报 + 追问按钮 */
function renderOrderCard() {
  const o = WAITER_STATE.order;
  if (!o) return;
  el('wo-clues').innerHTML = o.revealed.map(c => '· ' + c.text).join('<br>');
  const btn = el('wo-ask');
  if (o.pending.length) {
    btn.style.display = '';
    btn.textContent = `💬 再问一句（封顶降到 ${WAITER_TIER_CAP[o.tier + 1]} 分）`;
  } else {
    btn.style.display = 'none';
  }
}

/* 追加一条情报：这一单的封顶分降一档 */
function askMoreClue() {
  const o = WAITER_STATE.order;
  if (!WAITER_STATE.running || !o || !o.pending.length) return;
  o.revealed.push(o.pending.shift());
  o.tier++;
  o.cap = WAITER_TIER_CAP[o.tier];
  renderOrderCard();
  showWaiterJudge(`情报 +1，这单封顶 ${o.cap} 分`, 'good');
}

/* 点击客人判定 */
function pickGuest(table, guest) {
  if (!WAITER_STATE.running || !WAITER_STATE.order || guest.served) return;
  const order = WAITER_STATE.order;
  if (guest === order.g && table === order.t) {
    // 送对
    guest.served = true;
    guest.el.classList.add('served', 'right-flash');
    WAITER_STATE.combo++;
    WAITER_STATE.maxCombo = Math.max(WAITER_STATE.maxCombo, WAITER_STATE.combo);
    const gain = order.cap + Math.min(WAITER_STATE.combo - 1, 10) * 10;
    WAITER_STATE.score += gain;
    WAITER_STATE.done++;
    showWaiterJudge(`送对了！+${gain}`, 'perfect');
    newOrder();
  } else {
    // 送错（温和，不骂人，连击清零）
    guest.el.classList.remove('wrong-flash'); void guest.el.offsetWidth;
    guest.el.classList.add('wrong-flash');
    WAITER_STATE.combo = 0;
    WAITER_STATE.score = Math.max(0, WAITER_STATE.score - 20);
    WAITER_STATE.wrong++;
    showWaiterJudge('这位客人摆摆手：这不是我点的哦~', 'bad');
  }
  el('waiter-score').textContent = WAITER_STATE.score;
  el('waiter-combo').textContent = WAITER_STATE.combo;
  el('waiter-done').textContent = WAITER_STATE.done;
}

function showWaiterJudge(text, cls) {
  el('waiter-judge').textContent = text;
  el('waiter-judge').className = 'waiter-judge ' + cls;
}

/* 开始送盘 */
function startWaiter() {
  resetWaiterUI();
  buildFloor();
  WAITER_STATE.running = true;
  WAITER_STATE.timeLeft = WAITER_DURATION;
  el('waiter-start-btn').textContent = '高峰营业中…';
  el('waiter-start-btn').disabled = true;
  newOrder();
  WAITER_STATE.timer = setInterval(() => {
    WAITER_STATE.timeLeft--;
    el('waiter-time').textContent = WAITER_STATE.timeLeft;
    if (WAITER_STATE.timeLeft <= 0) endWaiter();
  }, 1000);
}
function stopWaiter() {
  WAITER_STATE.running = false;
  if (WAITER_STATE.timer) { clearInterval(WAITER_STATE.timer); WAITER_STATE.timer = null; }
}

/* 结算评级 + 小费 */
function endWaiter() {
  stopWaiter();
  const { done, wrong, maxCombo } = WAITER_STATE;
  const total = done + wrong;
  const accRate = total ? done / total : 0;
  let rank, mult, rep;
  if (done >= 6 && accRate >= 0.9) { rank = 'S'; mult = 1.5; rep = 12; }
  else if (accRate >= 0.75) { rank = 'A'; mult = 1.0; rep = 8; }
  else if (accRate >= 0.55) { rank = 'B'; mult = 0.6; rep = 4; }
  else { rank = 'C'; mult = 0.3; rep = 1; }
  const tip = Math.floor(done * 30 * mult);
  state.coins += tip;
  state.rep += rep;

  el('wr-grade').textContent = rank;
  el('wr-correct').textContent = done;
  el('wr-wrong').textContent = wrong;
  el('wr-maxcombo').textContent = maxCombo;
  el('wr-coins').textContent = tip;
  el('wr-rep').textContent = '+' + rep;
  el('waiter-result-overlay').classList.remove('hidden');

  el('waiter-start-btn').textContent = '▶ 再来一轮';
  el('waiter-start-btn').disabled = false;
  toast(`🍽️ 送盘 ${rank} 级，小费 ${tip}🪙，声望 +${rep}`);
  addLog(`🍽️ 送盘 ${rank} 级（${done} 对 ${wrong} 错），小费 ${tip}🪙`, 'settle-good');
  saveProgress();
  renderHUD();
}

function closeWaiterResult() {
  el('waiter-result-overlay').classList.add('hidden');
  resetWaiterUI();
  buildFloor();
}

/* ═══════════ 2.0 寻宝 · 星舰搜寻（寻机头） ═══════════ */
const TR_COLS = 10;    // 雷达 10 列 × 8 行（宽幅雷达，格子更大更好点）
const TR_ROWS = 8;
const TR_PLANES = 3;   // 3 艘星舰
// 星舰形状（头朝上）：以机翼中央为原点，第 0 个是机头
//   ✈
// ● ● ●
//   ●
//   ●
const TR_SHAPE = [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1], [0, 2]];

const TR_STATE = {
  running: false, timer: null, elapsed: 0,
  shipsLeft: TR_PLANES, miss: 0, scans: 0,
  grid: [], planes: [],
};

function openTreasure() {
  el('lounge').classList.add('hidden');
  el('treasure-room').classList.remove('hidden');
  renderShipBlueprints();
  newTreasureRound();
}

/* 左侧星舰造型示意：4 个朝向的 4×4 迷你图（与 TR_SHAPE 同源） */
function renderShipBlueprints() {
  const box = el('tr-shapes');
  if (!box || box.dataset.built) return;
  for (let rot = 0; rot < 4; rot++) {
    const mini = document.createElement('div');
    mini.className = 'tr-mini';
    const cells = TR_SHAPE.map(([dx, dy], i) => {
      const [rx, ry] = trRotate(dx, dy, rot);
      return { x: rx, y: ry, head: i === 0 };
    });
    const xs = cells.map(c => c.x), ys = cells.map(c => c.y);
    const w = Math.max(...xs) - Math.min(...xs) + 1;
    const h = Math.max(...ys) - Math.min(...ys) + 1;
    // 归一化到 0..3，并在 4×4 中居中
    const ox = Math.floor((4 - w) / 2) - Math.min(...xs);
    const oy = Math.floor((4 - h) / 2) - Math.min(...ys);
    const filled = {};
    cells.forEach(c => { filled[(c.y + oy) * 4 + (c.x + ox)] = c.head ? 'mh' : 'mp'; });
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('span');
      if (filled[i]) s.className = filled[i];
      mini.appendChild(s);
    }
    box.appendChild(mini);
  }
  box.dataset.built = '1';
}
function closeTreasure() {
  stopTreasureTimer();
  el('treasure-room').classList.add('hidden');
  el('lounge').classList.remove('hidden');
}

/* 旋转形状：rot 0上 1右 2下 3左 */
function trRotate(dx, dy, rot) {
  for (let i = 0; i < rot; i++) [dx, dy] = [-dy, dx];
  return [dx, dy];
}

/* 随机布阵 */
function trPlacePlanes() {
  const occ = new Set();
  const planes = [];
  for (let p = 0; p < TR_PLANES; p++) {
    let placed = null;
    for (let attempt = 0; attempt < 300 && !placed; attempt++) {
      const rot = Math.floor(Math.random() * 4);
      const cx = Math.floor(Math.random() * TR_COLS);
      const cy = Math.floor(Math.random() * TR_ROWS);
      const cells = TR_SHAPE.map(([dx, dy], i) => {
        const [rx, ry] = trRotate(dx, dy, rot);
        return { x: cx + rx, y: cy + ry, isHead: i === 0 };
      });
      const ok = cells.every(c =>
        c.x >= 0 && c.x < TR_COLS && c.y >= 0 && c.y < TR_ROWS &&
        !occ.has(c.x + ',' + c.y));
      if (ok) placed = cells;
    }
    if (!placed) return false;
    placed.forEach(c => occ.add(c.x + ',' + c.y));
    planes.push({ cells: placed, alive: true });
  }
  TR_STATE.planes = planes;
  return true;
}

function newTreasureRound() {
  stopTreasureTimer();
  Object.assign(TR_STATE, {
    running: true, elapsed: 0, shipsLeft: TR_PLANES,
    miss: 0, scans: 0, grid: [],
  });
  // 布阵（极小概率失败则重试）
  while (!trPlacePlanes()) { /* retry */ }
  // 建网格数据
  TR_STATE.grid = [];
  for (let y = 0; y < TR_ROWS; y++) {
    const row = [];
    for (let x = 0; x < TR_COLS; x++) {
      let planeIdx = -1, isHead = false;
      TR_STATE.planes.forEach((pl, i) => pl.cells.forEach(c => {
        if (c.x === x && c.y === y) { planeIdx = i; isHead = c.isHead; }
      }));
      row.push({ scanned: false, planeIdx, isHead });
    }
    TR_STATE.grid.push(row);
  }
  renderRadar();
  el('tr-judge').textContent = '星云雷达已就绪，点击格子开始扫描';
  el('tr-judge').className = 'treasure-judge';
  updateTreasureHUD();
  // 计时开始
  TR_STATE.timer = setInterval(() => {
    TR_STATE.elapsed++;
    el('tr-time').textContent = TR_STATE.elapsed;
  }, 1000);
}

function stopTreasureTimer() {
  if (TR_STATE.timer) { clearInterval(TR_STATE.timer); TR_STATE.timer = null; }
}

function renderRadar() {
  const grid = el('tr-grid');
  grid.innerHTML = '';
  for (let y = 0; y < TR_ROWS; y++) {
    for (let x = 0; x < TR_COLS; x++) {
      const cell = document.createElement('div');
      cell.className = 'tr-cell';
      cell.dataset.x = x; cell.dataset.y = y;
      cell.addEventListener('click', () => scanCell(x, y));
      TR_STATE.grid[y][x].el = cell;
      grid.appendChild(cell);
    }
  }
}

function updateTreasureHUD() {
  el('tr-ships').textContent = TR_STATE.shipsLeft;
  el('tr-miss').textContent = TR_STATE.miss;
  el('tr-scans').textContent = TR_STATE.scans;
  el('tr-time').textContent = TR_STATE.elapsed;
}

/* 扫描一个格子 */
function scanCell(x, y) {
  if (!TR_STATE.running) return;
  const data = TR_STATE.grid[y][x];
  const cellEl = data.el;
  if (data.scanned) return;
  data.scanned = true;
  cellEl.classList.add('scanned');
  TR_STATE.scans++;

  if (data.planeIdx >= 0 && data.isHead) {
    // 点中舰头：整艘现形
    const plane = TR_STATE.planes[data.planeIdx];
    plane.alive = false;
    plane.cells.forEach(c => {
      const d = TR_STATE.grid[c.y][c.x];
      d.scanned = true;
      d.el.classList.add('scanned', c.isHead ? 'head' : 'plane');
    });
    TR_STATE.shipsLeft--;
    showTreasureJudge('✈ 命中舰头！一艘星舰现形坠毁！', 'rare');
  } else if (data.planeIdx >= 0) {
    // 舰身
    cellEl.classList.add('hit');
    showTreasureJudge('● 雷达有反应……打中了什么东西', 'good');
  } else {
    // 水花：误点
    cellEl.classList.add('water', 'shake');
    TR_STATE.miss++;
    showTreasureJudge('💧 这里什么都没有', 'neutral');
  }
  updateTreasureHUD();

  if (TR_STATE.shipsLeft <= 0) endTreasure();
}

function showTreasureJudge(text, tone) {
  el('tr-judge').textContent = text;
  el('tr-judge').className = 'treasure-judge ' + tone;
}

/* 结算：按误点数评级 */
function endTreasure() {
  TR_STATE.running = false;
  stopTreasureTimer();
  const { miss, scans, elapsed } = TR_STATE;
  let rank, coins, rep;
  if (miss <= 3) { rank = 'S'; coins = 240; rep = 12; }
  else if (miss <= 8) { rank = 'A'; coins = 180; rep = 8; }
  else if (miss <= 15) { rank = 'B'; coins = 120; rep = 4; }
  else { rank = 'C'; coins = 70; rep = 1; }
  state.coins += coins;
  state.rep += rep;

  el('trr-grade').textContent = rank;
  el('trr-miss').textContent = miss;
  el('trr-scans').textContent = scans;
  el('trr-time').textContent = elapsed;
  el('trr-coins').textContent = coins;
  el('trr-rep').textContent = '+' + rep;
  el('tr-result-overlay').classList.remove('hidden');

  showTreasureJudge(`全部星舰找到！评级 ${rank}`, 'rare');
  toast(`🛩️ 星舰搜寻 ${rank} 级，赏金 ${coins}🪙，声望 +${rep}`);
  addLog(`🛩️ 星舰搜寻 ${rank} 级（误点${miss}次/用时${elapsed}s），赏金 ${coins}🪙`, 'settle-good');
  saveProgress();
  renderHUD();
}

function closeTreasureResult() {
  el('tr-result-overlay').classList.add('hidden');
  newTreasureRound();
}

/* ═══════════ 2.0 授课 · 星际调酒课堂（答题 + 自制课件） ═══════════ */
const CLASS_COOLDOWN_MS = 90 * 1000;   // 领赏冷却 90 秒
const CLASS_Q_TIME = 10;               // 每题 10 秒
const CLASS_Q_MAX = 10;                // 一局最多 10 题
const CLASS_STAGE_IDS = ['class-menu', 'class-quiz', 'class-editor', 'class-lecture'];

/* 题库：a 为正确选项下标（选项展示时会再打乱） */
const CLASS_BANK = [
  /* ── 鸡尾酒常识 ── */
  { cat: '鸡尾酒常识', star: 1, q: '「长岛冰茶」里其实没有以下哪样东西？', opts: ['红茶', '伏特加', '朗姆酒', '可乐'], a: 0 },
  { cat: '鸡尾酒常识', star: 1, q: '莫吉托（Mojito）的基酒是？', opts: ['白朗姆酒', '金酒', '威士忌', '白兰地'], a: 0 },
  { cat: '鸡尾酒常识', star: 1, q: '酒单上写「On the rocks」是什么意思？', opts: ['不加冰', '加冰块饮用', '摇匀后饮用', '加双份酒'], a: 1 },
  { cat: '鸡尾酒常识', star: 1, q: '玛格丽特的杯口通常有一圈什么？', opts: ['糖霜', '可可粉', '盐边', '辣椒粉'], a: 2 },
  { cat: '鸡尾酒常识', star: 2, q: '一杯干马天尼（Dry Martini）的经典装饰是？', opts: ['樱桃', '橄榄', '柠檬片', '薄荷叶'], a: 1 },
  { cat: '鸡尾酒常识', star: 1, q: '以下哪一种不属于传统「六大基酒」？', opts: ['金酒', '伏特加', '清酒', '龙舌兰'], a: 2 },
  { cat: '鸡尾酒常识', star: 1, q: '「血腥玛丽」最主要的配料是什么汁？', opts: ['番茄汁', '西瓜汁', '葡萄汁', '胡萝卜汁'], a: 0 },
  { cat: '鸡尾酒常识', star: 1, q: '「螺丝起子」是伏特加加上什么？', opts: ['苹果汁', '橙汁', '苏打水', '姜汁'], a: 1 },
  { cat: '鸡尾酒常识', star: 1, q: '「自由古巴」是朗姆酒加上什么？', opts: ['可乐', '雪碧', '汤力水', '红茶'], a: 0 },
  { cat: '鸡尾酒常识', star: 1, q: '莫吉特里必不可少的新鲜香草是？', opts: ['罗勒', '薄荷', '迷迭香', '香菜'], a: 1 },
  { cat: '鸡尾酒常识', star: 2, q: '「威士忌酸」里的酸味主要来自？', opts: ['酸奶', '柠檬汁', '山楂汁', '醋'], a: 1 },
  { cat: '鸡尾酒常识', star: 1, q: '金汤力（Gin Tonic）是金酒兑什么？', opts: ['苏打水', '汤力水', '干姜水', '矿泉水'], a: 1 },
  { cat: '鸡尾酒常识', star: 2, q: '龙舌兰最经典的喝法要搭配什么？', opts: ['柠檬和盐', '牛奶和糖', '酱油和芥末', '薄荷和糖'], a: 0 },
  { cat: '鸡尾酒常识', star: 2, q: '蓝橙力娇酒（蓝柑桂酒）给鸡尾酒带来什么？', opts: ['深邃的蓝色', '浓密的泡沫', '辛辣的口感', '咖啡香气'], a: 0 },
  { cat: '鸡尾酒常识', star: 2, q: '彩虹鸡尾酒能分出一层层颜色，利用的是酒的什么不同？', opts: ['温度', '密度（比重）', '颜色', '气泡量'], a: 1 },
  { cat: '鸡尾酒常识', star: 1, q: '用力摇晃调酒壶不能起到什么作用？', opts: ['混合原料', '快速降温', '给酒加热', '稀释酒液'], a: 2 },
  { cat: '鸡尾酒常识', star: 2, q: '调酒中 1 盎司（1oz）大约是多少毫升？', opts: ['10ml', '30ml', '60ml', '100ml'], a: 1 },
  { cat: '鸡尾酒常识', star: 2, q: '「曼哈顿」鸡尾酒的基酒是？', opts: ['威士忌', '伏特加', '朗姆酒', '金酒'], a: 0 },
  { cat: '鸡尾酒常识', star: 2, q: '经典干马天尼的基酒是？', opts: ['金酒', '龙舌兰', '白兰地', '清酒'], a: 0 },
  { cat: '鸡尾酒常识', star: 2, q: '莫吉托起源于哪个国家？', opts: ['古巴', '俄罗斯', '日本', '冰岛'], a: 0 },
  { cat: '鸡尾酒常识', star: 3, q: '「龙舌兰日出」漂亮的渐层红色主要来自？', opts: ['石榴糖浆', '西瓜汁', '红葡萄酒', '辣椒油'], a: 0 },
  { cat: '鸡尾酒常识', star: 2, q: '装饰用的薄荷叶在插入杯口前通常要怎么做？', opts: ['轻拍一下释放香气', '用开水烫熟', '冻成冰块', '沾一层盐'], a: 0 },
  { cat: '鸡尾酒常识', star: 3, q: '汤力水和苏打水的主要区别是？', opts: ['汤力水含奎宁，微苦', '汤力水是热的', '苏打水含酒精', '完全一样'], a: 0 },
  { cat: '鸡尾酒常识', star: 3, q: '调酒用的冰块越大，通常会怎样？', opts: ['融化越慢，稀释越少', '酒升温越快', '酒味越甜', '完全不影响'], a: 0 },
  /* ── 酒吧道具 ── */
  { cat: '酒吧道具', star: 1, q: '调酒师用来精确量取酒液的双头量杯叫？', opts: ['盎司杯（Jigger）', '醒酒器', '分酒壶', '虹吸壶'], a: 0 },
  { cat: '酒吧道具', star: 1, q: '摇酒壶在我们吧台的行话里叫？', opts: ['摇壶', '砂锅', '烧杯', '紫砂壶'], a: 0 },
  { cat: '酒吧道具', star: 2, q: '倒酒时挡在杯口、不让冰块掉进杯子的工具叫？', opts: ['滤冰器', '漏斗', '茶漏', '渔网'], a: 0 },
  { cat: '酒吧道具', star: 2, q: '长柄吧勺除了搅拌，还常用于什么操作？', opts: ['分层注入', '开酒瓶', '削果皮', '量温度'], a: 0 },
  { cat: '酒吧道具', star: 1, q: '在我们酒吧，调好一杯酒的第一步是什么？', opts: ['加冰块', '收钱', '按铃', '装饰水果'], a: 0 },
  { cat: '酒吧道具', star: 2, q: '酒液摇匀后，下一步操作是？', opts: ['点「出酒」装杯', '直接倒掉', '再加一轮料', '先收钱'], a: 0 },
  /* ── 本店配方 ── */
  { cat: '本店配方', star: 1, q: '本店最便宜的「冰镇可乐」里除了可乐还有什么配料？', opts: ['柠檬', '牛奶', '龙舌兰', '薄荷'], a: 0 },
  { cat: '本店配方', star: 1, q: '斯沃德麦伦每次来点的「伏特加」，基酒只有一种，它是？', opts: ['伏特加', '金酒', '朗姆酒', '威士忌'], a: 0 },
  { cat: '本店配方', star: 2, q: '「蓝色玛格丽特」漂亮的蓝色来自哪种酒？', opts: ['蓝橙力娇酒', '紫罗兰利口酒', '薄荷酒', '蓝莓汁'], a: 0 },
  { cat: '本店配方', star: 2, q: '「蓝色玛格丽特」的基酒是？', opts: ['龙舌兰', '伏特加', '白兰地', '清酒'], a: 0 },
  { cat: '本店配方', star: 2, q: '绿色的「查特绿」里没有以下哪种原料？', opts: ['伏特加', '查特酒', '青柠汁', '苏打水'], a: 0 },
  { cat: '本店配方', star: 2, q: '「查特绿」的小料是？', opts: ['肉桂棒', '橙皮', '黑樱桃', '金粉'], a: 0 },
  { cat: '本店配方', star: 2, q: '「草莓朗姆酒」需要摇壶吗？', opts: ['需要', '不需要', '看心情', '只用嘴吹'], a: 0 },
  { cat: '本店配方', star: 2, q: '「紫罗兰奶油利口酒」用哪种闪粉装饰？', opts: ['可食用闪金粉', '辣椒粉', '可可粉', '抹茶粉'], a: 0 },
  { cat: '本店配方', star: 1, q: '谶大侠每次来都要喝的粉色无酒精特饮是？', opts: ['草泡奶', '伏特加', '托卡伊阿苏', '冰镇可乐'], a: 0 },
  { cat: '本店配方', star: 2, q: '本店售价最高、达到 190 星币的酒是？', opts: ['蓝色玛格丽特', '冰镇可乐', '伏特加', '草莓朗姆酒'], a: 0 },
  { cat: '本店配方', star: 1, q: '我们酒吧的招牌酒是哪一杯？', opts: ['草莓朗姆酒', '蓝色玛格丽特', '查特绿', '冰镇可乐'], a: 0 },
  /* ── 星际猎手 ── */
  { cat: '星际猎手', star: 1, q: '以下哪位是星际猎手的成员？', opts: ['烬行', '德雷克', '洛九', '红隼'], a: 0 },
  { cat: '星际猎手', star: 2, q: '以下哪位是星际猎手的成员？', opts: ['伽蓝', '谶', '维恩', '零壹'], a: 1 },
  { cat: '星际猎手', star: 2, q: '以下哪位【不是】星际猎手的成员？', opts: ['度漪', '塔拉撒里昂', '斯沃德麦伦', '奥菲斯'], a: 3 },
  { cat: '星际猎手', star: 3, q: '星际猎手一共有几位成员？', opts: ['5 位', '6 位', '7 位', '8 位'], a: 2 },
  { cat: '星际猎手', star: 3, q: '以下哪位是星际猎手的成员？', opts: ['赛琳娜', '麦克斯', '铃弗瑞迪尔', '薇拉'], a: 2 },
  /* ── 星际经营 ── */
  { cat: '星际经营', star: 1, q: '收租阿婆每隔几个游戏天来收一次租？', opts: ['7 天', '3 天', '10 天', '30 天'], a: 0 },
  { cat: '星际经营', star: 1, q: '每周要交给阿婆的租金是多少星币？', opts: ['1280', '580', '2000', '88'], a: 0 },
  { cat: '星际经营', star: 2, q: '小水手每服务一位客人，周结工资是多少星币？', opts: ['15', '50', '5', '100'], a: 0 },
  { cat: '星际经营', star: 2, q: '给小水手确认支付工资，他的心情会？', opts: ['+20', '-30', '不变', '直接归零'], a: 0 },
  { cat: '星际经营', star: 2, q: '拒绝支付小水手工资，他的心情会？', opts: ['-30', '+20', '加满', '毫无波澜'], a: 0 },
  { cat: '星际经营', star: 2, q: '小水手心情低于多少会开始罢工？', opts: ['50', '10', '80', '100'], a: 0 },
  { cat: '星际经营', star: 3, q: '星舰搜寻雷达是几乘几的网格、藏着几艘星舰？', opts: ['10×8，3 艘', '6×6，1 艘', '10×10，5 艘', '4×4，2 艘'], a: 0 },
  { cat: '星际经营', star: 2, q: '在星舰搜寻中，点中星舰的哪个部位会让整艘现形？', opts: ['舰头', '机翼', '任何一格', '舰尾'], a: 0 },
];

const CQ = { running: false, pool: [], idx: 0, streak: 0, cur: null, timeLeft: 0, timer: null, hintLeft: 1, locked: false };
let classCooldownUntil = 0;
let classMenuTimer = null;

function openClass() {
  el('lounge').classList.add('hidden');
  el('classroom-room').classList.remove('hidden');
  state.inClass = true;             // 课间休息：吧台冻结
  showClassStage('class-menu');
  refreshClassMenu();
  classMenuTimer = setInterval(refreshClassMenu, 500);
}
function closeClass() {
  stopQuizTimer();
  clearInterval(classMenuTimer);
  classMenuTimer = null;
  state.inClass = false;
  el('classroom-room').classList.add('hidden');
  el('class-result-overlay').classList.add('hidden');
  el('lounge').classList.remove('hidden');
}
function showClassStage(id) {
  CLASS_STAGE_IDS.forEach(s => el(s).classList.toggle('hidden', s !== id));
}
function classCoolingLeft() {
  return Math.max(0, Math.ceil((classCooldownUntil - Date.now()) / 1000));
}
function refreshClassMenu() {
  // 随堂测验 / 讲课领赏共用 90 秒冷却；备课随时可做
  const btn = document.querySelector('#class-menu .chalk-menu-btn');
  if (!btn) return;
  const left = classCoolingLeft();
  btn.disabled = left > 0;
  const cd = el('menu-cd');
  if (cd) cd.textContent = left > 0 ? `（小水手复习中，${left}s）` : '';
}

/* ────────── 随堂测验（答错即停） ────────── */
function shuffleArr(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function customQuestions() {
  return DECK.pages
    .filter(p => p.type === 'quiz' && p.q.trim() && p.opts.filter(o => o.trim()).length === 4)
    .map(p => ({ cat: '自制课件', star: 1, q: p.q.trim(), opts: p.opts.map(o => o.trim()), a: p.ans | 0, custom: true }));
}
function startQuiz() {
  const left = classCoolingLeft();
  if (left > 0) return toast(`小水手还在消化上节课，${left} 秒后再上课吧`);
  const pool = shuffleArr(CLASS_BANK.concat(customQuestions())).slice(0, CLASS_Q_MAX);
  CQ.running = true; CQ.pool = pool; CQ.idx = 0; CQ.streak = 0;
  CQ.hintLeft = 1; CQ.locked = false;
  el('cq-judge').textContent = '';
  el('cq-judge').className = 'quiz-judge';
  showClassStage('class-quiz');
  nextQuestion();
}
function stopQuizTimer() {
  clearInterval(CQ.timer);
  CQ.timer = null;
}
function nextQuestion() {
  stopQuizTimer();
  if (CQ.idx >= CQ.pool.length) return endQuiz(true);
  CQ.locked = false;
  const q = CQ.pool[CQ.idx];
  CQ.cur = q;
  const order = shuffleArr([0, 1, 2, 3]);
  q._order = order;
  el('cq-cat').textContent = q.cat + (q.custom ? '（你的课件）' : '');
  el('cq-star').textContent = '★'.repeat(q.star) + '☆'.repeat(3 - q.star);
  el('cq-q').textContent = q.q;
  el('cq-streak').textContent = CQ.streak;
  el('cq-progress').textContent = CQ.idx + 1;
  el('cq-hint').disabled = CQ.hintLeft <= 0;
  el('cq-hint').textContent = CQ.hintLeft > 0 ? '📖 偷看课本' : '📖 已用过';
  const box = el('cq-opts');
  box.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];
  order.forEach((bankIdx, displayIdx) => {
    const b = document.createElement('button');
    b.className = 'quiz-opt';
    b.dataset.bank = bankIdx;
    b.innerHTML = `<span class="qo-letter">${letters[displayIdx]}</span><span class="qo-text"></span>`;
    b.querySelector('.qo-text').textContent = q.opts[bankIdx];
    b.addEventListener('click', () => answerQuiz(bankIdx, b));
    box.appendChild(b);
  });
  CQ.timeLeft = CLASS_Q_TIME;
  el('cq-time').textContent = CQ.timeLeft;
  el('cq-time').parentElement.classList.remove('urgent');
  CQ.timer = setInterval(() => {
    CQ.timeLeft--;
    el('cq-time').textContent = CQ.timeLeft;
    if (CQ.timeLeft <= 3) el('cq-time').parentElement.classList.add('urgent');
    if (CQ.timeLeft <= 0) { stopQuizTimer(); timeoutQuiz(); }
  }, 1000);
}
function useHint() {
  if (CQ.locked || CQ.hintLeft <= 0) return;
  const wrong = CQ.cur._order.filter(i => i !== CQ.cur.a);
  const kill = shuffleArr(wrong).slice(0, 2);
  document.querySelectorAll('.quiz-opt').forEach(b => {
    if (kill.includes(+b.dataset.bank)) b.classList.add('dim');
  });
  CQ.hintLeft = 0;
  el('cq-hint').disabled = true;
  el('cq-hint').textContent = '📖 已用过';
}
function answerQuiz(bankIdx, btn) {
  if (CQ.locked) return;
  CQ.locked = true;
  stopQuizTimer();
  const correct = bankIdx === CQ.cur.a;
  document.querySelectorAll('.quiz-opt').forEach(b => {
    b.classList.add('locked');
    if (+b.dataset.bank === CQ.cur.a) b.classList.add('correct');
  });
  const judge = el('cq-judge');
  if (correct) {
    CQ.streak++;
    el('cq-streak').textContent = CQ.streak;
    btn.classList.add('correct');
    const lines = ['叮！答对了，小水手疯狂记笔记', '小水手举手：这题我会！', '哇——前排同学发出了惊叹', '粉笔头一扔：漂亮！', '课本没白偷看，答对啦'];
    judge.textContent = lines[Math.floor(Math.random() * lines.length)];
    judge.className = 'quiz-judge good';
    singBeep(660, 0.12);
    CQ.idx++;
    setTimeout(() => { if (CQ.running) nextQuestion(); }, 850);
  } else {
    btn.classList.add('wrong');
    judge.textContent = `下课铃响了！正确答案是「${CQ.cur.opts[CQ.cur.a]}」`;
    judge.className = 'quiz-judge bad';
    singBeep(180, 0.3);
    setTimeout(() => { if (CQ.running) endQuiz(false); }, 1700);
  }
}
function timeoutQuiz() {
  if (CQ.locked) return;
  CQ.locked = true;
  document.querySelectorAll('.quiz-opt').forEach(b => {
    b.classList.add('locked');
    if (+b.dataset.bank === CQ.cur.a) b.classList.add('correct');
  });
  const judge = el('cq-judge');
  judge.textContent = `时间到！这题答案是「${CQ.cur.opts[CQ.cur.a]}」，下次手快一点`;
  judge.className = 'quiz-judge bad';
  singBeep(180, 0.3);
  setTimeout(() => { if (CQ.running) endQuiz(false); }, 1700);
}
function endQuiz(allRight) {
  CQ.running = false;
  stopQuizTimer();
  const streak = CQ.streak;
  const grade = streak >= 10 ? 'S' : streak >= 7 ? 'A' : streak >= 4 ? 'B' : 'C';
  const mult = grade === 'S' ? 1.5 : grade === 'A' ? 1.0 : grade === 'B' ? 0.6 : 0.3;
  const repGain = { S: 12, A: 8, B: 4, C: 1 }[grade];
  const coins = Math.floor(streak * 30 * mult);
  classCooldownUntil = Date.now() + CLASS_COOLDOWN_MS;
  showClassResult({
    grade,
    title: allRight ? '十题全对！小水手听呆了' : '本节课结束',
    rows: [
      `<div>连对 <b>${streak}</b> 题${allRight ? '（全部答对）' : '后下课铃响了'}</div>`,
      `<div>评级倍率 ×${mult}</div>`,
      `<div class="cr-reward">学费 <b>+${coins}</b> 🪙 · 声望 <b>+${repGain}</b></div>`,
    ],
    coins, rep: repGain,
    logTag: `🎓 随堂测验 ${grade} 级，连对 ${streak} 题，学费 ${coins}🪙`,
  });
  showClassStage('class-menu');
}

/* ────────── 自制课件（黑板 PPT） ────────── */
const DECK_KEY = 'cyberbar_deck_v2';
let DECK = { pages: [] };
const ED = { idx: 0 };

function defaultDeck() {
  return { pages: [
    { type: 'knowledge', title: '星际猎手成员', bullets: '烬行\n铃弗瑞迪尔\n度漪\n塔拉撒里昂\n赛博恩\n斯沃德麦伦\n谶', opts: ['', '', '', ''], ans: 0 },
    { type: 'knowledge', title: '酒吧的招牌？', bullets: '草莓朗姆酒', opts: ['', '', '', ''], ans: 0 },
  ] };
}
function loadDeck() {
  try {
    const s = JSON.parse(localStorage.getItem(DECK_KEY) || 'null');
    if (s && Array.isArray(s.pages) && s.pages.length) { DECK = s; return; }
  } catch (e) {}
  DECK = defaultDeck();
  saveDeck();
}
function saveDeck() {
  try { localStorage.setItem(DECK_KEY, JSON.stringify(DECK)); } catch (e) {}
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function openEditor() {
  ED.idx = Math.min(ED.idx, DECK.pages.length - 1);
  if (ED.idx < 0) ED.idx = 0;
  showClassStage('class-editor');
  renderThumbs();
  loadPageToForm();
}
function curPage() { return DECK.pages[ED.idx]; }
function saveFormToPage() {
  const p = curPage();
  if (!p) return;
  if (p.type === 'knowledge') {
    p.title = el('ed-title').value;
    p.bullets = el('ed-bullets').value;
  } else {
    p.q = el('ed-q').value;
    p.opts = Array.from(document.querySelectorAll('#ed-opts input')).map(i => i.value);
  }
  saveDeck();
}
function loadPageToForm() {
  const p = curPage();
  el('ed-f-knowledge').classList.toggle('hidden', p.type !== 'knowledge');
  el('ed-f-quiz').classList.toggle('hidden', p.type !== 'quiz');
  if (p.type === 'knowledge') {
    el('ed-title').value = p.title || '';
    el('ed-bullets').value = p.bullets || '';
  } else {
    el('ed-q').value = p.q || '';
    const box = el('ed-opts');
    box.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const row = document.createElement('div');
      row.className = 'ed-opt' + (p.ans === i ? ' ans' : '');
      const radio = document.createElement('span');
      radio.className = 'ed-radio';
      radio.textContent = p.ans === i ? '✓' : '';
      radio.title = '标记为正确答案';
      radio.addEventListener('click', () => {
        saveFormToPage();
        curPage().ans = i;
        document.querySelectorAll('#ed-opts .ed-opt').forEach((r, j) => {
          r.classList.toggle('ans', j === i);
          r.querySelector('.ed-radio').textContent = j === i ? '✓' : '';
        });
        saveDeck(); renderThumbs();
      });
      const inp = document.createElement('input');
      inp.className = 'chalk-input';
      inp.maxLength = 40;
      inp.placeholder = `选项 ${'ABCD'[i]}`;
      inp.value = (p.opts && p.opts[i]) || '';
      row.appendChild(radio); row.appendChild(inp);
      box.appendChild(row);
    }
  }
}
function renderThumbs() {
  const box = el('ed-thumbs');
  box.innerHTML = '';
  DECK.pages.forEach((p, i) => {
    const t = document.createElement('div');
    t.className = 'thumb' + (i === ED.idx ? ' active' : '');
    const label = p.type === 'quiz' ? `❓ ${p.q || '未命名考题'}` : `📖 ${p.title || '未命名知识页'}`;
    t.innerHTML = `<b>${i + 1}.</b>${esc(label.slice(0, 12))}`;
    t.title = label;
    t.addEventListener('click', () => selectPage(i));
    box.appendChild(t);
  });
}
function selectPage(i) {
  if (i === ED.idx) return;
  saveFormToPage();
  ED.idx = i;
  renderThumbs();
  loadPageToForm();
}
function addDeckPage(type) {
  saveFormToPage();
  DECK.pages.push({ type, title: '', bullets: '', q: '', opts: ['', '', '', ''], ans: 0 });
  ED.idx = DECK.pages.length - 1;
  saveDeck(); renderThumbs(); loadPageToForm();
  toast(type === 'quiz' ? '❓ 已加一张考题页，记得圈出正确答案' : '📖 已加一张知识页');
}
function deleteDeckPage() {
  if (DECK.pages.length <= 1) {
    DECK.pages = [{ type: 'knowledge', title: '', bullets: '', opts: ['', '', '', ''], ans: 0 }];
    ED.idx = 0;
  } else {
    DECK.pages.splice(ED.idx, 1);
    ED.idx = Math.min(ED.idx, DECK.pages.length - 1);
  }
  saveDeck(); renderThumbs(); loadPageToForm();
}
/* 表单输入：自动保存（事件委托绑定一次） */
function bindEditorAutosave() {
  const sync = () => {
    saveFormToPage();
    renderThumbs();
    el('ed-save').textContent = '💾 已保存 ' + new Date().toLocaleTimeString('zh-CN', { hour12: false });
  };
  el('ed-f-knowledge').addEventListener('input', sync);
  el('ed-f-quiz').addEventListener('input', sync);
}
/* 有效页判定 */
function validKnowledge(p) { return !!(p.title || '').trim() && (p.bullets || '').split('\n').filter(s => s.trim()).length >= 1; }
function validQuiz(p) { return !!(p.q || '').trim() && (p.opts || []).filter(o => (o || '').trim()).length === 4; }

/* ────────── 讲课播放 ────────── */
const LC = { idx: 0, pages: [] };
function startLecture() {
  // 只有编辑器实际打开过（表单已载入当前页）时才回存，避免隐藏空表单清空课件
  if (!el('class-editor').classList.contains('hidden')) saveFormToPage();
  const valid = DECK.pages.filter(p => p.type === 'knowledge' ? validKnowledge(p) : validQuiz(p));
  if (!valid.length) return toast('黑板还是空的：至少写好一张完整的知识页或考题页吧');
  const left = classCoolingLeft();
  if (left > 0) return toast(`小水手还在复习上节课，${left} 秒后再开讲`);
  LC.pages = valid;
  LC.idx = 0;
  showClassStage('class-lecture');
  renderLecture();
}
function renderLecture() {
  const p = LC.pages[LC.idx];
  el('lc-page-no').textContent = `${LC.idx + 1}/${LC.pages.length}`;
  const board = el('lc-board');
  if (p.type === 'knowledge') {
    const lines = (p.bullets || '').split('\n').map(s => s.trim()).filter(Boolean);
    board.innerHTML =
      `<div class="lc-type">📖 知识页</div>` +
      `<div class="lc-title">${esc(p.title)}</div>` +
      `<div class="lc-bullets">${lines.map(l => `<div><i class="lc-dot"></i>${esc(l)}</div>`).join('')}</div>`;
  } else {
    board.innerHTML =
      `<div class="lc-type">❓ 考题页（圈出的是正确答案）</div>` +
      `<div class="lc-q">${esc(p.q)}</div>` +
      `<div class="lc-opts">${p.opts.map((o, i) =>
        `<div class="lc-opt${i === (p.ans | 0) ? ' answer' : ''}"><span>${'ABCD'[i]}</span><span>${esc(o)}</span></div>`).join('')}</div>`;
  }
  el('lc-tip').textContent = LC.idx < LC.pages.length - 1 ? '点击幻灯片翻下一页 →' : '点击幻灯片讲完最后一页';
}
function nextLecturePage() {
  if (LC.idx < LC.pages.length - 1) { LC.idx++; renderLecture(); }
  else endLecture();
}
function endLecture() {
  const pages = LC.pages;
  const quizCount = pages.filter(p => p.type === 'quiz').length;
  let grade;
  if (pages.length >= 6 && quizCount >= 2) grade = 'S';
  else if (pages.length >= 4 && quizCount >= 1) grade = 'A';
  else if (pages.length >= 3) grade = 'B';
  else grade = 'C';
  const reward = { S: [360, 12], A: [240, 8], B: [150, 4], C: [80, 1] }[grade];
  classCooldownUntil = Date.now() + CLASS_COOLDOWN_MS;
  showClassResult({
    grade,
    title: '讲课结束，小水手鼓掌！',
    rows: [
      `<div>完整课件 <b>${pages.length}</b> 页 · 自制考题 <b>${quizCount}</b> 道</div>`,
      '<div>小水手的笔记本写得满满当当</div>',
      `<div class="cr-reward">讲课费 <b>+${reward[0]}</b> 🪙 · 声望 <b>+${reward[1]}</b></div>`,
    ],
    coins: reward[0], rep: reward[1],
    logTag: `🎓 讲课 ${grade} 级（${pages.length}页/${quizCount}题），讲课费 ${reward[0]}🪙`,
  });
  LC.pages = [];
  showClassStage('class-menu');
}

/* ────────── 结算弹窗（统一风格） ────────── */
function showClassResult(r) {
  state.coins += r.coins;
  state.rep += r.rep;
  el('cr-grade').textContent = r.grade;
  el('cr-title').textContent = r.title;
  el('cr-rows').innerHTML = r.rows.join('');
  el('class-result-overlay').classList.remove('hidden');
  toast(`🎓 ${r.title.replace(/[！!]/g, '')}：${r.grade} 级，+${r.coins} 🪙`);
  addLog(r.logTag, 'settle-good');
  saveProgress();
  renderHUD();
}
function closeClassResult() {
  el('class-result-overlay').classList.add('hidden');
  showClassStage('class-menu');
}

/* 交付完成 / 清空操作台：摇酒进度条立刻归零 */
function resetStation() {
  state.shaker = { items: [], hasIce: false, shaken: false, shaking: false, shakeSession: state.shaker.shakeSession + 1, shakeProgress: 0, autoShake: false };
  state.glass = { filled: false, fruit: null, items: [], garnish: [], hasIce: false, shaken: false };
  state.garnishWarned = false;
  if (el('btn-auto-shake')) {
    el('btn-auto-shake').classList.remove('on');
    el('btn-auto-shake').textContent = '🤖 自动摇壶';
  }
  resetProgress();
  const m = el('shaker-mount');
  m.classList.remove('shake', 'pouring');
  syncMountState();
}

/* 倒掉重做：一键清空调酒壶与酒杯（做错配方时重新开始，无惩罚） */
function dumpStation() {
  const hasStuff = state.shaker.items.length > 0 || state.shaker.hasIce || state.glass.filled || (state.glass.garnish && state.glass.garnish.length > 0);
  if (!hasStuff && !state.shaker.shaking && !state.shaker.shaken) return toast('操作台空空如也，没什么可倒的');
  resetStation();
  toast('🗑 已倒掉，重新开始调制');
  playSound('dump');
  renderAll();
}

/* GameOver 检查 */
function checkGameOver() {
  if (!state.gameOver && state.lost >= CONFIG.MAX_LOST) {
    state.gameOver = true;
    showGameOver();
  }
}
function showGameOver() {
  el('go-coins').textContent = state.coins;
  el('go-served').textContent = state.served;
  el('go-rate').textContent = (state.served
    ? Math.round((state.perfectCount + state.goodCount) / state.served * 100)
    : 0) + '%';
  el('go-lost').textContent = state.lost;
  el('go-day').textContent = state.day;
  el('go-rep').textContent = state.rep;
  const rank = recordRun();
  el('go-rank').textContent = rank > 0 ? '第 ' + rank + ' 名' : '未上榜';
  el('gameover-overlay').classList.remove('hidden');
  playSound('angry');
  vibrate(80);
}

/* ════════════ 五·五、暂停营业（休息） ════════════ */
function togglePause() {
  if (!state.gameStarted) return;
  state.paused = !state.paused;
  el('btn-pause').classList.toggle('paused', state.paused);
  el('btn-pause').innerHTML = state.paused ? '▶ 继续' : '⏸ 暂停';
  el('pause-overlay').classList.toggle('hidden', !state.paused);
  // 背景音乐随暂停休息一同暂停/恢复
  if (state.bgmOn) {
    if (state.paused) pauseBarBGM();
    else startBGM();
  }
  playSound('click');
  if (state.paused) toast('☕ 暂停营业，休息一下');
}

/* ════════════ 六、音效（WebAudio 合成，零外部资源） ════════════ */
let actx = null;
function ensureAudio() {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
}
function tone(freq, dur = 0.15, type = 'sine', vol = 0.12, slideTo = null, delay = 0) {
  if (!actx || !state.soundOn) return;
  try {
    const t0 = actx.currentTime + delay;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(t0); o.stop(t0 + dur + 0.03);
  } catch (e) {}
}
function noiseBurst(dur = 0.25, vol = 0.1, cutoff = 1200, delay = 0) {
  if (!actx || !state.soundOn) return;
  try {
    const t0 = actx.currentTime + delay;
    const n = Math.floor(actx.sampleRate * dur);
    const buf = actx.createBuffer(1, n, actx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = actx.createBufferSource(); src.buffer = buf;
    const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
    const g = actx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(actx.destination);
    src.start(t0);
  } catch (e) {}
}
function playSound(type) {
  ensureAudio();
  if (!actx || !state.soundOn) return;
  switch (type) {
    case 'click':     tone(1100, .04, 'sine', .07, 1850); tone(2400, .03, 'sine', .035, null, .02); break;   // 清脆上扬短音
    case 'ice':       tone(1400, .07, 'sine', .08); tone(900, .09, 'sine', .07, null, .07); break;
    case 'pour':      noiseBurst(.3, .07, 900); break;
    case 'dump':      tone(560, .16, 'sine', .1, 240); tone(320, .3, 'sine', .1, 150, .14); break;   // 倒掉：下滑的水声
    case 'shake':     noiseBurst(.18, .09, 700); noiseBurst(.18, .08, 500, .16); break;
    case 'shakeDone': tone(880, .12, 'sine', .1); tone(1318, .2, 'sine', .09, null, .1); break;
    case 'bell':      tone(1319, .1, 'sine', .1); tone(1760, .14, 'sine', .08, null, .05); tone(2637, .12, 'sine', .05, null, .1); break;   // 清脆铃音
    case 'coin':      tone(988, .08, 'sine', .09); tone(1319, .22, 'sine', .09, null, .08); break;
    case 'angry':     tone(240, .28, 'sawtooth', .09, 110); break;
    case 'tick':      tone(1650, .02, 'sine', .03); break;
  }
}
function vibrate(ms) {
  if (!ms) return;
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
}

/* ════════════ 七、游戏主循环与初始化 ════════════ */

/* 主循环：100ms 一次心跳（天数 / 刷客 / 耐心倒计时 / HUD）
   剧情未播完 / 暂停休息时不推进游戏 */
function tick(dt) {
  if (state.gameOver || state.paused || !state.gameStarted) return;
  if (state.inClass) return;       // 课间休息：上课/备课期间吧台时间冻结
  state.elapsed += dt;
  // 天数推进：顾客刷新变快、耐心变短、复杂配方变多
  const newDay = Math.floor(state.elapsed / CONFIG.DAY_SECONDS) + 1;
  if (newDay !== state.day) {
    state.day = newDay;
    state.rentDay++;
    addLog(`🌅 第 ${newDay} 天：生意更忙了，顾客的耐心更少了！`, 'day');
    toast(`🌅 第 ${newDay} 天`);
    // 收租判定
    if (state.rentDay >= CONFIG.RENT_INTERVAL_DAYS) {
      collectRent();
      state.rentDay = 0;
      // 收租后结算小水手工资（阿婆弹窗关闭后自动弹出）
      state.sailorPayPending = true;
    }
  }
  // 自动刷客
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    if (state.queue.length >= CONFIG.MAX_QUEUE) overflowLose();
    else spawnCustomer();
    state.spawnTimer = spawnInterval() + Math.random() * 2;
  }
  // 顾客耐心倒计时（全员同时流逝）
  for (const c of [...state.queue]) {
    c.patience -= dt;
    if (c.patience <= 0) { c.patience = 0; customerLeave(c); continue; }
    // 小水手接班：客人耐心剩 3 秒时自动出餐（good 评分，中规中矩）
    // 心情低于 50 时小水手罢工，客人会流失
    if (state.inLounge && state.sailorMood >= CONFIG.SAILOR_MOOD_MIN && c.patience <= 3 && !c.served) {
      sailorSettle(c);
      continue;
    }
    updatePatienceUI(c);
  }
  // 自动摇酒：匀速自动增长进度（手动操作可叠加）
  if (state.shaker.autoShake && state.shaker.items.length > 0 && !state.shaker.shaken) {
    addShakeProgress(CONFIG.SHAKE_AUTO_RATE);
  }
  renderHUD();
  renderFlow();
}

function init() {
  loadProgress();  // 星币与声望不清零：恢复上次存档
  // 应用背景图（包内文件；BG_IMAGE 为空时回退 CSS 星空）
  if (BG_IMAGE) {
    el('bg-layer').style.backgroundImage = `url("${BG_IMAGE}")`;   /* 超大背景层：横屏方向、比屏幕大，旋转后填满无死角 */
    el('bg-layer').classList.add('has-photo');
  }
  buildShelf();
  buildGF();
  loadDeck();              // 2.0 授课：载入自制课件（首次使用生成示例课件）
  bindEditorAutosave();    // 2.0 授课：课件表单自动保存

  /* ── 事件绑定 ── */
  // 摇酒：①点击调酒壶（每次点击叠加进度）
  el('shaker-mount').addEventListener('click', manualShakeClick);
  // ②键盘空格（全局，每次按下叠加进度；preventDefault 防止误触聚焦按钮）
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space') return;
    if (!state.gameStarted || state.paused || state.gameOver || state.storyActive) return;
    e.preventDefault();
    manualShakeClick();
  });
  // 自动摇壶开关
  el('btn-auto-shake').addEventListener('click', toggleAutoShake);
  // 开始摇壶：启动摇晃并叠加一次进度（物理摇晃须等此按钮启动后才生效）
  el('btn-start-shake').addEventListener('click', startShakeBtn);
  // 倒掉重做：清空壶与杯
  el('btn-dump').addEventListener('click', dumpStation);
  el('btn-ice').addEventListener('click', addIce);
  el('btn-pour').addEventListener('click', pourGlass);
  el('btn-bell').addEventListener('click', ringBell);
  el('btn-restart').addEventListener('click', () => location.reload());
  // 2.0 收租阿婆弹窗关闭
  el('btn-grandma-close').addEventListener('click', closeGrandma);
  // 2.0 盗贼事件
  el('btn-robbery-smash').addEventListener('click', robberySmash);
  el('robbery-dialog').addEventListener('click', e => {
    const btn = e.target.closest('.robbery-choice');
    if (btn) robberyChoice(btn.dataset.choice);
  });
  // 2.0 员工手册
  el('btn-handbook-close').addEventListener('click', closeHandbook);
  el('handbook-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.hb-tab');
    if (!tab) return;
    document.querySelectorAll('.hb-tab').forEach(t => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.hb-panel').forEach(p => p.classList.toggle('active', p.id === 'hb-' + tab.dataset.tab));
  });
  // 2.0 顶栏"更多"下拉菜单
  el('btn-more').addEventListener('click', e => { e.stopPropagation(); toggleMorePanel(); });
  el('more-switch').addEventListener('click', () => {
    if (el('lounge').classList.contains('hidden')) goLounge();
    else goWork();
  });
  el('more-handbook').addEventListener('click', () => { closeMorePanel(); openHandbook(); });
  el('more-rank').addEventListener('click', () => {
    closeMorePanel();
    const p = el('rank-panel');
    p.classList.remove('hidden');
    renderRankPanel();
  });
  el('more-reset').addEventListener('click', () => {
    if (confirm('确定清空星币与声望存档？此操作不可撤销。')) {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
      location.reload();
    }
  });
  // 点击页面其他区域关闭"更多"菜单和排行榜
  document.addEventListener('click', e => {
    if (!e.target.closest('#more-panel') && !e.target.closest('#btn-more')) closeMorePanel();
    if (!e.target.closest('#rank-panel') && !e.target.closest('#more-rank')) el('rank-panel').classList.add('hidden');
  });
  // 2.0 休息区功能卡片
  el('lounge').addEventListener('click', e => {
    const feat = e.target.closest('.lounge-feature');
    if (!feat) return;
    if (feat.dataset.feat === 'teach') openClass();
    else if (feat.dataset.feat === 'sing') openSing();
    else if (feat.dataset.feat === 'serve') openWaiter();
    else if (feat.dataset.feat === 'explore') openTreasure();
    else toast(FEATURE_LINES[feat.dataset.feat] || '敬请期待');
  });
  // 送盘：开始按钮
  el('waiter-start-btn').addEventListener('click', startWaiter);
  // 寻宝：重新布阵按钮
  el('tr-start-btn').addEventListener('click', newTreasureRound);
  // 驻唱音游：轨道点击判定
  el('sing-lanes').addEventListener('click', e => {
    const lane = e.target.closest('.sing-lane');
    if (!lane) return;
    hitLane(parseInt(lane.dataset.lane));
  });
  // 驻唱开始按钮
  el('sing-start-btn').addEventListener('click', startSingGame);

  // 开场剧情：点击屏幕任意处推进（打字中→跳过动画；否则→下一段；最后一段→关闭）
  el('story-overlay').addEventListener('click', storyClick);
  // 跳过全部对话：一键结束剧情直接开玩
  el('btn-skip-story').addEventListener('click', e => {
    e.stopPropagation();
    if (state.storyActive) endStory();
  });

  // 暂停营业（休息）：右上角按钮切换，遮罩点击恢复
  el('btn-pause').addEventListener('click', togglePause);
  el('pause-overlay').addEventListener('click', () => { if (state.paused) togglePause(); });
  // 缴租面板
  el('btn-rent').addEventListener('click', openRent);
  el('rent-overlay').addEventListener('click', e => { if (e.target.id === 'rent-overlay') closeRent(); });
  el('rent-overlay').querySelectorAll('.rent-amt-btn').forEach(btn => {
    btn.addEventListener('click', () => payRent(parseInt(btn.dataset.amt)));
  });

  // 点选排队顾客查看需求（中间排队区）
  el('queue-line').addEventListener('click', e => {
    const n = e.target.closest('[data-cust]');
    if (n) selectCustomer(+n.dataset.cust);
  });

  // 设置：音效开关
  el('toggle-sound').addEventListener('change', () => {
    state.soundOn = el('toggle-sound').checked;
    toast(state.soundOn ? '🔊 音效已开启' : '音效已关闭');
  });
  el('toggle-bgm').addEventListener('change', () => {
    state.bgmOn = el('toggle-bgm').checked;
    toggleBGM();
  });

  initDragScroll();
  initMotionShake();   // 鼠标快速晃动 / 手机摇一摇

  // 防缩放：iOS 手势缩放 / 双击缩放
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault());
  // 首次点击：初始化音频（浏览器安全策略要求用户手势）
  document.addEventListener('pointerdown', onFirstTap);

  // 主循环启动（剧情播完前 tick 不推进游戏）
  setInterval(() => tick(0.1), 100);
  renderAll();

  // 开场剧情：播完自动解锁游戏并迎来第一位顾客
  // （调试入口：地址栏加 ?skipstory=1 可跳过剧情直接开玩）
  if (/[?&]skipstory=1/.test(location.search)) beginGame();
  else startStory();
}

init();

/* 等比缩放适配：固定设计稿 750×375，按可视区等比缩放居中；竖屏时整体旋转 90°（不弹提示，玩家自行转手机） */
function fitRoot() {
  const root = el('game-root');
  if (!root) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  const portrait = vh > vw;   /* 宽高比判断方向（比 matchMedia 更稳） */
  const bw = 1150;   /* 固定设计基准：动态拉伸会破坏元素疏密，保持 1150×540 */
  let sc;
  if (portrait) sc = Math.min(vh / 1150, vw / 540);
  else sc = Math.min(vw / 1150, vh / 540);
  /* 精确像素居中：先算缩放后尺寸再算平移量（rotate 90° 时宽高互换），
     避免百分比 translate 与旋转组合的偏差导致画面整体偏左/偏上 */
  const w = bw * sc, h = 540 * sc;
  let tx, ty, rot = '';
  if (portrait) {
    /* 轻微不等比：横向 vw/540、纵向 vh/1150，两方向都精确铺满（差异约 2.6%，视觉无感） */
    const sx = vw / 540, sy = vh / 1150;
    root.style.transform = 'translate(' + vw.toFixed(2) + 'px, 0px) rotate(90deg) scale(' + sy.toFixed(4) + ', ' + sx.toFixed(4) + ')   /* 旋转后屏幕y=游戏x×scale_x → 纵向用 sy，横向用 sx */';
    const bgLayer2 = el('bg-layer');
    if (bgLayer2) bgLayer2.style.transform = 'none';   /* 背景保持原本横构图正立，不随游戏旋转 */
    window.__rotSign = 1;
    /* 滚动面板触控方向：旋转后游戏内纵向滚动对应屏幕横向手势 */
    const scrollersP = ['log-list', 'order-panel', 'shelf-grid', 'gf-grid', 'more-panel'];
    for (let i2 = 0; i2 < scrollersP.length; i2++) {
      const elmP = el(scrollersP[i2]);
      if (elmP) elmP.style.touchAction = 'pan-x';
    }
    return;
  } else {
    tx = vw - w;
    ty = 0;
  }
  root.style.transform = 'translate(' + tx.toFixed(2) + 'px, ' + ty.toFixed(2) + 'px)' + rot + ' scale(' + sc.toFixed(4) + ')';
  const bgLayer = el('bg-layer');
  if (bgLayer) bgLayer.style.transform = portrait ? 'rotate(90deg)' : 'none';   /* 背景层与游戏画面同方向 */
  /* 滚动面板触控方向：旋转后游戏内纵向滚动对应屏幕横向手势 */
  const scrollers = ['log-list', 'order-panel', 'shelf-grid', 'gf-grid', 'more-panel'];
  for (let i = 0; i < scrollers.length; i++) {
    const elm = el(scrollers[i]);
    if (elm) elm.style.touchAction = portrait ? 'pan-x' : 'pan-y';
  }
  window.__rotSign = portrait ? 1 : 0;   /* 旋转符号：拖拽/滚动按游戏内方向换算 */
}
window.addEventListener('resize', fitRoot);
window.addEventListener('orientationchange', fitRoot);
fitRoot();
/* 轮询兜底：容器标题栏伸缩等未派发 resize 的场景，每 600ms 校正一次 */
let lastVW = window.innerWidth, lastVH = window.innerHeight;
setInterval(function () {
  if (window.innerWidth !== lastVW || window.innerHeight !== lastVH) {
    lastVW = window.innerWidth; lastVH = window.innerHeight;
    fitRoot();
  }
}, 600);

/* Chrome 61 flex gap 行为检测（css-compatibility 规范） */
(function () {
  function supportsFlexGap() {
    var flex = document.createElement('div');
    flex.style.position = 'absolute';
    flex.style.visibility = 'hidden';
    flex.style.display = 'flex';
    flex.style.flexDirection = 'column';
    flex.style.rowGap = '1px';
    flex.appendChild(document.createElement('div'));
    flex.appendChild(document.createElement('div'));
    document.body.appendChild(flex);
    var supported = flex.scrollHeight === 1;
    flex.parentNode.removeChild(flex);
    return supported;
  }
  if (!supportsFlexGap()) document.documentElement.classList.add('no-flex-gap');
})();
