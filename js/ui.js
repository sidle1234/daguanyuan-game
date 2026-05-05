class GameUI {
  constructor(engine, storage) {
    this.engine = engine;
    this.storage = storage;
    this.currentQuestionIndex = 0;
    this.livesRemaining = 0;
    this.choiceMade = false;
    this.answerLocked = false;
  }

  init() { this.bindEvents(); this.showScreen('cover'); }

  bindEvents() {
    document.getElementById('btn-start').addEventListener('click', () => this.onStart());
    document.getElementById('btn-guest').addEventListener('click', () => this.onGuest());
    document.getElementById('btn-enter-garden').addEventListener('click', () => this.showScreen('map'));
    document.getElementById('btn-share').addEventListener('click', () => this.generatePoster());
    document.getElementById('btn-restart').addEventListener('click', () => this.onRestart());
  }

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById('screen-' + screenId);
    if (screen) screen.classList.add('active');
  }

  onStart() {
    const saved = this.storage.load();
    if (saved && saved.character) {
      this.engine.loadState(saved);
      this.showScreen('map');
      this.renderMap();
    } else {
      this.showScreen('auth');
    }
  }

  onGuest() {
    this.engine.newGame();
    this.showScreen('identity');
    this.drawIdentity();
  }

  drawIdentity() {
    const character = this.engine.assignCharacter();
    document.getElementById('identity-result').innerHTML =
      '<div class="character-card"><div class="character-icon">' + this.getCharacterEmoji(character.id) + '</div>' +
      '<h2>' + character.name + '</h2><p class="poem">' + character.poem + '</p>' +
      '<div class="talent"><span class="talent-label">\u4e13\u5c5e\u5929\u8d4b</span><p>' + character.talent + '</p></div></div>';
    this.renderMap();
  }

  renderMap() {
    const mc = document.getElementById('map-scenes');
    mc.innerHTML = '';
    this.engine.data.scenes.forEach((scene, i) => {
      const completed = this.engine.state.completedScenes.includes(scene.id);
      const current = i === this.engine.state.currentScene;
      const locked = i > this.engine.state.currentScene;
      const div = document.createElement('div');
      div.className = 'map-node' + (completed ? ' completed' : '') + (current ? ' current' : '') + (locked ? ' locked' : '');
      div.innerHTML = '<span class="node-number">' + (i + 1) + '</span><span class="node-name">' + scene.name + '</span><span class="node-subtitle">' + scene.subtitle + '</span>';
      if (current) div.addEventListener('click', () => this.enterScene());
      mc.appendChild(div);
    });
    this.updateSidebar();
  }

  updateSidebar() {
    const s = document.getElementById('sidebar-stats');
    if (s) s.innerHTML = '<div class="stat-item">\u79ef\u5206: ' + this.engine.state.score + '</div><div class="stat-item">\u4fe1\u7269: ' + this.engine.state.items.length + '/' + Object.keys(this.engine.data.items).length + '</div><div class="stat-item">\u8fdb\u5ea6: ' + this.engine.state.completedScenes.length + '/8</div>';
  }

  enterScene() {
    const scene = this.engine.getCurrentScene();
    if (!scene) return;
    this.choiceMade = false;
    this.answerLocked = false;
    this.currentQuestionIndex = 0;
    this.livesRemaining = this.engine.getLives();
    this.showScreen('scene');
    this.renderScene(scene);
  }

  renderScene(scene) {
    const c = document.getElementById('scene-content');
    let html = '<div class="scene-header"><h2>' + scene.name + '</h2><p class="scene-subtitle">' + scene.subtitle + '</p></div>';
    html += '<div class="scene-illustration scene-bg-' + scene.id + '"></div>';
    html += '<div class="scene-description"><p>' + scene.description + '</p></div>';
    const clue = this.engine.getHiddenClue();
    if (clue) html += '<div class="hidden-clue"><span>&#128269; \u9690\u85cf\u7ebf\u7d22\uff1a</span>' + clue + '</div>';
    const bonus = this.engine.getBonusStory();
    if (bonus) html += '<div class="bonus-story"><span>&#128214; </span>' + bonus + '</div>';
    html += '<div class="choices" id="scene-choices">';
    scene.choices.forEach((ch, i) => {
      html += '<button class="choice-btn" data-index="' + i + '">' + ch.text + '</button>';
    });
    html += '</div><div class="quiz-area" id="quiz-area" style="display:none;"></div>';
    c.innerHTML = html;
    c.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (!this.choiceMade) {
          this.choiceMade = true;
          this.onChoice(parseInt(e.target.dataset.index));
        }
      });
    });
  }

  onChoice(index) {
    const result = this.engine.makeChoice(index);
    if (!result.success) return;
    const cd = document.getElementById('scene-choices');
    let rewardText = '<p>\u83b7\u5f97\u79ef\u5206: +' + result.scoreGain + '</p>';
    if (result.reward.item) {
      rewardText += '<p>\u83b7\u5f97\u4fe1\u7269: ' + this.engine.data.items[result.reward.item].name + '</p>';
    }
    cd.innerHTML = '<div class="choice-result">' + rewardText + '</div>';
    setTimeout(() => this.startQuiz(), 1500);
  }

  startQuiz() {
    document.getElementById('quiz-area').style.display = 'block';
    this.renderQuestion();
  }

  renderQuestion() {
    const scene = this.engine.getCurrentScene();
    const qa = document.getElementById('quiz-area');
    if (this.currentQuestionIndex >= scene.questions.length) {
      this.onSceneComplete();
      return;
    }
    if (this.livesRemaining <= 0) {
      this.onSceneFail();
      return;
    }
    this.answerLocked = false;
    const q = scene.questions[this.currentQuestionIndex];
    let html = '<div class="quiz-header"><span>\u7b2c ' + (this.currentQuestionIndex + 1) + '/' + scene.questions.length + ' \u9898</span><span>\u5269\u4f59\u673a\u4f1a: ' + Array(this.livesRemaining).fill('&#10084;').join('') + '</span></div>';
    html += '<div class="question-text">' + q.text + '</div><div class="options">';
    q.options.forEach((opt, i) => {
      html += '<button class="option-btn" data-index="' + i + '">' + opt + '</button>';
    });
    html += '</div>';
    if (this.engine.state.character.talentEffect.freeHint) {
      html += '<button class="hint-btn" id="btn-hint">&#128161; \u4f7f\u7528\u63d0\u793a</button>';
    }
    qa.innerHTML = html;
    qa.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.onAnswer(parseInt(e.target.dataset.index)));
    });
    const hb = document.getElementById('btn-hint');
    if (hb) {
      hb.addEventListener('click', () => {
        const h = this.engine.useHint(this.currentQuestionIndex);
        if (h.success) {
          qa.querySelectorAll('.option-btn')[h.answer].classList.add('hint-highlight');
          hb.remove();
        }
      });
    }
  }

  onAnswer(answerIndex) {
    if (this.answerLocked) return;
    this.answerLocked = true;

    const result = this.engine.answerQuestion(this.currentQuestionIndex, answerIndex);
    if (result.correct) {
      this.showFeedback(true, result.autoCorrect ? '\u5929\u8d4b\u81ea\u52a8\u7b54\u5bf9\uff01' : '\u56de\u7b54\u6b63\u786e\uff01');
      this.currentQuestionIndex++;
    } else {
      this.livesRemaining--;
      this.showFeedback(false, '\u56de\u7b54\u9519\u8bef');
      if (this.livesRemaining <= 0) {
        setTimeout(() => this.onSceneFail(), 1200);
        return;
      }
    }
    setTimeout(() => this.renderQuestion(), 1200);
  }

  showFeedback(correct, msg) {
    const f = document.createElement('div');
    f.className = 'feedback ' + (correct ? 'correct' : 'wrong');
    f.textContent = msg;
    document.getElementById('quiz-area').appendChild(f);
    setTimeout(() => f.remove(), 1000);
  }

  onSceneComplete() {
    this.engine.completeScene();
    this.storage.save(this.engine.state);
    if (this.engine.state.currentScene >= this.engine.data.scenes.length) {
      this.showEnding();
    } else {
      document.getElementById('quiz-area').innerHTML = '<div class="scene-complete"><h3>&#127881; \u606d\u559c\u901a\u5173\uff01</h3><p>\u5373\u5c06\u8fd4\u56de\u5927\u89c2\u56ed\u5730\u56fe...</p></div>';
      setTimeout(() => {
        this.showScreen('map');
        this.renderMap();
      }, 2000);
    }
  }

  onSceneFail() {
    const qa = document.getElementById('quiz-area');
    const wt = this.engine.state.character.talentEffect.reviveTimeHalf ? 15 : 30;
    qa.innerHTML = '<div class="scene-fail"><h3>\u7b54\u9898\u673a\u4f1a\u5df2\u7528\u5c3d</h3><p>\u9009\u62e9\u590d\u6d3b\u65b9\u5f0f\uff1a</p><button class="revive-btn" id="btn-revive-share">\u5206\u4eab\u81f3\u5fae\u4fe1\uff0c\u7acb\u5373\u590d\u6d3b</button><button class="revive-btn" id="btn-revive-wait">\u7b49\u5f85\u6062\u590d\uff08' + wt + '\u5206\u949f\uff09</button></div>';
    document.getElementById('btn-revive-share').addEventListener('click', () => {
      this.triggerShare(() => {
        this.engine.revive('share');
        this.livesRemaining = this.engine.getLives();
        this.answerLocked = false;
        this.renderQuestion();
      });
    });
    document.getElementById('btn-revive-wait').addEventListener('click', () => {
      qa.innerHTML = '<div class="wait-message"><p>\u8bf7' + wt + '\u5206\u949f\u540e\u518d\u6765\u6311\u6218</p></div>';
    });
  }

  showEnding() {
    const ending = this.engine.getEnding();
    const stats = this.engine.getStats();
    this.showScreen('ending');
    document.getElementById('ending-content').innerHTML = '<div class="ending-card"><h2>' + ending.title + '</h2><p class="ending-text">' + ending.text + '</p><div class="final-stats"><div>\u8eab\u4efd\uff1a' + stats.character.name + '</div><div>\u603b\u79ef\u5206\uff1a' + stats.score + '</div><div>\u901a\u5173\u573a\u666f\uff1a' + stats.scenesCompleted + '/' + stats.totalScenes + '</div><div>\u6536\u96c6\u4fe1\u7269\uff1a' + stats.itemsCollected + '/' + stats.totalItems + '</div></div></div>';
    this.storage.save(this.engine.state);
  }

  generatePoster() {
    const stats = this.engine.getStats();
    const canvas = document.getElementById('poster-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 750; canvas.height = 1334;
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, 750, 1334); this.drawPosterContent(ctx, stats); };
    img.onerror = () => { ctx.fillStyle = '#f5f0e8'; ctx.fillRect(0, 0, 750, 1334); this.drawPosterContent(ctx, stats); };
    img.src = 'images/poster-bg.svg';
    canvas.style.display = 'block';
  }

  drawPosterContent(ctx, stats) {
    ctx.fillStyle = '#4a2c17'; ctx.font = 'bold 48px serif'; ctx.textAlign = 'center';
    ctx.fillText('\u5927\u89c2\u56ed\u5bfb\u68a6\u8bb0', 375, 120);
    ctx.font = '28px serif'; ctx.fillStyle = '#8b6914';
    ctx.fillText('\u7ea2\u697c\u96c5\u5ba2', 375, 170);
    ctx.font = 'bold 36px serif'; ctx.fillStyle = '#4a2c17';
    ctx.fillText(stats.character.name, 375, 350);
    ctx.font = '24px serif'; ctx.fillStyle = '#666';
    ctx.fillText(stats.character.poem, 375, 400);
    ctx.font = '28px sans-serif'; ctx.fillStyle = '#333';
    ctx.fillText('\u901a\u5173: ' + stats.scenesCompleted + '/' + stats.totalScenes, 375, 550);
    ctx.fillText('\u4fe1\u7269: ' + stats.itemsCollected + '/' + stats.totalItems, 375, 600);
    ctx.fillText('\u79ef\u5206: ' + stats.score, 375, 650);
    ctx.font = 'bold 32px serif'; ctx.fillStyle = '#8b4513';
    ctx.fillText('\u7ed3\u5c40\uff1a' + stats.ending.title, 375, 780);
    const pt = this.engine.data.posterTexts[Math.floor(Math.random() * 3)];
    ctx.font = '22px serif'; ctx.fillStyle = '#999'; ctx.fillText(pt, 375, 1100);
    ctx.font = '20px sans-serif'; ctx.fillStyle = '#aaa';
    ctx.fillText('\u957f\u6309\u4fdd\u5b58\u56fe\u7247\uff0c\u5206\u4eab\u7ed9\u597d\u53cb', 375, 1200);
  }

  onRestart() { this.storage.clear(); this.engine.newGame(); this.showScreen('cover'); }

  triggerShare(onSuccess) {
    const shareData = {
      title: '\u5927\u89c2\u56ed\u5bfb\u68a6\u8bb0',
      text: '\u6211\u5728\u5927\u89c2\u56ed\u5bfb\u68a6\u8bb0\u4e2d\u9047\u5230\u4e86\u96be\u9898\uff0c\u5feb\u6765\u5e2e\u6211\u52a9\u529b\u590d\u6d3b\uff01',
      url: window.location.href
    };
    if (navigator.share) {
      navigator.share(shareData).then(() => {
        onSuccess();
      }).catch(() => {
        this.showShareFallback(onSuccess);
      });
    } else {
      this.showShareFallback(onSuccess);
    }
  }

  showShareFallback(onSuccess) {
    const qa = document.getElementById('quiz-area');
    qa.innerHTML = '<div class="share-panel"><h3>\u5206\u4eab\u590d\u6d3b</h3><p>\u8bf7\u5c06\u6e38\u620f\u5206\u4eab\u7ed9\u4e00\u4f4d\u597d\u53cb</p><p class="share-url-box">' + window.location.href + '</p><button class="revive-btn" id="btn-copy-link">\u590d\u5236\u94fe\u63a5</button><p class="share-tip">\u590d\u5236\u540e\u53d1\u9001\u7ed9\u597d\u53cb\uff0c\u5373\u53ef\u590d\u6d3b</p></div>';
    document.getElementById('btn-copy-link').addEventListener('click', () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href).then(() => {
          document.getElementById('btn-copy-link').textContent = '\u2705 \u5df2\u590d\u5236\uff0c\u8bf7\u53d1\u9001\u7ed9\u597d\u53cb';
          setTimeout(() => onSuccess(), 1500);
        });
      } else {
        const ta = document.createElement('textarea');
        ta.value = window.location.href;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        document.getElementById('btn-copy-link').textContent = '\u2705 \u5df2\u590d\u5236\uff0c\u8bf7\u53d1\u9001\u7ed9\u597d\u53cb';
        setTimeout(() => onSuccess(), 1500);
      }
    });
  }

  getCharacterEmoji(id) {
    const e = {jia_baoyu:'&#128142;',lin_daiyu:'&#127807;',xue_baochai:'&#128274;',wang_xifeng:'&#129413;',shi_xiangyun:'&#9729;',jia_tanchun:'&#127801;',miao_yu:'&#127802;',li_wan:'&#127806;',jia_yingchun:'&#127800;',jia_xichun:'&#128367;',qin_keqing:'&#127769;',qiao_jie:'&#127872;',xiang_ling:'&#127802;'};
    return e[id] || '&#127982;';
  }
}
if (typeof module !== 'undefined' && module.exports) { module.exports = { GameUI }; }
