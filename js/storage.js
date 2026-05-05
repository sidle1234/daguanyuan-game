class GameStorage {
  constructor(storageKey) {
    this.storageKey = storageKey || 'daguanyuan_save';
    this.storage = typeof localStorage !== 'undefined' ? localStorage : null;
  }
  save(state) {
    if (!this.storage) return false;
    try { this.storage.setItem(this.storageKey, JSON.stringify({...state, savedAt: Date.now()})); return true; }
    catch (e) { return false; }
  }
  load() {
    if (!this.storage) return null;
    try { const d = this.storage.getItem(this.storageKey); return d ? JSON.parse(d) : null; }
    catch (e) { return null; }
  }
  clear() { if (this.storage) this.storage.removeItem(this.storageKey); }
  hasSave() { return this.storage ? this.storage.getItem(this.storageKey) !== null : false; }
}
if (typeof module !== 'undefined' && module.exports) { module.exports = { GameStorage }; }
