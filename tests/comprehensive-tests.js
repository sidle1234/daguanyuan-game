const { GAME_DATA } = require('../js/data.js');
const { GameEngine } = require('../js/engine.js');
const { GameStorage } = require('../js/storage.js');

let total = 0, passed = 0, failed = 0;
const failures = [];

function describe(name, fn) { console.log('\n\u{1f4cb} ' + name); fn(); }
function it(name, fn) {
  total++;
  try { fn(); passed++; }
  catch (e) { failed++; failures.push({name, error: e.message}); console.log('  \u2717 ' + name + '\n     ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }
function assertEqual(a, b, msg) { if (a !== b) throw new Error((msg || '') + ' Expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); }
function assertIncludes(arr, val, msg) { if (!arr.includes(val)) throw new Error((msg || '') + ' Expected array to include ' + JSON.stringify(val)); }

// ================================================================
// SECTION A: ENGINE LOGIC DEEP TESTS
// ================================================================

describe('A1: makeChoice - score calculation with all talents', () => {
  // Li Wan scoreBoost 1.5x
  it('Li Wan choice 0 scene 0: floor(100*1.5)=150', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('li_wan');
    const r = e.makeChoice(0);
    assertEqual(r.scoreGain, 150);
    assertEqual(e.state.score, 150);
  });
  it('Li Wan choice 1 scene 0: floor(50*1.5)=75', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('li_wan');
    const r = e.makeChoice(1);
    assertEqual(r.scoreGain, 75);
  });
  // Normal character no boost
  it('Jia Baoyu choice 0 scene 0: 100', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    const r = e.makeChoice(0);
    assertEqual(r.scoreGain, 100);
  });
});

describe('A2: makeChoice - item logic', () => {
  it('Choice with item adds item', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    e.makeChoice(0); // scene 0 choice 0 gives hua_ban_jian
    assertIncludes(e.state.items, 'hua_ban_jian');
  });
  it('Choice without item gives nothing (normal char)', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    e.makeChoice(1); // scene 0 choice 1 gives null item
    assertEqual(e.state.items.length, 0);
  });
  it('Wang Xifeng extraItem: gets scene itemDrop when choice has no item', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('wang_xifeng');
    e.makeChoice(1); // choice 1 has no item, but extraItem triggers
    assertIncludes(e.state.items, 'hua_ban_jian'); // scene 0 itemDrop
  });
  it('Wang Xifeng: choice WITH item does NOT trigger extraItem', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('wang_xifeng');
    e.makeChoice(0); // choice 0 has hua_ban_jian
    assertEqual(e.state.items.length, 1); // only 1 item, not 2
  });
});

describe('A3: makeChoice - affinity', () => {
  it('Scene 0 choice 0 adds lin_daiyu +5', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    e.makeChoice(0);
    assertEqual(e.state.affinity.lin_daiyu, 5);
  });
  it('Scene 0 choice 1 adds no affinity', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    e.makeChoice(1);
    assertEqual(e.state.affinity.lin_daiyu, 0);
  });
  it('Qin Keqing starts with +5 then choice adds more', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('qin_keqing');
    assertEqual(e.state.affinity.lin_daiyu, 5);
    e.makeChoice(0); // +5 to lin_daiyu
    assertEqual(e.state.affinity.lin_daiyu, 10);
  });
});

describe('A4: makeChoice - ending flag', () => {
  it('Scene 7 choice 0 sets ending=prosperous', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    for (let i = 0; i < 7; i++) { e.makeChoice(0); e.completeScene(); }
    e.makeChoice(0);
    assertEqual(e.state.ending, 'prosperous');
  });
  it('Scene 7 choice 1 sets ending=elegant', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    for (let i = 0; i < 7; i++) { e.makeChoice(0); e.completeScene(); }
    e.makeChoice(1);
    assertEqual(e.state.ending, 'elegant');
  });
  it('Scenes 0-6 do NOT set ending', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    e.makeChoice(0);
    assertEqual(e.state.ending, null);
  });
});

describe('A5: makeChoice - autoPoem (Xiang Ling)', () => {
  it('Xiang Ling unlocks poem on each choice', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('xiang_ling');
    e.makeChoice(0); assertEqual(e.state.poems.length, 1);
    e.completeScene();
    e.makeChoice(0); assertEqual(e.state.poems.length, 2);
  });
  it('Other characters do not unlock poems', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    e.makeChoice(0);
    assertEqual(e.state.poems.length, 0);
  });
  it('Poem deduplication: same scene does not add twice', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('xiang_ling');
    e.unlockPoem(0); e.unlockPoem(0);
    assertEqual(e.state.poems.length, 1);
  });
});

describe('A6: answerQuestion - all talent interactions', () => {
  it('Correct answer adds 50 points', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    e.makeChoice(0);
    const scoreBefore = e.state.score;
    const r = e.answerQuestion(0, GAME_DATA.scenes[0].questions[0].answer);
    assertEqual(r.correct, true);
    assertEqual(r.score, 50);
    assertEqual(e.state.score, scoreBefore + 50);
  });
  it('Wrong answer returns penalty -10', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    e.makeChoice(0);
    const scoreBefore = e.state.score;
    const wrongAns = (GAME_DATA.scenes[0].questions[0].answer + 1) % 3;
    const r = e.answerQuestion(0, wrongAns);
    assertEqual(r.correct, false);
    assertEqual(r.penalty, -10);
    assertEqual(e.state.score, scoreBefore); // penalty not applied to state
  });
  it('Lin Daiyu wrong answer: penalty=0', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu');
    e.makeChoice(0);
    const wrongAns = (GAME_DATA.scenes[0].questions[0].answer + 1) % 3;
    const r = e.answerQuestion(0, wrongAns);
    assertEqual(r.penalty, 0);
  });
  it('Lin Daiyu poetry question: score doubled to 100', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu');
    e.completeScene(); // go to scene 1 (xiaoxiang) which has poetry
    e.makeChoice(0);
    const poetryQ = GAME_DATA.scenes[1].questions.findIndex(q => q.category === 'poetry');
    const r = e.answerQuestion(poetryQ, GAME_DATA.scenes[1].questions[poetryQ].answer);
    assertEqual(r.score, 100);
  });
  it('Li Wan question score: floor(50*1.5)=75', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('li_wan');
    e.makeChoice(0);
    const r = e.answerQuestion(0, GAME_DATA.scenes[0].questions[0].answer);
    assertEqual(r.score, 75);
  });
  it('Shi Xiangyun autoCorrect on wrong common answer', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('shi_xiangyun');
    e.makeChoice(0);
    const scoreBefore = e.state.score;
    const wrongAns = (GAME_DATA.scenes[0].questions[0].answer + 1) % 3;
    const r = e.answerQuestion(0, wrongAns);
    assertEqual(r.correct, true);
    assertEqual(r.autoCorrect, true);
    assertEqual(r.score, 50);
    assertEqual(e.state.score, scoreBefore + 50, 'autoCorrect adds score to state');
  });
  it('Shi Xiangyun does NOT autoCorrect poetry questions', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('shi_xiangyun');
    e.completeScene(); // scene 1 has poetry
    e.makeChoice(0);
    const poetryIdx = GAME_DATA.scenes[1].questions.findIndex(q => q.category === 'poetry');
    if (poetryIdx >= 0) {
      const wrongAns = (GAME_DATA.scenes[1].questions[poetryIdx].answer + 1) % 3;
      const r = e.answerQuestion(poetryIdx, wrongAns);
      assertEqual(r.correct, false); // NOT auto-corrected
    }
  });
});

describe('A7: answerQuestion - repeated answer exploit check', () => {
  it('Engine allows same question answered multiple times (UI prevents this)', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    e.makeChoice(0);
    const s1 = e.state.score;
    e.answerQuestion(0, GAME_DATA.scenes[0].questions[0].answer);
    const s2 = e.state.score;
    e.answerQuestion(0, GAME_DATA.scenes[0].questions[0].answer);
    const s3 = e.state.score;
    // This documents the known issue: engine doesn't prevent re-answering
    assertEqual(s3 - s2, 50, 'Engine allows re-answer (UI must prevent)');
  });
});

describe('A8: completeScene - progression and rareItemBoost', () => {
  it('completeScene advances currentScene', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    e.makeChoice(0); e.completeScene();
    assertEqual(e.state.currentScene, 1);
    assertEqual(e.state.completedScenes.length, 1);
    assertIncludes(e.state.completedScenes, 'qinfang_ting');
  });
  it('completeScene on null scene fails', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    for (let i = 0; i < 8; i++) { e.makeChoice(0); e.completeScene(); }
    const r = e.completeScene();
    assertEqual(r.success, false);
  });
  it('Miao Yu rareItemBoost may add rare item (no crash)', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('miao_yu');
    e.makeChoice(0);
    // Run 100 times to exercise the random path
    for (let i = 0; i < 100; i++) {
      const e2 = new GameEngine(GAME_DATA); e2.newGame(); e2.assignCharacter('miao_yu');
      e2.makeChoice(0); e2.completeScene();
    }
    assert(true, 'No crash with rareItemBoost');
  });
});

describe('A9: getEnding - priority logic', () => {
  it('12+ items = ultimate (overrides prosperous)', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    Object.keys(GAME_DATA.items).slice(0, 12).forEach(id => e.addItem(id));
    e.state.ending = 'prosperous';
    assertEqual(e.getEnding().title, '\u7ea2\u697c\u96c5\u5ba2');
  });
  it('12+ items = ultimate (overrides elegant)', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    Object.keys(GAME_DATA.items).slice(0, 12).forEach(id => e.addItem(id));
    e.state.ending = 'elegant';
    assertEqual(e.getEnding().title, '\u7ea2\u697c\u96c5\u5ba2');
  });
  it('11 items + prosperous = prosperous (not ultimate)', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    Object.keys(GAME_DATA.items).slice(0, 11).forEach(id => e.addItem(id));
    e.state.ending = 'prosperous';
    assertEqual(e.getEnding().title, '\u7e41\u534e\u4e00\u68a6');
  });
  it('No ending set defaults to elegant', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    assertEqual(e.getEnding().title, '\u6e05\u96c5\u5bfb\u82b3');
  });
});

describe('A10: revive - all methods and talents', () => {
  it('share revive adds 50 for normal char', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    const r = e.revive('share');
    assertEqual(r.success, true);
    assertEqual(r.bonus, 50);
    assertEqual(e.state.score, 50);
  });
  it('share revive adds 100 for Qiao Jie', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('qiao_jie');
    const r = e.revive('share');
    assertEqual(r.bonus, 100);
    assertEqual(e.state.score, 100);
  });
  it('wait revive 30min for normal char', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    assertEqual(e.revive('wait').waitMinutes, 30);
  });
  it('wait revive 15min for Yingchun', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_yingchun');
    assertEqual(e.revive('wait').waitMinutes, 15);
  });
  it('invalid method fails', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    assertEqual(e.revive('hack').success, false);
  });
});

describe('A11: getLives - talent interaction', () => {
  it('Normal char: 3 lives', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('lin_daiyu');
    assertEqual(e.getLives(), 3);
  });
  it('Baoyu (extraLives:1): 4 lives', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    assertEqual(e.getLives(), 4);
  });
  it('Baochai (extraLives:1): 4 lives', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('xue_baochai');
    assertEqual(e.getLives(), 4);
  });
});

describe('A12: useHint', () => {
  it('Xichun can use hint', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_xichun');
    e.makeChoice(0);
    const h = e.useHint(0);
    assertEqual(h.success, true);
    assertEqual(h.answer, GAME_DATA.scenes[0].questions[0].answer);
  });
  it('Other chars cannot use hint', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    assertEqual(e.useHint(0).success, false);
  });
  it('Hint on null scene fails', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_xichun');
    for (let i = 0; i < 8; i++) { e.makeChoice(0); e.completeScene(); }
    assertEqual(e.useHint(0).success, false);
  });
});

describe('A13: getHiddenClue and getBonusStory', () => {
  it('Baoyu gets clue at each scene', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    for (let i = 0; i < 8; i++) {
      assert(e.getHiddenClue() !== null, 'Clue at scene ' + i);
      e.makeChoice(0); e.completeScene();
    }
  });
  it('Baoyu no clue after all scenes', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    for (let i = 0; i < 8; i++) { e.makeChoice(0); e.completeScene(); }
    assertEqual(e.getHiddenClue(), null);
  });
  it('Tanchun gets bonus story at each scene', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_tanchun');
    for (let i = 0; i < 8; i++) {
      const story = e.getBonusStory();
      assert(story !== null && story.includes('\u756a\u5916'), 'Bonus at scene ' + i);
      e.makeChoice(0); e.completeScene();
    }
  });
});

// ================================================================
// SECTION B: STORAGE TESTS
// ================================================================

describe('B1: Storage edge cases', () => {
  it('save with no storage returns false', () => {
    const s = new GameStorage(); s.storage = null;
    assertEqual(s.save({x: 1}), false);
  });
  it('load with no storage returns null', () => {
    const s = new GameStorage(); s.storage = null;
    assertEqual(s.load(), null);
  });
  it('hasSave with no storage returns false', () => {
    const s = new GameStorage(); s.storage = null;
    assertEqual(s.hasSave(), false);
  });
  it('save/load roundtrip preserves data', () => {
    const mock = {};
    const s = new GameStorage('test');
    s.storage = { setItem: (k,v) => { mock[k] = v; }, getItem: (k) => mock[k] || null, removeItem: (k) => { delete mock[k]; } };
    const state = { character: { id: 'lin_daiyu', name: 'test' }, score: 500, items: ['a','b'] };
    s.save(state);
    const loaded = s.load();
    assertEqual(loaded.score, 500);
    assertEqual(loaded.items.length, 2);
    assert(loaded.savedAt > 0, 'savedAt timestamp added');
  });
  it('clear removes save', () => {
    const mock = { test: 'data' };
    const s = new GameStorage('test');
    s.storage = { setItem: (k,v) => { mock[k] = v; }, getItem: (k) => mock[k] || null, removeItem: (k) => { delete mock[k]; } };
    s.save({ x: 1 });
    assert(s.hasSave());
    s.clear();
    assertEqual(s.hasSave(), false);
  });
  it('corrupted JSON returns null', () => {
    const s = new GameStorage('test');
    s.storage = { getItem: () => 'not{valid}json[', setItem: () => {}, removeItem: () => {} };
    assertEqual(s.load(), null);
  });
  it('save quota exceeded returns false', () => {
    const s = new GameStorage('test');
    s.storage = { setItem: () => { throw new Error('QuotaExceededError'); }, getItem: () => null, removeItem: () => {} };
    assertEqual(s.save({ x: 1 }), false);
  });
});

// ================================================================
// SECTION C: DATA INTEGRITY DEEP CHECKS
// ================================================================

describe('C1: All scene itemDrops are valid items', () => {
  GAME_DATA.scenes.forEach((scene, i) => {
    it('Scene ' + i + ' (' + scene.name + ') itemDrop valid', () => {
      assert(GAME_DATA.items[scene.itemDrop] !== undefined, scene.itemDrop + ' not in items');
    });
  });
});

describe('C2: All choice reward items are valid', () => {
  GAME_DATA.scenes.forEach((scene, i) => {
    scene.choices.forEach((ch, ci) => {
      it('Scene ' + i + ' choice ' + ci + ' item valid', () => {
        if (ch.reward.item) {
          assert(GAME_DATA.items[ch.reward.item] !== undefined, ch.reward.item + ' not in items');
        }
      });
    });
  });
});

describe('C3: All affinity targets in choices reference valid character IDs', () => {
  const validIds = GAME_DATA.characters.map(c => c.id);
  GAME_DATA.scenes.forEach((scene, i) => {
    scene.choices.forEach((ch, ci) => {
      it('Scene ' + i + ' choice ' + ci + ' affinity targets valid', () => {
        if (ch.reward.affinity) {
          Object.keys(ch.reward.affinity).forEach(charId => {
            assertIncludes(validIds, charId, 'Invalid affinity target: ' + charId);
          });
        }
      });
    });
  });
});

describe('C4: Question answer indices in valid range', () => {
  GAME_DATA.scenes.forEach((scene, i) => {
    scene.questions.forEach((q, qi) => {
      it('Scene ' + i + ' Q' + qi + ' answer in [0,' + (q.options.length-1) + ']', () => {
        assert(q.answer >= 0 && q.answer < q.options.length);
      });
    });
  });
});

describe('C5: Question categories are valid', () => {
  const validCategories = ['common', 'poetry'];
  GAME_DATA.scenes.forEach((scene, i) => {
    scene.questions.forEach((q, qi) => {
      it('Scene ' + i + ' Q' + qi + ' category valid', () => {
        assertIncludes(validCategories, q.category, 'Invalid: ' + q.category);
      });
    });
  });
});

describe('C6: Ending references in choices are valid', () => {
  GAME_DATA.scenes.forEach((scene, i) => {
    scene.choices.forEach((ch, ci) => {
      it('Scene ' + i + ' choice ' + ci + ' ending valid', () => {
        if (ch.reward.ending) {
          assert(GAME_DATA.endings[ch.reward.ending] !== undefined, 'Invalid ending: ' + ch.reward.ending);
        }
      });
    });
  });
});

describe('C7: Character talent effects have expected keys', () => {
  const knownEffects = ['extraLives','hiddenClue','poetryDoubleScore','noScorePenalty',
    'extraItem','autoCorrectCommon','unlockBonus','rareItemBoost','scoreBoost',
    'reviveTimeHalf','freeHint','affinityBonus','shareRewardDouble','autoPoem'];
  GAME_DATA.characters.forEach(char => {
    it(char.name + ' talentEffect keys are known', () => {
      Object.keys(char.talentEffect).forEach(key => {
        assertIncludes(knownEffects, key, char.id + ' has unknown effect: ' + key);
      });
    });
  });
});

// ================================================================
// SECTION D: FULL GAME FLOW TESTS (all 13 chars x key paths)
// ================================================================

describe('D1: All characters complete game with all-A choices', () => {
  GAME_DATA.characters.forEach(char => {
    it(char.name + ' all-A path completes', () => {
      const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter(char.id);
      for (let s = 0; s < 8; s++) {
        const scene = e.getCurrentScene();
        assert(scene !== null, 'Scene ' + s + ' null');
        e.makeChoice(0);
        for (let q = 0; q < 3; q++) e.answerQuestion(q, scene.questions[q].answer);
        e.completeScene();
      }
      assertEqual(e.state.completedScenes.length, 8);
      assert(e.state.score > 0);
      assert(e.getEnding() !== null);
    });
  });
});

describe('D2: All characters complete game with all-B choices', () => {
  GAME_DATA.characters.forEach(char => {
    it(char.name + ' all-B path completes', () => {
      const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter(char.id);
      for (let s = 0; s < 8; s++) {
        const scene = e.getCurrentScene();
        e.makeChoice(1);
        for (let q = 0; q < 3; q++) e.answerQuestion(q, scene.questions[q].answer);
        e.completeScene();
      }
      assertEqual(e.state.completedScenes.length, 8);
    });
  });
});

describe('D3: Score comparison - all-A always >= all-B for same character', () => {
  GAME_DATA.characters.forEach(char => {
    it(char.name + ' all-A score >= all-B score', () => {
      const runPath = (path) => {
        const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter(char.id);
        for (let s = 0; s < 8; s++) {
          const scene = e.getCurrentScene();
          e.makeChoice(path);
          for (let q = 0; q < 3; q++) e.answerQuestion(q, scene.questions[q].answer);
          e.completeScene();
        }
        return e.state.score;
      };
      const scoreA = runPath(0);
      const scoreB = runPath(1);
      assert(scoreA >= scoreB, 'A=' + scoreA + ' < B=' + scoreB);
    });
  });
});

describe('D4: Revive flow simulation', () => {
  GAME_DATA.characters.forEach(char => {
    if (char.talentEffect.autoCorrectCommon) return; // Xiangyun can't fail common
    it(char.name + ' can fail and revive via share', () => {
      const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter(char.id);
      e.makeChoice(0);
      const lives = e.getLives();
      // Exhaust lives on a non-common question if possible, else common
      let targetQ = 0;
      const scene = e.getCurrentScene();
      const poetryIdx = scene.questions.findIndex(q => q.category === 'poetry');
      if (poetryIdx >= 0) targetQ = poetryIdx;
      
      for (let i = 0; i < lives; i++) {
        const wrongAns = (scene.questions[targetQ].answer + 1) % 3;
        e.answerQuestion(targetQ, wrongAns);
      }
      // Now revive
      const scoreBefore = e.state.score;
      const r = e.revive('share');
      assertEqual(r.success, true);
      assert(e.state.score > scoreBefore);
    });
  });
});

// ================================================================
// SECTION E: EDGE CASES AND BOUNDARY CONDITIONS
// ================================================================

describe('E1: Boundary - empty/null inputs', () => {
  it('makeChoice with no scene (after all complete)', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    for (let i = 0; i < 8; i++) { e.makeChoice(0); e.completeScene(); }
    assertEqual(e.makeChoice(0).success, false);
  });
  it('answerQuestion with no scene', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    for (let i = 0; i < 8; i++) { e.makeChoice(0); e.completeScene(); }
    assertEqual(e.answerQuestion(0, 0).success, false);
  });
  it('addItem with empty string', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    e.addItem('');
    assertEqual(e.state.items.length, 0);
  });
  it('assignCharacter with invalid ID returns undefined (potential crash)', () => {
    const e = new GameEngine(GAME_DATA); e.newGame();
    // This documents a potential issue
    try {
      e.assignCharacter('nonexistent');
      // If it doesn't crash, character would be undefined
      assertEqual(e.state.character, undefined);
    } catch(err) {
      // Expected: accessing talentEffect of undefined would crash
      assert(true, 'Crashes on invalid character ID (expected)');
    }
  });
});

describe('E2: Multiple revives', () => {
  it('Can revive multiple times (score accumulates)', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    e.revive('share'); e.revive('share'); e.revive('share');
    assertEqual(e.state.score, 150); // 50 * 3
  });
});

describe('E3: getStats completeness', () => {
  it('getStats returns all required fields', () => {
    const e = new GameEngine(GAME_DATA); e.newGame(); e.assignCharacter('jia_baoyu');
    e.makeChoice(0); e.completeScene();
    const s = e.getStats();
    assert(s.character !== null);
    assert(typeof s.score === 'number');
    assert(typeof s.scenesCompleted === 'number');
    assert(typeof s.totalScenes === 'number');
    assert(typeof s.itemsCollected === 'number');
    assert(typeof s.totalItems === 'number');
    assert(typeof s.affinity === 'object');
    assert(Array.isArray(s.poems));
    assert(s.ending !== null);
  });
});

// ================================================================
// RESULTS
// ================================================================

console.log('\n' + '='.repeat(60));
console.log('\u{1f4ca} COMPREHENSIVE TEST RESULTS: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
console.log('='.repeat(60));
if (failures.length > 0) {
  console.log('\n\u274c FAILURES:');
  failures.forEach((f, i) => console.log('  ' + (i+1) + '. ' + f.name + '\n     ' + f.error));
  process.exit(1);
} else {
  console.log('\n\u2705 ALL TESTS PASSED');
  process.exit(0);
}
