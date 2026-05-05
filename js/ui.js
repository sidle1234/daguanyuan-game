class GameUI {
  constructor(engine, storage) { this.engine = engine; this.storage = storage; this.currentQuestionIndex = 0; this.livesRemaining = 0; this.choiceMade = false; }
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
    if (saved && saved.character) { this.engine.loadState(saved); this.showScreen('map'); this.renderMap(); }
    else { this.showScreen('auth'); }
  }
  onGuest() { this.engine.newGame(); this.showScreen('identity'); this.drawIdentity(); }
  drawIdentity() {
    const character = this.engine.assignCharacter();
    document.getElementById('identity-result').innerHTML =
      '<div class="character-card"><div class="character-icon">' + this.getCharacterEmoji(character.id) + '</div>' +
      '<h2>' + character.name + '</h2><p class="poem">' + character.poem + '</p>' +
      '<div class="talent"><span class="talent-label">专属天赋</span><p>' + character.talent + '</p></div></div>';
    this.renderMap();
  }
  renderMap() {
    const mc = document.getElementById('map-scenes'); mc.innerHTML = '';
    this.engine.data.scenes.forEach((scene, i) => {
      const completed = this.engine.state.completedScenes.includes(scene.id);
      const current = i === this.engine.state.currentScene;
      const locked = i > this.engine.state.currentScene;
      const div = document.createElement('div');
      div.className = 'map-node' + (completed?' completed':'') + (current?' current':'') + (locked?' locked':'');
      div.innerHTML = '<span class="node-number">' + (i+1) + '</span><span class="node-name">' + scene.name + '</span><span class="node-subtitle">' + scene.subtitle + '</span>';
      if (current) div.addEventListener('click', () => this.enterScene());
      mc.appendChild(div);
    });
    this.updateSidebar();
  }
  updateSidebar() {
    const s = document.getElementById('sidebar-stats');
    if (s) s.innerHTML = '<div class="stat-item">积分: '+this.engine.state.score+'</div><div class="stat-item">信物: '+this.engine.state.items.length+'/'+Object.keys(this.engine.data.items).length+'</div><div class="stat-item">进度: '+this.engine.state.completedScenes.length+'/8</div>';
  }
  enterScene() {
    const scene = this.engine.getCurrentScene(); if (!scene) return;
    this.choiceMade = false; this.currentQuestionIndex = 0; this.livesRemaining = this.engine.getLives();
    this.showScreen('scene'); this.renderScene(scene);
  }
  renderScene(scene) {
    const c = document.getElementById('scene-content');
    let html = '<div class="scene-header"><h2>'+scene.name+'</h2><p class="scene-subtitle">'+scene.subtitle+'</p></div>';
    html += '<div class="scene-description"><p>'+scene.description+'</p></div>';
    const clue = this.engine.getHiddenClue();
    if (clue) html += '<div class="hidden-clue"><span>?? 隐藏线索：</span>'+clue+'</div>';
    const bonus = this.engine.getBonusStory();
    if (bonus) html += '<div class="bonus-story"><span>?? </span>'+bonus+'</div>';
    html += '<div class="choices" id="scene-choices">';
    scene.choices.forEach((ch, i) => { html += '<button class="choice-btn" data-index="'+i+'">'+ch.text+'</button>'; });
    html += '</div><div class="quiz-area" id="quiz-area" style="display:none;"></div>';
    c.innerHTML = html;
    c.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => { if (!this.choiceMade) { this.choiceMade = true; this.onChoice(parseInt(e.target.dataset.index)); } });
    });
  }
  onChoice(index) {
    const result = this.engine.makeChoice(index); if (!result.success) return;
    const cd = document.getElementById('scene-choices');
    cd.innerHTML = '<div class="choice-result"><p>获得积分: +'+result.scoreGain+'</p>'+(result.reward.item?'<p>获得信物: '+this.engine.data.items[result.reward.item].name+'</p>':'')+'</div>';
    setTimeout(() => this.startQuiz(), 1500);
  }
  startQuiz() { document.getElementById('quiz-area').style.display = 'block'; this.renderQuestion(); }
  renderQuestion() {
    const scene = this.engine.getCurrentScene(); const qa = document.getElementById('quiz-area');
    if (this.currentQuestionIndex >= scene.questions.length) { this.onSceneComplete(); return; }
    if (this.livesRemaining <= 0) { this.onSceneFail(); return; }
    const q = scene.questions[this.currentQuestionIndex];
    let html = '<div class="quiz-header"><span>第 '+(this.currentQuestionIndex+1)+'/'+scene.questions.length+' 题</span><span>剩余机会: '+'??'.repeat(this.livesRemaining)+'</span></div>';
    html += '<div class="question-text">'+q.text+'</div><div class="options">';
    q.options.forEach((opt, i) => { html += '<button class="option-btn" data-index="'+i+'">'+opt+'</button>'; });
    html += '</div>';
    if (this.engine.state.character.talentEffect.freeHint) html += '<button class="hint-btn" id="btn-hint">?? 使用提示</button>';
    qa.innerHTML = html;
    qa.querySelectorAll('.option-btn').forEach(btn => { btn.addEventListener('click', (e) => this.onAnswer(parseInt(e.target.dataset.index))); });
    const hb = document.getElementById('btn-hint');
    if (hb) hb.addEventListener('click', () => { const h = this.engine.useHint(this.currentQuestionIndex); if (h.success) { qa.querySelectorAll('.option-btn')[h.answer].classList.add('hint-highlight'); hb.remove(); } });
  }
  onAnswer(answerIndex) {
    const result = this.engine.answerQuestion(this.currentQuestionIndex, answerIndex);
    if (result.correct) { this.showFeedback(true, result.autoCorrect?'天赋自动答对！':'回答正确！'); this.currentQuestionIndex++; }
    else { this.livesRemaining--; this.showFeedback(false, '回答错误'); if (this.livesRemaining <= 0) { setTimeout(() => this.onSceneFail(), 1000); return; } }
    setTimeout(() => this.renderQuestion(), 1200);
  }
  showFeedback(correct, msg) {
    const f = document.createElement('div'); f.className = 'feedback '+(correct?'correct':'wrong'); f.textContent = msg;
    document.getElementById('quiz-area').appendChild(f); setTimeout(() => f.remove(), 1000);
  }
  onSceneComplete() {
    this.engine.completeScene(); this.storage.save(this.engine.state);
    if (this.engine.state.currentScene >= this.engine.data.scenes.length) { this.showEnding(); }
    else { document.getElementById('quiz-area').innerHTML = '<div class="scene-complete"><h3>?? 恭喜通关！</h3><p>即将返回大观园地图...</p></div>'; setTimeout(() => { this.showScreen('map'); this.renderMap(); }, 2000); }
  }
  onSceneFail() {
    const qa = document.getElementById('quiz-area');
    const wt = this.engine.state.character.talentEffect.reviveTimeHalf ? 15 : 30;
    qa.innerHTML = '<div class="scene-fail"><h3>答题机会已用尽</h3><p>选择复活方式：</p><button class="revive-btn" id="btn-revive-share">分享至微信，立即复活</button><button class="revive-btn" id="btn-revive-wait">等待恢复（'+wt+'分钟）</button></div>';
    document.getElementById('btn-revive-share').addEventListener('click', () => { this.engine.revive('share'); this.livesRemaining = this.engine.getLives(); this.renderQuestion(); });
    document.getElementById('btn-revive-wait').addEventListener('click', () => { qa.innerHTML = '<div class="wait-message"><p>请'+wt+'分钟后再来挑战</p></div>'; });
  }
  showEnding() {
    const ending = this.engine.getEnding(); const stats = this.engine.getStats();
    this.showScreen('ending');
    document.getElementById('ending-content').innerHTML = '<div class="ending-card"><h2>'+ending.title+'</h2><p class="ending-text">'+ending.text+'</p><div class="final-stats"><div>身份：'+stats.character.name+'</div><div>总积分：'+stats.score+'</div><div>通关场景：'+stats.scenesCompleted+'/'+stats.totalScenes+'</div><div>收集信物：'+stats.itemsCollected+'/'+stats.totalItems+'</div></div></div>';
    this.storage.save(this.engine.state);
  }
  generatePoster() {
    const stats = this.engine.getStats(); const canvas = document.getElementById('poster-canvas'); const ctx = canvas.getContext('2d');
    canvas.width = 750; canvas.height = 1334;
    ctx.fillStyle = '#f5f0e8'; ctx.fillRect(0,0,750,1334);
    ctx.fillStyle = '#4a2c17'; ctx.font = 'bold 48px serif'; ctx.textAlign = 'center'; ctx.fillText('大观园寻梦记', 375, 120);
    ctx.font = '28px serif'; ctx.fillStyle = '#8b6914'; ctx.fillText('红楼雅客', 375, 170);
    ctx.font = 'bold 36px serif'; ctx.fillStyle = '#4a2c17'; ctx.fillText(stats.character.name, 375, 350);
    ctx.font = '24px serif'; ctx.fillStyle = '#666'; ctx.fillText(stats.character.poem, 375, 400);
    ctx.font = '28px sans-serif'; ctx.fillStyle = '#333';
    ctx.fillText('通关: '+stats.scenesCompleted+'/'+stats.totalScenes, 375, 550);
    ctx.fillText('信物: '+stats.itemsCollected+'/'+stats.totalItems, 375, 600);
    ctx.fillText('积分: '+stats.score, 375, 650);
    ctx.font = 'bold 32px serif'; ctx.fillStyle = '#8b4513'; ctx.fillText('结局：'+stats.ending.title, 375, 780);
    const pt = this.engine.data.posterTexts[Math.floor(Math.random()*3)];
    ctx.font = '22px serif'; ctx.fillStyle = '#999'; ctx.fillText(pt, 375, 1100);
    canvas.style.display = 'block';
  }
  onRestart() { this.storage.clear(); this.engine.newGame(); this.showScreen('cover'); }
  getCharacterEmoji(id) {
    const e = {jia_baoyu:'??',lin_daiyu:'??',xue_baochai:'??',wang_xifeng:'??',shi_xiangyun:'??',jia_tanchun:'??',miao_yu:'??',li_wan:'??',jia_yingchun:'??',jia_xichun:'???',qin_keqing:'??',qiao_jie:'??',xiang_ling:'??'};
    return e[id] || '??';
  }
}
if (typeof module !== 'undefined' && module.exports) { module.exports = { GameUI }; }
