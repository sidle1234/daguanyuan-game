/**
 * Comprehensive combinatorial tests for Daguanyuan Game
 * Tests every character ¡Á every choice permutation through all 8 scenes
 * 13 characters ¡Á 256 choice paths (2^8) = 3,328 full game simulations
 * Plus: talent effect verification, edge cases, answer permutations
 */

const { GAME_DATA } = require('../js/data.js');
const { GameEngine } = require('../js/engine.js');

let passed = 0, failed = 0, errors = [];

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; errors.push(msg); }
}

function assertEqual(actual, expected, msg) {
  if (actual === expected) { passed++; }
  else { failed++; errors.push(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
}

// ============================================================
// SECTION 1: Full game simulation for every character ¡Á choice path
// ============================================================

function simulateFullGame(characterId, choicePath) {
  const engine = new GameEngine(GAME_DATA);
  engine.newGame();
  engine.assignCharacter(characterId);

  const char = engine.state.character;
  assert(char.id === characterId, `Character assignment: ${characterId}`);

  // Verify initial state
  assert(engine.state.score === 0, `Initial score 0 for ${characterId}`);
  assert(engine.state.currentScene === 0, `Initial scene 0 for ${characterId}`);
  assert(engine.state.items.length === 0, `Initial items empty for ${characterId}`);

  // Qin Keqing affinity bonus check
  if (characterId === 'qin_keqing') {
    const allFive = Object.values(engine.state.affinity).every(v => v === 5);
    assert(allFive, `qin_keqing initial affinity all +5`);
  }

  let totalScore = 0;
  let expectedItems = [];

  for (let sceneIdx = 0; sceneIdx < 8; sceneIdx++) {
    const scene = engine.getCurrentScene();
    assert(scene !== null, `Scene ${sceneIdx} exists for ${characterId} path ${choicePath}`);
    if (!scene) break;

    // Make choice (0 or 1 based on bit in choicePath)
    const choiceIdx = (choicePath >> sceneIdx) & 1;
    const choice = scene.choices[choiceIdx];
    const reward = choice.reward;

    // Calculate expected score gain
    let expectedScoreGain = reward.score;
    if (char.talentEffect.scoreBoost) {
      expectedScoreGain = Math.floor(expectedScoreGain * char.talentEffect.scoreBoost);
    }

    const result = engine.makeChoice(choiceIdx);
    assert(result.success, `Choice ${choiceIdx} in scene ${sceneIdx} succeeds`);
    assertEqual(result.scoreGain, expectedScoreGain, `Score gain scene ${sceneIdx} choice ${choiceIdx}`);

    totalScore += expectedScoreGain;

    // Track items
    if (reward.item && !expectedItems.includes(reward.item)) {
      expectedItems.push(reward.item);
    }
    // Wang Xifeng extra item when choice gives no item
    if (char.talentEffect.extraItem && !reward.item) {
      if (!expectedItems.includes(scene.itemDrop)) {
        expectedItems.push(scene.itemDrop);
      }
    }

    // Answer all questions correctly
    for (let qi = 0; qi < scene.questions.length; qi++) {
      const q = scene.questions[qi];
      const correctAnswer = q.answer;
      const qResult = engine.answerQuestion(qi, correctAnswer);
      assert(qResult.correct, `Q${qi} correct in scene ${sceneIdx}`);

      let expectedQScore = 50;
      if (q.category === 'poetry' && char.talentEffect.poetryDoubleScore) expectedQScore *= 2;
      if (char.talentEffect.scoreBoost) expectedQScore = Math.floor(expectedQScore * char.talentEffect.scoreBoost);
      assertEqual(qResult.score, expectedQScore, `Q score scene ${sceneIdx} q ${qi}`);
      totalScore += expectedQScore;
    }

    // Complete scene
    const compResult = engine.completeScene();
    assert(compResult.success, `Scene ${sceneIdx} complete`);

    // Xiang Ling poem check
    if (char.talentEffect.autoPoem) {
      assert(engine.state.poems.length >= sceneIdx + 1, `autoPoem unlocked at scene ${sceneIdx}`);
    }
  }

  // Verify final score
  assertEqual(engine.state.score, totalScore, `Final score for ${characterId} path ${choicePath}`);

  // Verify ending
  const ending = engine.getEnding();
  assert(ending !== null && ending !== undefined, `Ending exists for ${characterId} path ${choicePath}`);

  if (engine.state.items.length >= 12) {
    assertEqual(ending.title, '\u7ea2\u697c\u96c5\u5ba2', `Ultimate ending when 12+ items`);
  } else if (engine.state.ending === 'prosperous') {
    assertEqual(ending.title, '\u7e41\u534e\u4e00\u68a6', `Prosperous ending`);
  } else {
    assertEqual(ending.title, '\u6e05\u96c5\u5bfb\u82b3', `Elegant ending`);
  }

  // Verify all scenes completed
  assertEqual(engine.state.completedScenes.length, 8, `All 8 scenes completed`);
  assertEqual(engine.state.currentScene, 8, `currentScene is 8 after completion`);

  return { score: totalScore, items: engine.state.items, ending };
}

console.log('=== SECTION 1: Full Game Simulations (13 chars x 256 paths) ===');
const characters = GAME_DATA.characters.map(c => c.id);
let simCount = 0;

for (const charId of characters) {
  for (let path = 0; path < 256; path++) {
    simulateFullGame(charId, path);
    simCount++;
  }
}
console.log(`  Simulated ${simCount} full games (${characters.length} chars x 256 paths)`);

// ============================================================
// SECTION 2: Talent effect verification for each character
// ============================================================

console.log('\n=== SECTION 2: Talent Effect Verification ===');

// 2.1 Jia Baoyu - extraLives + hiddenClue
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('jia_baoyu');
  assertEqual(e.getLives(), 4, 'Baoyu gets 4 lives (3+1)');
  const clue = e.getHiddenClue();
  assert(clue !== null, 'Baoyu gets hidden clue');
})();

// 2.2 Lin Daiyu - poetryDoubleScore + noScorePenalty
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('lin_daiyu');
  assertEqual(e.getLives(), 3, 'Daiyu gets 3 lives');
  // Answer poetry question correctly
  e.makeChoice(0); // scene 0
  // Find a poetry question - scene 1 (xiaoxiang) has poetry
  e.completeScene();
  e.makeChoice(0); // scene 1
  const q1 = e.answerQuestion(1, 0); // poetry question, correct answer is 0
  assertEqual(q1.score, 100, 'Daiyu poetry score doubled (50*2=100)');
  // Wrong answer - no penalty
  const q2 = e.answerQuestion(0, 2); // wrong answer
  assert(!q2.correct, 'Wrong answer is wrong');
  assertEqual(q2.penalty, 0, 'Daiyu no score penalty');
})();

// 2.3 Xue Baochai - extraLives
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('xue_baochai');
  assertEqual(e.getLives(), 4, 'Baochai gets 4 lives (3+1)');
})();

// 2.4 Wang Xifeng - extraItem
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('wang_xifeng');
  // Choice 1 in scene 0 gives no item
  e.makeChoice(1);
  assert(e.state.items.includes('hua_ban_jian'), 'Xifeng gets extra item from scene drop');
})();

// 2.5 Shi Xiangyun - autoCorrectCommon
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('shi_xiangyun');
  e.makeChoice(0);
  const scoreBefore = e.state.score;
  // Answer wrong on common question
  const result = e.answerQuestion(0, 2); // wrong answer for common question
  assert(result.correct, 'Xiangyun auto-corrects common questions');
  assert(result.autoCorrect, 'autoCorrect flag set');
  assertEqual(result.score, 50, 'Xiangyun autoCorrect returns score 50');
  assertEqual(e.state.score, scoreBefore + 50, 'Xiangyun autoCorrect actually adds score to state');
})();

// 2.6 Jia Tanchun - unlockBonus
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('jia_tanchun');
  const bonus = e.getBonusStory();
  assert(bonus !== null, 'Tanchun gets bonus story');
  assert(bonus.includes('\u756a\u5916'), 'Bonus story contains fanwai');
})();

// 2.7 Miao Yu - rareItemBoost (probabilistic, just verify no crash)
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('miao_yu');
  e.makeChoice(0);
  for (let i = 0; i < 3; i++) e.answerQuestion(i, GAME_DATA.scenes[0].questions[i].answer);
  e.completeScene(); // may or may not add rare item
  assert(true, 'Miao Yu rareItemBoost does not crash');
})();

// 2.8 Li Wan - scoreBoost 1.5x
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('li_wan');
  e.makeChoice(0); // scene 0 choice 0: score 100
  // Expected: floor(100 * 1.5) = 150
  assertEqual(e.state.score, 150, 'Li Wan score boost 1.5x on choice');
  const qr = e.answerQuestion(0, GAME_DATA.scenes[0].questions[0].answer);
  assertEqual(qr.score, 75, 'Li Wan score boost 1.5x on question (floor(50*1.5)=75)');
})();

// 2.9 Jia Yingchun - reviveTimeHalf
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('jia_yingchun');
  const r = e.revive('wait');
  assertEqual(r.waitMinutes, 15, 'Yingchun revive wait halved to 15');
})();

// 2.10 Jia Xichun - freeHint
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('jia_xichun');
  e.makeChoice(0);
  const h = e.useHint(0);
  assert(h.success, 'Xichun hint succeeds');
  assertEqual(h.answer, GAME_DATA.scenes[0].questions[0].answer, 'Hint gives correct answer');
})();

// 2.11 Qin Keqing - affinityBonus
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('qin_keqing');
  const allFive = Object.values(e.state.affinity).every(v => v === 5);
  assert(allFive, 'Qin Keqing all affinity +5');
  assertEqual(e.state.affinity['lin_daiyu'], 5, 'Keqing daiyu affinity starts at 5');
})();

// 2.12 Qiao Jie - shareRewardDouble
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('qiao_jie');
  const r = e.revive('share');
  assertEqual(r.bonus, 100, 'Qiao Jie share reward doubled to 100');
})();

// 2.13 Xiang Ling - autoPoem
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('xiang_ling');
  e.makeChoice(0);
  assert(e.state.poems.length === 1, 'Xiang Ling auto poem after choice');
  for (let i = 0; i < 3; i++) e.answerQuestion(i, GAME_DATA.scenes[0].questions[i].answer);
  e.completeScene();
  e.makeChoice(0);
  assert(e.state.poems.length === 2, 'Xiang Ling second poem after scene 1 choice');
})();

// ============================================================
// SECTION 3: Edge cases and error handling
// ============================================================

console.log('\n=== SECTION 3: Edge Cases ===');

// 3.1 Invalid choice index
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('jia_baoyu');
  const r1 = e.makeChoice(-1);
  assert(!r1.success, 'Negative choice index fails');
  const r2 = e.makeChoice(5);
  assert(!r2.success, 'Out of range choice index fails');
})();

// 3.2 Invalid question index
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('jia_baoyu');
  e.makeChoice(0);
  const r1 = e.answerQuestion(-1, 0);
  assert(!r1.success, 'Negative question index fails');
  const r2 = e.answerQuestion(99, 0);
  assert(!r2.success, 'Out of range question index fails');
})();

// 3.3 No scene after all completed
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('jia_baoyu');
  for (let s = 0; s < 8; s++) {
    e.makeChoice(0);
    for (let q = 0; q < 3; q++) e.answerQuestion(q, GAME_DATA.scenes[s].questions[q].answer);
    e.completeScene();
  }
  assertEqual(e.getCurrentScene(), null, 'No scene after all 8 completed');
})();

// 3.4 Hint without talent
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('jia_baoyu');
  e.makeChoice(0);
  const h = e.useHint(0);
  assert(!h.success, 'Hint fails without freeHint talent');
})();

// 3.5 Revive with invalid method
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('jia_baoyu');
  const r = e.revive('invalid');
  assert(!r.success, 'Invalid revive method fails');
})();

// 3.6 Item deduplication
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('jia_baoyu');
  e.addItem('hua_ban_jian');
  e.addItem('hua_ban_jian');
  assertEqual(e.state.items.length, 1, 'Duplicate items not added');
})();

// 3.7 addItem with null/undefined
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('jia_baoyu');
  e.addItem(null);
  e.addItem(undefined);
  assertEqual(e.state.items.length, 0, 'Null/undefined items not added');
})();

// 3.8 Hidden clue without talent
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('lin_daiyu');
  assertEqual(e.getHiddenClue(), null, 'No hidden clue without talent');
})();

// 3.9 Bonus story without talent
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('lin_daiyu');
  assertEqual(e.getBonusStory(), null, 'No bonus story without talent');
})();

// 3.10 All wrong answers - lives depletion
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('lin_daiyu'); // 3 lives, no penalty
  e.makeChoice(0);
  // Answer wrong 3 times
  for (let i = 0; i < 3; i++) {
    const r = e.answerQuestion(0, 2); // always wrong
    assert(!r.correct || r.autoCorrect, `Wrong answer ${i} for daiyu`);
  }
  // Daiyu has noScorePenalty so penalty=0
  assertEqual(e.state.score, 100, 'Score unchanged after wrong answers for Daiyu');
})();

// ============================================================
// SECTION 4: Answer permutation tests (wrong answers + talent interactions)
// ============================================================

console.log('\n=== SECTION 4: Answer Permutations ===');

// For each character, test answering all questions wrong in scene 0
for (const charId of characters) {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter(charId);
  e.makeChoice(0);

  const lives = e.getLives();
  let wrongCount = 0;

  for (let attempt = 0; attempt < lives + 2; attempt++) {
    const r = e.answerQuestion(0, 2); // always pick wrong answer for Q0
    if (r.correct) {
      // autoCorrectCommon triggered
      assert(e.state.character.talentEffect.autoCorrectCommon, `${charId} auto-correct only with talent`);
      break;
    }
    wrongCount++;
  }

  if (!e.state.character.talentEffect.autoCorrectCommon) {
    // Should have used all lives
    assert(wrongCount >= lives, `${charId} can exhaust ${lives} lives`);
  }
}

// ============================================================
// SECTION 5: Ending determination logic
// ============================================================

console.log('\n=== SECTION 5: Ending Logic ===');

// 5.1 Ultimate ending (12+ items)
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('jia_baoyu');
  // Manually add 12 items
  const itemIds = Object.keys(GAME_DATA.items);
  for (let i = 0; i < 12; i++) e.addItem(itemIds[i]);
  const ending = e.getEnding();
  assertEqual(ending.title, '\u7ea2\u697c\u96c5\u5ba2', 'Ultimate ending with 12+ items');
})();

// 5.2 Prosperous ending (choice 0 in scene 7)
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('jia_baoyu');
  // Play through to scene 7
  for (let s = 0; s < 7; s++) {
    e.makeChoice(0);
    for (let q = 0; q < 3; q++) e.answerQuestion(q, GAME_DATA.scenes[s].questions[q].answer);
    e.completeScene();
  }
  e.makeChoice(0); // scene 7 choice 0 = prosperous
  assertEqual(e.state.ending, 'prosperous', 'Choice 0 in final scene sets prosperous');
  const ending = e.getEnding();
  assertEqual(ending.title, '\u7e41\u534e\u4e00\u68a6', 'Prosperous ending title');
})();

// 5.3 Elegant ending (choice 1 in scene 7)
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('jia_baoyu');
  for (let s = 0; s < 7; s++) {
    e.makeChoice(0);
    for (let q = 0; q < 3; q++) e.answerQuestion(q, GAME_DATA.scenes[s].questions[q].answer);
    e.completeScene();
  }
  e.makeChoice(1); // scene 7 choice 1 = elegant
  assertEqual(e.state.ending, 'elegant', 'Choice 1 in final scene sets elegant');
  const ending = e.getEnding();
  assertEqual(ending.title, '\u6e05\u96c5\u5bfb\u82b3', 'Elegant ending title');
})();

// 5.4 Ultimate overrides other endings
(function() {
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter('jia_baoyu');
  e.state.ending = 'prosperous';
  const itemIds = Object.keys(GAME_DATA.items);
  for (let i = 0; i < 12; i++) e.addItem(itemIds[i]);
  const ending = e.getEnding();
  assertEqual(ending.title, '\u7ea2\u697c\u96c5\u5ba2', 'Ultimate overrides prosperous');
})();

// ============================================================
// SECTION 6: Data integrity checks
// ============================================================

console.log('\n=== SECTION 6: Data Integrity ===');

// 6.1 All scenes have valid structure
GAME_DATA.scenes.forEach((scene, i) => {
  assert(scene.id && scene.name, `Scene ${i} has id and name`);
  assertEqual(scene.choices.length, 2, `Scene ${i} has exactly 2 choices`);
  assertEqual(scene.questions.length, 3, `Scene ${i} has exactly 3 questions`);
  assert(scene.itemDrop in GAME_DATA.items, `Scene ${i} itemDrop exists in items`);

  scene.choices.forEach((ch, ci) => {
    assert(ch.text.length > 0, `Scene ${i} choice ${ci} has text`);
    assert(typeof ch.reward.score === 'number', `Scene ${i} choice ${ci} has numeric score`);
    if (ch.reward.item) {
      assert(ch.reward.item in GAME_DATA.items, `Scene ${i} choice ${ci} item exists`);
    }
  });

  scene.questions.forEach((q, qi) => {
    assert(q.text.length > 0, `Scene ${i} Q${qi} has text`);
    assertEqual(q.options.length, 3, `Scene ${i} Q${qi} has 3 options`);
    assert(q.answer >= 0 && q.answer < 3, `Scene ${i} Q${qi} answer in range`);
    assert(['common', 'poetry'].includes(q.category), `Scene ${i} Q${qi} valid category`);
  });
});

// 6.2 All characters have valid talent effects
GAME_DATA.characters.forEach((char, i) => {
  assert(char.id && char.name, `Character ${i} has id and name`);
  assert(char.poem.length > 0, `Character ${i} has poem`);
  assert(char.talent.length > 0, `Character ${i} has talent description`);
  assert(typeof char.talentEffect === 'object', `Character ${i} has talentEffect object`);
});

// 6.3 All items referenced in choices exist
GAME_DATA.scenes.forEach((scene, i) => {
  scene.choices.forEach((ch, ci) => {
    if (ch.reward.item) {
      assert(GAME_DATA.items[ch.reward.item] !== undefined, `Scene ${i} choice ${ci} item '${ch.reward.item}' in items dict`);
    }
  });
});

// 6.4 Endings all exist
assert(GAME_DATA.endings.prosperous !== undefined, 'Prosperous ending defined');
assert(GAME_DATA.endings.elegant !== undefined, 'Elegant ending defined');
assert(GAME_DATA.endings.ultimate !== undefined, 'Ultimate ending defined');

// ============================================================
// SECTION 7: Affinity tracking across all paths
// ============================================================

console.log('\n=== SECTION 7: Affinity Tracking ===');

for (const charId of characters) {
  // Path 0 (all choice 0) - maximum affinity path
  const e = new GameEngine(GAME_DATA);
  e.newGame(); e.assignCharacter(charId);

  for (let s = 0; s < 8; s++) {
    e.makeChoice(0);
    for (let q = 0; q < 3; q++) e.answerQuestion(q, GAME_DATA.scenes[s].questions[q].answer);
    e.completeScene();
  }

  // Verify affinity values are non-negative
  Object.entries(e.state.affinity).forEach(([id, val]) => {
    assert(val >= 0, `${charId} affinity for ${id} >= 0 (got ${val})`);
  });

  // Path 255 (all choice 1) - minimal affinity path
  const e2 = new GameEngine(GAME_DATA);
  e2.newGame(); e2.assignCharacter(charId);

  for (let s = 0; s < 8; s++) {
    e2.makeChoice(1);
    for (let q = 0; q < 3; q++) e2.answerQuestion(q, GAME_DATA.scenes[s].questions[q].answer);
    e2.completeScene();
  }

  Object.entries(e2.state.affinity).forEach(([id, val]) => {
    assert(val >= 0, `${charId} path255 affinity for ${id} >= 0`);
  });
}

// ============================================================
// SECTION 8: Score bounds verification
// ============================================================

console.log('\n=== SECTION 8: Score Bounds ===');

// Calculate theoretical min/max scores for each character
for (const charId of characters) {
  let minScore = Infinity, maxScore = 0;

  for (let path = 0; path < 256; path++) {
    const e = new GameEngine(GAME_DATA);
    e.newGame(); e.assignCharacter(charId);

    for (let s = 0; s < 8; s++) {
      const choiceIdx = (path >> s) & 1;
      e.makeChoice(choiceIdx);
      for (let q = 0; q < 3; q++) e.answerQuestion(q, GAME_DATA.scenes[s].questions[q].answer);
      e.completeScene();
    }

    if (e.state.score < minScore) minScore = e.state.score;
    if (e.state.score > maxScore) maxScore = e.state.score;
  }

  assert(minScore > 0, `${charId} min score > 0 (got ${minScore})`);
  assert(maxScore > minScore, `${charId} max score > min (${maxScore} > ${minScore})`);
  assert(maxScore < 10000, `${charId} max score reasonable < 10000 (got ${maxScore})`);
}

// ============================================================
// RESULTS
// ============================================================

console.log('\n' + '='.repeat(60));
console.log(`COMBINATORIAL TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log(`Total assertions: ${passed + failed}`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log(`\nFAILED (first 20):`);
  errors.slice(0, 20).forEach(e => console.log(`  ? ${e}`));
  process.exit(1);
} else {
  console.log('\n? ALL TESTS PASSED - Game logic verified for all character/choice combinations');
  process.exit(0);
}
