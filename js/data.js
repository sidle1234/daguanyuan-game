/**
 * Game data configuration
 */
const GAME_DATA = {
  characters: [
    { id: 'jia_baoyu', name: '贾宝玉', poem: '无故寻愁觅恨，有时似傻如狂', talent: '每关额外获得1条隐藏线索，答题容错次数+1', talentEffect: { extraLives: 1, hiddenClue: true } },
    { id: 'lin_daiyu', name: '林黛玉', poem: '堪怜咏絮才，玉带林中挂', talent: '诗词类题目积分翻倍，答错不扣除积分', talentEffect: { poetryDoubleScore: true, noScorePenalty: true } },
    { id: 'xue_baochai', name: '薛宝钗', poem: '可叹停机德，金簪雪里埋', talent: '每关额外增加1次答题机会，通关稳定性最高', talentEffect: { extraLives: 1 } },
    { id: 'wang_xifeng', name: '王熙凤', poem: '凡鸟偏从末世来，都知爱慕此生才', talent: '每关通关必额外掉落1个信物，收集速度提升', talentEffect: { extraItem: true } },
    { id: 'shi_xiangyun', name: '史湘云', poem: '襁褓中，父母叹双亡，英豪阔大宽宏量', talent: '常识类、趣味类题目自动判定答对', talentEffect: { autoCorrectCommon: true } },
    { id: 'jia_tanchun', name: '贾探春', poem: '才自清明志自高，生于末世运偏消', talent: '隐藏番外剧情提前解锁，可查看专属内容', talentEffect: { unlockBonus: true } },
    { id: 'miao_yu', name: '妙玉', poem: '欲洁何曾洁，云空未必空', talent: '稀有信物掉落概率大幅提升', talentEffect: { rareItemBoost: true } },
    { id: 'li_wan', name: '李纨', poem: '桃李春风结子完，到头谁似一盆兰', talent: '游戏积分获取速度全面加快', talentEffect: { scoreBoost: 1.5 } },
    { id: 'jia_yingchun', name: '贾迎春', poem: '子系中山狼，得志便猖狂', talent: '闯关失败后，复活等待时间直接减半', talentEffect: { reviveTimeHalf: true } },
    { id: 'jia_xichun', name: '贾惜春', poem: '可怜绣户侯门女，独卧青灯古佛旁', talent: '每关可免费查看1次题目答案提示', talentEffect: { freeHint: true } },
    { id: 'qin_keqing', name: '秦可卿', poem: '情天情海幻情身，情既相逢必主淫', talent: '全角色初始好感度额外+5点', talentEffect: { affinityBonus: 5 } },
    { id: 'qiao_jie', name: '巧姐', poem: '势败休云贵，家亡莫论亲', talent: '分享复活后，获得的奖励翻倍', talentEffect: { shareRewardDouble: true } },
    { id: 'xiang_ling', name: '香菱', poem: '根并荷花一茎香，平生遭际实堪伤', talent: '每关自动解锁1句原著经典诗词收藏', talentEffect: { autoPoem: true } }
  ],
  scenes: [
    {
      id: 'qinfang_ting', name: '沁芳亭', subtitle: '新手引导关',
      description: '你行至沁芳闸桥，落英铺满溪水，一名丫鬟正准备将满地落花扫入水中。',
      choices: [
        { text: '上前劝阻，叹落花飘零，不可随意糟践', reward: { item: 'hua_ban_jian', affinity: { lin_daiyu: 5 }, score: 100 } },
        { text: '默默转身，继续向园内深处前行', reward: { item: null, affinity: {}, score: 50 } }
      ],
      questions: [
        { text: '《红楼梦》的作者是？', options: ['施耐庵', '曹雪芹', '吴承恩'], answer: 1, category: 'common' },
        { text: '贾宝玉出生时，口中所含的器物是？', options: ['金锁', '通灵宝玉', '白玉佩'], answer: 1, category: 'common' },
        { text: '大观园最初修建的目的是？', options: ['元妃省亲', '赏花作诗', '家族家宴'], answer: 0, category: 'common' }
      ],
      itemDrop: 'hua_ban_jian'
    },
    {
      id: 'xiaoxiang_guan', name: '潇湘馆', subtitle: '林黛玉主线场景',
      description: '步入潇湘馆，翠竹遮映，清幽寂静，黛玉正倚窗独坐，望着诗稿神色清愁。',
      choices: [
        { text: '轻声上前，与她共读诗稿，细品文中意趣', reward: { item: 'shi_gao_jian', affinity: { lin_daiyu: 15 }, score: 150 } },
        { text: '轻放一瓶新开梅花，悄然退去，不扰她清静', reward: { item: 'mei_hua_jian', affinity: {}, score: 80 } }
      ],
      questions: [
        { text: '林黛玉在大观园的居所是？', options: ['蘅芜苑', '潇湘馆', '稻香村'], answer: 1, category: 'common' },
        { text: '"花谢花飞飞满天，红消香断有谁怜"出自哪篇作品？', options: ['《葬花吟》', '《芙蓉女儿诔》', '海棠诗'], answer: 0, category: 'poetry' },
        { text: '林黛玉的前世真身是？', options: ['绛珠仙草', '警幻仙子', '芙蓉花神'], answer: 0, category: 'common' }
      ],
      itemDrop: 'shi_gao_jian'
    },
    {
      id: 'yihong_yuan', name: '怡红院', subtitle: '贾宝玉主线场景',
      description: '来到怡红院，院内海棠盛放，丫鬟们笑语盈盈，屋内陈设雅致又不失富贵气。',
      choices: [
        { text: '与众人一同赏玩海棠，说笑闲谈，融入此间', reward: { item: 'hai_tang_jian', affinity: { jia_baoyu: 10 }, score: 100 } },
        { text: '安静翻看屋内书卷，不打扰众人，静坐观览', reward: { item: 'ping_an_pei', affinity: {}, score: 60 } }
      ],
      questions: [
        { text: '贾宝玉私下最喜爱阅读的书籍是？', options: ['四书五经', '《西厢记》', '《资治通鉴》'], answer: 1, category: 'common' },
        { text: '"怡红院"这个名字的题名者是？', options: ['贾政', '贾元春', '贾宝玉'], answer: 1, category: 'common' },
        { text: '贾宝玉身边最贴身的大丫鬟是？', options: ['袭人', '紫鹃', '雪雁'], answer: 0, category: 'common' }
      ],
      itemDrop: 'hai_tang_jian'
    },
    {
      id: 'hengwu_yuan', name: '蘅芜苑', subtitle: '薛宝钗主线场景',
      description: '进入蘅芜苑，遍植奇草异卉，香气清雅，屋内陈设素净简洁，全无富贵雕琢之气。',
      choices: [
        { text: '真心称赞屋舍清雅大方，气度从容沉稳', reward: { item: 'xiang_cao_jian', affinity: { xue_baochai: 15 }, score: 120 } },
        { text: '静坐一旁，饮茶观书，不多言语打扰', reward: { item: null, affinity: {}, score: 50 } }
      ],
      questions: [
        { text: '薛宝钗随身佩戴的器物是？', options: ['通灵宝玉', '金锁', '金麒麟'], answer: 1, category: 'common' },
        { text: '薛宝钗的诗作整体风格更偏向？', options: ['清丽伤感', '雍容浑厚', '洒脱豪放'], answer: 1, category: 'poetry' },
        { text: '"好风凭借力，送我上青云"是谁的诗句？', options: ['林黛玉', '薛宝钗', '史湘云'], answer: 1, category: 'poetry' }
      ],
      itemDrop: 'xiang_cao_jian'
    },
    {
      id: 'daoxiang_cun', name: '稻香村', subtitle: '李纨主线场景',
      description: '稻香村一派田园风光，茅舍菜畦，简朴安宁，宛如世外田园，无半分俗世喧嚣。',
      choices: [
        { text: '真心赞叹此处清静自在，最是养心宁神', reward: { item: 'dao_sui_jian', affinity: { li_wan: 10 }, score: 100 } },
        { text: '主动帮忙整理菜圃，体验田园闲趣', reward: { item: null, affinity: {}, score: 80 } }
      ],
      questions: [
        { text: '稻香村的主人是？', options: ['李纨', '贾探春', '贾惜春'], answer: 0, category: 'common' },
        { text: '李纨的儿子是？', options: ['贾兰', '贾蓉', '贾环'], answer: 0, category: 'common' },
        { text: '大观园中最朴素、最安静的院落是？', options: ['潇湘馆', '稻香村', '栊翠庵'], answer: 1, category: 'common' }
      ],
      itemDrop: 'dao_sui_jian'
    },
    {
      id: 'qiushuang_zhai', name: '秋爽斋', subtitle: '贾探春主线场景',
      description: '秋爽斋厅堂开阔爽朗，笔墨纸砚一应俱全，处处透着才气与英气，全无小儿女姿态。',
      choices: [
        { text: '与探春谈论诗书家事，敬佩她的才干与格局', reward: { item: 'bi_mo_jian', affinity: { jia_tanchun: 15 }, score: 120 } },
        { text: '静静欣赏屋内书画藏品，不语旁观', reward: { item: null, affinity: {}, score: 50 } }
      ],
      questions: [
        { text: '"才自清明志自高"形容的是哪位女子？', options: ['王熙凤', '贾探春', '史湘云'], answer: 1, category: 'common' },
        { text: '大观园中第一个发起诗社的人是？', options: ['林黛玉', '薛宝钗', '贾探春'], answer: 2, category: 'common' },
        { text: '贾探春在贾府中的身份是？', options: ['嫡女', '庶女', '寄养之女'], answer: 1, category: 'common' }
      ],
      itemDrop: 'bi_mo_jian'
    },
    {
      id: 'longcui_an', name: '栊翠庵', subtitle: '妙玉主线场景',
      description: '栊翠庵清静无尘，院中红梅盛放，禅房幽静，不染半点俗世尘埃。',
      choices: [
        { text: '轻声行礼，恪守规矩，不喧哗、不随意触碰器物', reward: { item: 'hong_mei_jian', affinity: { miao_yu: 15 }, score: 150 } },
        { text: '观赏院中红梅，随手折下一枝带走', reward: { item: 'ping_an_pei', affinity: {}, score: 30 } }
      ],
      questions: [
        { text: '栊翠庵的主人是？', options: ['智能', '妙玉', '贾惜春'], answer: 1, category: 'common' },
        { text: '妙玉最出众、最讲究的技艺是？', options: ['品茶煮水', '作诗绘画', '管家理事'], answer: 0, category: 'common' },
        { text: '大观园中最洁癖、最不容世俗沾染的人物是？', options: ['林黛玉', '薛宝钗', '妙玉'], answer: 2, category: 'common' }
      ],
      itemDrop: 'hong_mei_jian'
    },
    {
      id: 'daguan_lou', name: '大观楼', subtitle: '终极结局关',
      description: '行至大观楼，楼上清雅设宴，园中众人齐聚，诗酒风流，满园繁华尽收眼底，一梦将至终章。',
      choices: [
        { text: '入席同欢，共赏风月，记取此刻繁华光景', reward: { item: 'hong_lou_meng_ling', affinity: {}, score: 200, ending: 'prosperous' } },
        { text: '凭栏远望，静观满园景色，静思红楼一梦', reward: { item: 'hong_lou_meng_ling', affinity: {}, score: 200, ending: 'elegant' } }
      ],
      questions: [
        { text: '金陵十二钗共计多少人？', options: ['10', '12', '14'], answer: 1, category: 'common' },
        { text: '下列哪个不属于《红楼梦》的别名？', options: ['《石头记》', '《风月宝鉴》', '《金瓶梅》'], answer: 2, category: 'common' },
        { text: '大观园原著中的最终结局是？', options: ['永远繁华', '败落荒废', '转卖他人'], answer: 1, category: 'common' }
      ],
      itemDrop: 'hong_lou_meng_ling'
    }
  ],
  items: {
    hua_ban_jian: { name: '花瓣笺', rarity: 'normal' }, shi_gao_jian: { name: '诗稿笺', rarity: 'rare' },
    mei_hua_jian: { name: '梅花笺', rarity: 'normal' }, hai_tang_jian: { name: '海棠笺', rarity: 'normal' },
    xiang_cao_jian: { name: '香草笺', rarity: 'normal' }, dao_sui_jian: { name: '稻穗笺', rarity: 'normal' },
    bi_mo_jian: { name: '笔墨笺', rarity: 'normal' }, hong_mei_jian: { name: '红梅笺', rarity: 'rare' },
    jin_suo_pei: { name: '金锁佩', rarity: 'rare' }, tong_ling_yu: { name: '通灵玉', rarity: 'legendary' },
    jin_qi_lin: { name: '金麒麟', rarity: 'rare' }, tuan_shan: { name: '团扇', rarity: 'normal' },
    nian_zhu: { name: '念珠', rarity: 'rare' }, shu_xiang_pei: { name: '书香佩', rarity: 'normal' },
    ping_an_pei: { name: '平安佩', rarity: 'normal' }, hong_lou_meng_ling: { name: '红楼梦令', rarity: 'legendary' }
  },
  endings: {
    prosperous: { title: '繁华一梦', text: '大观园风月繁华，盛衰起落，终成千古一梦。书中悲欢离合、人情冷暖，皆留于你我心头。' },
    elegant: { title: '清雅寻芳', text: '不恋俗世繁华，不叹世事离合，只取园中一草一木、一诗一韵，自成风雅，不负此行。' },
    ultimate: { title: '红楼雅客', text: '遍游大观园，尽识红楼人。览尽园中风月，读遍书中悲欢，不负千古经典，不负此番寻梦之行。' }
  },
  posterTexts: ['一园风月，一梦红楼，我自寻芳而来', '大观园内皆过客，千古风流一书间', '花落花开终是梦，人间幸得读红楼']
};
if (typeof module !== 'undefined' && module.exports) { module.exports = { GAME_DATA }; }
