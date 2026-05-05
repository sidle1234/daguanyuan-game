const { GAME_DATA } = require('../js/data.js');
const { GameEngine } = require('../js/engine.js');
const { GameStorage } = require('../js/storage.js');

let total = 0, passed = 0, failed = 0;
const failures = [];

function describe(name, fn) { console.log('\n?? ' + name); fn(); }
function it(name, fn) {
  total++;
  try { fn(); passed++; console.log('  ? ' + name); }
  catch (e) { failed++; failures.push({name, error: e.message}); console.log('  ? ' + name + '\n     ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }
function assertEqual(a, b, msg) { if (a !== b) throw new Error(msg || 'Expected ' + b + ', got ' + a); }

// === Data Integrity ===
describe('数据完整性', () => {
  it('13个角色', () => assertEqual(GAME_DATA.characters.length, 13));
  it('8个场景', () => assertEqual(GAME_DATA.scenes.length, 8));
  it('16种信物', () => assertEqual(Object.keys(GAME_DATA.items).length, 16));
  it('3种结局', () => assertEqual(Object.keys(GAME_DATA.endings).length, 3));
  it('每场景3题', () => { GAME_DATA.scenes.forEach(s => assertEqual(s.questions.length, 3, s.name)); });
  it('每场景2选项', () => { GAME_DATA.scenes.forEach(s => assertEqual(s.choices.length, 2, s.name)); });
  it('答案索引有效', () => { GAME_DATA.scenes.forEach(s => s.questions.forEach((q,i) => assert(q.answer >= 0 && q.answer < q.options.length, s.name+' Q'+(i+1)))); });
  it('角色天赋完整', () => { GAME_DATA.characters.forEach(c => assert(c.talentEffect && c.name && c.poem && c.talent, c.id)); });
  it('信物引用有效', () => { GAME_DATA.scenes.forEach(s => { if(s.itemDrop) assert(GAME_DATA.items[s.itemDrop], s.name+' drop:'+s.itemDrop); s.choices.forEach(ch => { if(ch.reward.item) assert(GAME_DATA.items[ch.reward.item], s.name+' choice item:'+ch.reward.item); }); }); });
});

// === Engine Basics ===
describe('引擎基础', () => {
  it('创建新游戏', () => { const e = new GameEngine(GAME_DATA); const s = e.newGame(); assertEqual(s.currentScene, 0); assertEqual(s.score, 0); });
  it('加载存档', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu'); const s = JSON.parse(JSON.stringify(e.state)); s.score = 999; const e2 = new GameEngine(GAME_DATA); e2.loadState(s); assertEqual(e2.state.score, 999); });
  it('获取当前场景', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu'); assertEqual(e.getCurrentScene().id, 'qinfang_ting'); });
  it('通关进入下一场景', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu'); e.completeScene(); assertEqual(e.getCurrentScene().id, 'xiaoxiang_guan'); });
  it('全通关后无场景', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu'); for(let i=0;i<8;i++) e.completeScene(); assertEqual(e.getCurrentScene(), null); });
});

// === Talent Tests (each character) ===
describe('贾宝玉 - 额外容错+隐藏线索', () => {
  it('生命4', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu'); assertEqual(e.getLives(), 4); });
  it('有隐藏线索', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu'); assert(e.getHiddenClue() !== null); });
});

describe('林黛玉 - 诗词翻倍+答错不扣分', () => {
  it('诗词题100分', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu'); e.completeScene(); const pq = e.getCurrentScene().questions.find(q=>q.category==='poetry'); assertEqual(e.calculateQuestionScore(pq), 100); });
  it('答错penalty=0', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu'); const r = e.answerQuestion(0, 2); assertEqual(r.penalty, 0); });
});

describe('薛宝钗 - 额外答题机会', () => {
  it('生命4', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('xue_baochai'); assertEqual(e.getLives(), 4); });
});

describe('王熙凤 - 额外信物', () => {
  it('选B也得信物', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('wang_xifeng'); e.makeChoice(1); assert(e.state.items.length > 0); });
});

describe('史湘云 - 常识自动答对', () => {
  it('答错common自动对', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('shi_xiangyun'); const r = e.answerQuestion(0, 0); assertEqual(r.correct, true); assertEqual(r.autoCorrect, true); });
});

describe('贾探春 - 番外剧情', () => {
  it('有番外', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_tanchun'); assert(e.getBonusStory() !== null); });
  it('非探春无番外', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu'); assertEqual(e.getBonusStory(), null); });
});

describe('妙玉 - 稀有信物提升', () => {
  it('天赋设置正确', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('miao_yu'); assertEqual(e.state.character.talentEffect.rareItemBoost, true); });
});

describe('李纨 - 积分加速', () => {
  it('选A得150分(100*1.5)', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('li_wan'); e.makeChoice(0); assertEqual(e.state.score, 150); });
  it('答题75分(50*1.5)', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('li_wan'); assertEqual(e.calculateQuestionScore({category:'common'}), 75); });
});

describe('贾迎春 - 复活减半', () => {
  it('等待15分钟', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_yingchun'); assertEqual(e.revive('wait').waitMinutes, 15); });
  it('其他角色30分钟', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu'); assertEqual(e.revive('wait').waitMinutes, 30); });
});

describe('贾惜春 - 免费提示', () => {
  it('可用提示', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_xichun'); const h = e.useHint(0); assertEqual(h.success, true); assertEqual(h.answer, 1); });
  it('非惜春不可用', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu'); assertEqual(e.useHint(0).success, false); });
});

describe('秦可卿 - 好感度+5', () => {
  it('全角色好感5', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('qin_keqing'); Object.values(e.state.affinity).forEach(v => assertEqual(v, 5)); });
  it('其他角色好感0', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu'); Object.values(e.state.affinity).forEach(v => assertEqual(v, 0)); });
});

describe('巧姐 - 分享翻倍', () => {
  it('分享得100', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('qiao_jie'); e.revive('share'); assertEqual(e.state.score, 100); });
  it('其他角色得50', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu'); e.revive('share'); assertEqual(e.state.score, 50); });
});

describe('香菱 - 自动诗词', () => {
  it('选择后解锁诗词', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('xiang_ling'); e.makeChoice(0); assert(e.state.poems.length > 0); });
  it('其他角色无诗词', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu'); e.makeChoice(0); assertEqual(e.state.poems.length, 0); });
});

// === Full Path: All correct for each character ===
describe('全角色全正确通关', () => {
  GAME_DATA.characters.forEach(character => {
    it(character.name + ' 全正确通关', () => {
      const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter(character.id);
      for (let si = 0; si < 8; si++) {
        const scene = e.getCurrentScene(); assert(scene !== null, '场景'+si+'为null');
        e.makeChoice(0);
        for (let qi = 0; qi < scene.questions.length; qi++) {
          const r = e.answerQuestion(qi, scene.questions[qi].answer);
          assert(r.correct === true, character.name+' '+scene.name+' Q'+(qi+1)+' failed');
        }
        e.completeScene();
      }
      assertEqual(e.state.completedScenes.length, 8);
      assert(e.getEnding() !== null);
    });
  });
});

// === Full Path: All wrong + revive ===
describe('全角色答错复活', () => {
  GAME_DATA.characters.forEach(character => {
    it(character.name + ' 答错复活', () => {
      const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter(character.id);
      e.makeChoice(0);
      const lives = e.getLives();
      for (let i = 0; i < lives + 5; i++) {
        const wrongAns = (e.getCurrentScene().questions[0].answer + 1) % 3;
        const r = e.answerQuestion(0, wrongAns);
        if (character.id === 'shi_xiangyun' && e.getCurrentScene().questions[0].category === 'common') break;
      }
      assertEqual(e.revive('share').success, true);
    });
  });
});

// === Choice B path ===
describe('选项B路径', () => {
  it('全场景选B通关', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    for (let si = 0; si < 8; si++) {
      const scene = e.getCurrentScene();
      assertEqual(e.makeChoice(1).success, true);
      for (let qi = 0; qi < scene.questions.length; qi++) e.answerQuestion(qi, scene.questions[qi].answer);
      e.completeScene();
    }
    assertEqual(e.state.completedScenes.length, 8);
  });
});

// === Endings ===
describe('结局系统', () => {
  it('选A→繁华一梦', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu');
    for(let i=0;i<7;i++){e.makeChoice(0);e.completeScene();}
    e.makeChoice(0); assertEqual(e.getEnding().title, '繁华一梦');
  });
  it('选B→清雅寻芳', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu');
    for(let i=0;i<7;i++){e.makeChoice(0);e.completeScene();}
    e.makeChoice(1); assertEqual(e.getEnding().title, '清雅寻芳');
  });
  it('12+信物→红楼雅客', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('wang_xifeng');
    Object.keys(GAME_DATA.items).slice(0,12).forEach(id => e.addItem(id));
    e.makeChoice(0); assertEqual(e.getEnding().title, '红楼雅客');
  });
});

// === Items ===
describe('信物系统', () => {
  it('不重复添加', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu'); e.addItem('hua_ban_jian'); e.addItem('hua_ban_jian'); assertEqual(e.state.items.length, 1); });
  it('null不添加', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu'); e.addItem(null); assertEqual(e.state.items.length, 0); });
});

// === Affinity ===
describe('好感度', () => {
  it('选A加好感', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu'); e.makeChoice(0); assertEqual(e.state.affinity.lin_daiyu, 5); });
  it('选B不加好感', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu'); e.makeChoice(1); assertEqual(e.state.affinity.lin_daiyu, 0); });
});

// === Storage ===
describe('存储系统', () => {
  it('无storage返回false', () => { const s = new GameStorage(); s.storage = null; assertEqual(s.save({x:1}), false); });
  it('无storage返回null', () => { const s = new GameStorage(); s.storage = null; assertEqual(s.load(), null); });
  it('模拟存取', () => {
    const mock = {}; const s = new GameStorage('k');
    s.storage = { setItem:(k,v)=>{mock[k]=v;}, getItem:(k)=>mock[k]||null, removeItem:(k)=>{delete mock[k];} };
    s.save({character:'lin_daiyu',score:100});
    const l = s.load(); assertEqual(l.character, 'lin_daiyu'); assertEqual(l.score, 100);
  });
});

// === Edge Cases ===
describe('边界情况', () => {
  it('无效选择', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu'); assertEqual(e.makeChoice(5).success, false); });
  it('负数选择', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu'); assertEqual(e.makeChoice(-1).success, false); });
  it('无效题目', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu'); assertEqual(e.answerQuestion(10, 0).success, false); });
  it('无效复活', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu'); assertEqual(e.revive('invalid').success, false); });
  it('随机角色有效', () => { const e = new GameEngine(GAME_DATA); e.newGame(); const c = e.assignCharacter(); assert(GAME_DATA.characters.map(x=>x.id).includes(c.id)); });
  it('getStats完整', () => { const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu'); e.makeChoice(0); e.completeScene(); const s = e.getStats(); assert(s.character!==null); assert(s.score>0); assertEqual(s.scenesCompleted,1); });
});

// === Results ===
console.log('\n' + '='.repeat(60));
console.log('?? 测试结果: ' + passed + '/' + total + ' 通过, ' + failed + ' 失败');
console.log('='.repeat(60));
if (failures.length > 0) { console.log('\n? 失败:'); failures.forEach((f,i) => console.log('  '+(i+1)+'. '+f.name+'\n     '+f.error)); process.exit(1); }
else { console.log('\n?? 所有测试通过！'); process.exit(0); }
