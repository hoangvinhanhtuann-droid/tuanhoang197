/**
 * Quản lý lưu giữ trạng thái phòng thiền (State Persistence)
 * Giúp bảo toàn danh sách người đang ngồi thiền, điểm công đức và thông tin phòng TikTok Live
 * mỗi khi sửa code hoặc khởi động lại server mà không làm gián đoạn phiên Live!
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'runtime_state.json');

class StatePersistence {
  constructor(seatManager) {
    this.seatManager = seatManager;
    this.saveDebounceTimer = null;
  }

  saveSnapshot(extraData = {}) {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      try {
        const state = this.seatManager.getState();
        const payload = {
          savedAt: Date.now(),
          currentThemeId: this.seatManager.currentThemeId,
          slotMode: this.seatManager.slotMode,
          currentTier: this.seatManager.currentTier,
          seats: this.seatManager.seats,
          meritList: this.seatManager.meritList,
          voiceConfig: this.seatManager.voiceConfig,
          hudConfig: this.seatManager.hudConfig || {
            guidePosition: 'mid_left',
            guideOffsetY: 0,
            guideOpacity: 0.85,
            guideCollapsed: false
          },
          textConfig: this.seatManager.textConfig || {},
          uiLayout: this.seatManager.uiLayout || {},
          ...extraData
        };
        fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2), 'utf8');
      } catch (err) {
        console.warn('[Persistence] Không thể ghi file runtime_state.json:', err.message);
      }
    }, 400);
  }

  restoreSnapshot() {
    try {
      if (!fs.existsSync(STATE_FILE)) return null;
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      if (!raw || !raw.trim()) return null;
      const data = JSON.parse(raw);

      // Nếu dữ liệu được lưu trong vòng 4 giờ qua thì khôi phục lại
      const ageHours = (Date.now() - (data.savedAt || 0)) / (1000 * 60 * 60);
      if (ageHours > 4) {
        console.log('[Persistence] Snapshot cũ hơn 4 giờ, bỏ qua khôi phục.');
        return null;
      }

      if (data.currentThemeId) this.seatManager.currentThemeId = data.currentThemeId;
      if (data.slotMode) this.seatManager.slotMode = data.slotMode;
      if (data.currentTier) this.seatManager.currentTier = data.currentTier;
      if (Array.isArray(data.seats) && data.seats.length > 0) {
        this.seatManager.seats = data.seats;
      }
      if (Array.isArray(data.meritList)) {
        this.seatManager.meritList = data.meritList;
      }
      if (data.voiceConfig) {
        this.seatManager.voiceConfig = { ...this.seatManager.voiceConfig, ...data.voiceConfig };
      }
      if (data.hudConfig) {
        this.seatManager.hudConfig = { ...(this.seatManager.hudConfig || {}), ...data.hudConfig };
      }
      if (data.textConfig) {
        this.seatManager.textConfig = { ...(this.seatManager.textConfig || {}), ...data.textConfig };
      }
      if (data.uiLayout) {
        this.seatManager.uiLayout = { ...(this.seatManager.uiLayout || {}), ...data.uiLayout };
      }

      const occupiedCount = (this.seatManager.seats || []).filter(s => s.occupied).length;
      console.log(`[Persistence] ✅ Đã khôi phục nguyên vẹn trạng thái phòng thiền: ${occupiedCount} người ngồi thiền, Mẫu ${this.seatManager.currentThemeId}, Slot mode: ${this.seatManager.slotMode}`);
      return data;
    } catch (err) {
      console.warn('[Persistence] Lỗi đọc runtime_state.json:', err.message);
      return null;
    }
  }
}

module.exports = {
  StatePersistence
};
