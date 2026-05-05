class GameEngine {
  constructor(data) { this.data = data; this.state = null; }

  newGame() {
    this.state = {
      character: null, currentScene: 0, score: 0, lives: 3,
      items: [], affinity: {}, completedScenes: [], poems: [], ending: null, startTime: Date.now()
    };
    this.data.characters.forEach(c => { this.state.affinity[c.id] = 0; });
    return this.state;
  }

  loadState(savedState) { this.state = savedState; return this.state; }

  assignCharacter(characterId) {
    if (characterId) {
      this.state.character = this.data.characters.find(c => c.id === characterId);
    } else {
      const index = Math.floor(Math.random() * this.data.characters.length);
      this.state.character = this.data.characters[index];
    }
    if (this.state.character.id === 'qin_keqing') {
      Object.keys(this.state.affinity).forEach(key => { this.state.affinity[key] += 5; });
    }
    return this.state.character;
  }

  getCurrentScene() {
    if (this.state.currentScene >= this.data.scenes.length) return null;
    return this.data.scenes[this.state.currentScene];
  }

  getLives() {
    let lives = 3;
    if (this.state.character.talentEffect.extraLives) lives += this.state.character.talentEffect.extraLives;
    return lives;
  }

  makeChoice(choiceIndex) {
    const scene = this.getCurrentScene();
    if (!scene || choiceIndex < 0 || choiceIndex >= scene.choices.length) {
      return { success: false, error: 'invalid_choice' };
    }
    const choice = scene.choices[choiceIndex];
    const reward = choice.reward;
    let scoreGain = reward.score;
    if (this.state.character.talentEffect.scoreBoost) {
      scoreGain = Math.floor(scoreGain * this.state.character.talentEffect.scoreBoost);
    }
    this.state.score += scoreGain;
    if (reward.item) this.addItem(reward.item);
    if (this.state.character.talentEffect.extraItem && !reward.item) this.addItem(scene.itemDrop);
    if (reward.affinity) {
      Object.entries(reward.affinity).forEach(([charId, value]) => {
        this.state.affinity[charId] = (this.state.affinity[charId] || 0) + value;
      });
    }
    if (this.state.character.talentEffect.autoPoem) this.unlockPoem(this.state.currentScene);
    if (reward.ending) this.state.ending = reward.ending;
    return { success: true, scoreGain, reward };
  }

  answerQuestion(questionIndex, answerIndex) {
    const scene = this.getCurrentScene();
    if (!scene || questionIndex < 0 || questionIndex >= scene.questions.length) {
      return { success: false, error: 'invalid_question' };
    }
    const question = scene.questions[questionIndex];
    const isCorrect = question.answer === answerIndex;
    if (!isCorrect && this.state.character.talentEffect.autoCorrectCommon && question.category === 'common') {
      return { correct: true, autoCorrect: true, score: this.calculateQuestionScore(question) };
    }
    if (isCorrect) {
      const score = this.calculateQuestionScore(question);
      this.state.score += score;
      return { correct: true, autoCorrect: false, score };
    } else {
      if (this.state.character.talentEffect.noScorePenalty) return { correct: false, penalty: 0 };
      return { correct: false, penalty: -10 };
    }
  }

  calculateQuestionScore(question) {
    let score = 50;
    if (question.category === 'poetry' && this.state.character.talentEffect.poetryDoubleScore) score *= 2;
    if (this.state.character.talentEffect.scoreBoost) score = Math.floor(score * this.state.character.talentEffect.scoreBoost);
    return score;
  }

  useHint(questionIndex) {
    if (!this.state.character.talentEffect.freeHint) return { success: false, error: 'no_hint_talent' };
    const scene = this.getCurrentScene();
    if (!scene) return { success: false, error: 'no_scene' };
    return { success: true, answer: scene.questions[questionIndex].answer };
  }

  completeScene() {
    const scene = this.getCurrentScene();
    if (!scene) return { success: false };
    this.state.completedScenes.push(scene.id);
    if (this.state.character.talentEffect.rareItemBoost) {
      const rareItems = Object.entries(this.data.items).filter(([_, item]) => item.rarity === 'rare').map(([id]) => id);
      if (rareItems.length > 0 && Math.random() < 0.5) {
        this.addItem(rareItems[Math.floor(Math.random() * rareItems.length)]);
      }
    }
    this.state.currentScene++;
    return { success: true, nextScene: this.state.currentScene };
  }

  addItem(itemId) { if (itemId && !this.state.items.includes(itemId)) this.state.items.push(itemId); }

  unlockPoem(sceneIndex) {
    const poems = ['满纸荒唐言，一把辛酸泪','花谢花飞飞满天，红消香断有谁怜','一个是阆苑仙葩，一个是美玉无瑕',
      '好风凭借力，送我上青云','桃李春风结子完，到头谁似一盆兰','才自清明志自高，生于末世运偏消',
      '欲洁何曾洁，云空未必空','落了片白茫茫大地真干净'];
    if (sceneIndex < poems.length && !this.state.poems.includes(poems[sceneIndex])) this.state.poems.push(poems[sceneIndex]);
  }

  getEnding() {
    if (this.state.items.length >= 12) return this.data.endings.ultimate;
    if (this.state.ending === 'prosperous') return this.data.endings.prosperous;
    return this.data.endings.elegant;
  }

  getStats() {
    return {
      character: this.state.character, score: this.state.score,
      scenesCompleted: this.state.completedScenes.length, totalScenes: this.data.scenes.length,
      itemsCollected: this.state.items.length, totalItems: Object.keys(this.data.items).length,
      affinity: this.state.affinity, poems: this.state.poems, ending: this.getEnding()
    };
  }

  revive(method) {
    if (method === 'share') {
      const bonus = this.state.character.talentEffect.shareRewardDouble ? 100 : 50;
      this.state.score += bonus;
      return { success: true, method: 'share', bonus };
    } else if (method === 'wait') {
      const waitTime = this.state.character.talentEffect.reviveTimeHalf ? 15 : 30;
      return { success: true, method: 'wait', waitMinutes: waitTime };
    }
    return { success: false, error: 'invalid_method' };
  }

  getHiddenClue() {
    if (!this.state.character.talentEffect.hiddenClue) return null;
    const clues = ['丫鬟名唤春燕，最爱在此拾花瓣做书签','黛玉案头有一卷未完诗稿，墨迹尚新',
      '海棠花下藏有宝玉幼时埋下的玉佩','蘅芜苑的异草来自海外，宝钗亲自栽种',
      '稻香村后有一片竹林，贾兰常在此读书','探春案上有一封未寄出的家书',
      '庵中茶具乃前朝古物，价值连城','大观楼匾额为元妃亲笔所题'];
    return this.state.currentScene < clues.length ? clues[this.state.currentScene] : null;
  }

  getBonusStory() {
    if (!this.state.character.talentEffect.unlockBonus) return null;
    const stories = ['番外：春燕曾是黛玉身边的小丫头，后被调至怡红院','番外：潇湘馆的竹子是黛玉入府时特意从南方移栽',
      '番外：怡红院的海棠是贾母赐予宝玉的生辰礼物','番外：蘅芜苑原名"衡芜苑"，后宝钗改为此名',
      '番外：稻香村的菜圃由李纨亲自打理，贾兰常来帮忙','番外：秋爽斋的笔墨纸砚皆为探春自己挑选',
      '番外：栊翠庵的红梅为妙玉从蟠香寺带来','番外：大观楼宴席上的酒令为宝钗所拟'];
    return this.state.currentScene < stories.length ? stories[this.state.currentScene] : null;
  }
}
if (typeof module !== 'undefined' && module.exports) { module.exports = { GameEngine }; }
