/**
 * Server chính cho App Live Stream Đi Chùa Bái Phật ("Thiền Đường Tịnh Tâm")
 * Phục vụ Overlay (Canvas/Three.js), kết nối WinForms Control Panel và TikFinity.
 */

const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const { SeatManager } = require('./seatManager');
const { synthesizeChantSpeech } = require('./ttsService');
const { TikTokGiftService } = require('./tiktokGiftService');
const { StatePersistence } = require('./statePersistence');

let TikTokLiveConnection = null;
let LegacyWebcastPushConnection = null;
try {
  const ttk = require('tiktok-live-connector');
  TikTokLiveConnection = ttk.TikTokLiveConnection;
  try {
    LegacyWebcastPushConnection = require('tiktok-live-connector/dist/legacy.js').WebcastPushConnection;
  } catch (_) {}
} catch (err) {
  console.warn('[TikTokLive] tiktok-live-connector chưa nạp:', err.message);
}

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const crypto = require('crypto');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'adm';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Datvip@33';
const activeAuthTokens = new Set();

function parseCookies(req) {
  const list = {};
  const rc = req && req.headers && req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      if (parts.length >= 2) {
        list[parts[0].trim()] = decodeURI(parts.slice(1).join('='));
      }
    });
  }
  return list;
}

function isAuthorized(req) {
  const cookies = parseCookies(req);
  const token = cookies.thien_duong_auth;
  if (token && activeAuthTokens.has(token)) return true;

  const authHeader = req.headers['x-admin-token'] || req.headers['authorization'];
  if (authHeader) {
    const clean = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (clean === ADMIN_PASSWORD || activeAuthTokens.has(clean)) return true;
  }

  const ip = req.ip || (req.socket && req.socket.remoteAddress) || '';
  const isLoopback = ip.includes('127.0.0.1') || ip.includes('::1') || ip === 'localhost';
  if (isLoopback && (req.headers['x-admin-token'] === ADMIN_PASSWORD || req.headers['x-local-client'] === 'winforms')) {
    return true;
  }

  return false;
}

function requireAuth(req, res, next) {
  if (isAuthorized(req)) {
    return next();
  }
  return res.status(401).json({
    ok: false,
    message: 'Yêu cầu đăng nhập tài khoản quản trị (Unauthorized)'
  });
}

function isSocketAuthorized(socket) {
  const cookieStr = (socket.request && socket.request.headers && socket.request.headers.cookie) || '';
  const cookies = {};
  cookieStr.split(';').forEach(c => {
    const parts = c.split('=');
    if (parts.length >= 2) cookies[parts[0].trim()] = decodeURI(parts.slice(1).join('='));
  });
  if (cookies.thien_duong_auth && activeAuthTokens.has(cookies.thien_duong_auth)) return true;

  const authVal = socket.handshake && socket.handshake.auth && socket.handshake.auth.token;
  if (authVal && (authVal === ADMIN_PASSWORD || activeAuthTokens.has(authVal))) return true;

  const ip = socket.handshake.address || '';
  if (ip.includes('127.0.0.1') || ip.includes('::1') || ip === 'localhost') return true;

  return false;
}

const overlayDir = path.join(__dirname, '..', 'overlay');
app.get('/favicon.ico', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(overlayDir, 'favicon.svg'));
});

// Trang Đăng Nhập
app.get('/login', (req, res) => {
  if (isAuthorized(req)) {
    return res.redirect('/admin');
  }
  res.sendFile(path.join(overlayDir, 'login.html'));
});

// API Đăng Nhập
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(32).toString('hex');
    activeAuthTokens.add(token);
    res.setHeader('Set-Cookie', `thien_duong_auth=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    console.log(`[Auth] Quản trị viên [${username}] đã đăng nhập thành công.`);
    return res.json({ ok: true, token });
  }
  console.warn(`[Auth] Đăng nhập thất bại: username='${username}'`);
  return res.status(401).json({ ok: false, message: 'Sai tài khoản hoặc mật khẩu!' });
});

// API Đăng Xuất
app.post('/api/logout', (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies.thien_duong_auth;
  if (token) activeAuthTokens.delete(token);
  res.setHeader('Set-Cookie', 'thien_duong_auth=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  return res.json({ ok: true });
});

// API Kiểm tra trạng thái đăng nhập
app.get('/api/auth/check', (req, res) => {
  res.json({ authenticated: isAuthorized(req) });
});

// Chặn trang Admin nếu chưa đăng nhập
app.get(['/admin', '/admin.html'], (req, res) => {
  if (!isAuthorized(req)) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(overlayDir, 'admin.html'));
});

// Chặn truy cập file admin.html tĩnh
app.use((req, res, next) => {
  if ((req.path === '/admin.html' || req.path === '/admin') && !isAuthorized(req)) {
    return res.redirect('/login');
  }
  next();
});

app.use(express.static(overlayDir));

const seatManager = new SeatManager();
const statePersistence = new StatePersistence(seatManager);
const restoredState = statePersistence.restoreSnapshot();
if (!restoredState) {
  seatManager.fillSampleSeats(15);
}

const giftService = new TikTokGiftService();
giftService.fetchLiveGiftCatalog().catch(() => {});

function broadcastState() {
  statePersistence.saveSnapshot({
    activeTikTokUsername
  });
  io.emit('state_update', seatManager.getState());
}

// ============================================================================
// 1. API ĐIỀU KHIỂN TỪ WEB ADMIN, WINFORMS & TRÌNH DUYỆT
// ============================================================================

app.get('/api/state', (req, res) => {
  res.json(seatManager.getState());
});

// Cập nhật cấu hình Khung UI (Vị trí, Độ cao OffsetY, Độ mờ Opacity, Gập/Mở)
app.post('/api/hud/config', requireAuth, (req, res) => {
  const updated = seatManager.updateHudConfig(req.body || {});
  io.emit('hud_config_changed', updated);
  broadcastState();
  console.log(`[HUD] Đã cập nhật khung UI: Vị trí=${updated.guidePosition}, OffsetY=${updated.guideOffsetY}px, Opacity=${updated.guideOpacity}`);
  res.json({ ok: true, hudConfig: updated });
});

// Cập nhật tùy chỉnh văn bản trên Overlay (Tên chùa, Phụ đề, Tên Thầy, Bảng hướng dẫn, Bảng công đức)
app.post('/api/text/config', requireAuth, (req, res) => {
  const updated = seatManager.updateTextConfig(req.body || {});
  io.emit('text_config_changed', updated);
  broadcastState();
  console.log('[TextConfig] ✍️ Đã cập nhật văn bản màn hình Live');
  res.json({ ok: true, textConfig: updated });
});

// Khôi phục văn bản mặc định theo mẫu Chùa
app.post('/api/text/reset', requireAuth, (req, res) => {
  const updated = seatManager.resetTextConfig();
  io.emit('text_config_changed', updated);
  broadcastState();
  console.log('[TextConfig] 🔄 Đã khôi phục văn bản mặc định');
  res.json({ ok: true, textConfig: updated });
});

// Làm mới toàn bộ màn hình Overlay (OBS Studio / Trình duyệt) tức thời
app.post('/api/overlay/reload', requireAuth, (req, res) => {
  io.emit('reload_overlay', {});
  console.log('[Overlay] 🔄 Đã gửi lệnh làm mới tất cả màn hình Overlay');
  res.json({ ok: true });
});

// Lấy danh sách quà tặng tự động từ TikTok Webcast API
app.get('/api/tiktok/gifts', async (req, res) => {
  if (giftService.getGifts().length <= 20) {
    await giftService.fetchLiveGiftCatalog();
  }
  const gifts = giftService.getGifts();
  res.json({
    ok: true,
    count: gifts.length,
    gifts
  });
});

app.post('/api/tiktok/gifts/refresh', requireAuth, async (req, res) => {
  const roomId = (req.body && req.body.roomId) || giftService.lastRoomId;
  const gifts = await giftService.fetchLiveGiftCatalog(roomId);
  res.json({
    ok: true,
    count: gifts.length,
    gifts
  });
});

// Đổi giao diện chùa (1..5)
app.post('/api/theme', requireAuth, (req, res) => {
  const { themeId } = req.body;
  const theme = seatManager.setTheme(themeId);
  io.emit('theme_changed', {
    themeId: seatManager.currentThemeId,
    theme
  });
  broadcastState();
  console.log(`[Theme] Đã chuyển sang: ${theme.name}`);
  res.json({ ok: true, theme });
});

// Đổi chế độ số lượng Slot (auto, 24, 36, 48, 64, 100)
app.post('/api/seats/mode', requireAuth, (req, res) => {
  const { slotMode } = req.body || {};
  const state = seatManager.setSlotMode(slotMode);
  broadcastState();
  console.log(`[Seats] Đã đổi quy mô phòng thiền: ${state.slotMode} (${state.occupiedCount}/${state.totalSeats} chỗ)`);
  res.json({ ok: true, state });
});

// Xử lý bình luận (từ WinForms Simulator hoặc TikFinity)
app.post('/api/comment', requireAuth, (req, res) => {
  const { uniqueId, nickname, comment, avatarUrl } = req.body;
  const result = seatManager.handleComment({ uniqueId, nickname, comment, avatarUrl });
  io.emit('seat_event', result);
  broadcastState();
  console.log(`[Comment] ${nickname || uniqueId}: "${comment}" -> Ghế #${result.seatIndex + 1} (${result.seat.user.skin})`);
  res.json({ ok: true, result });
});

// Xử lý tặng quà & Xướng tên hồi hướng công đức (Tự động đồng bộ giọng đọc đã chọn!)
app.post('/api/gift', requireAuth, async (req, res) => {
  const {
    uniqueId,
    nickname,
    giftName,
    diamondCount,
    repeatCount,
    presetId,
    voiceName,
    pitchHz,
    ratePercent,
    reverbLevel
  } = req.body || {};

  // Nếu WinForms gửi kèm cấu hình giọng đang chọn -> Cập nhật ngay trước khi phát!
  if (presetId || voiceName || pitchHz !== undefined || ratePercent !== undefined) {
    const voicePatch = {};
    if (presetId) voicePatch.presetId = presetId;
    if (voiceName) voicePatch.voiceName = voiceName;
    if (pitchHz !== undefined) voicePatch.pitchHz = Number(pitchHz);
    if (ratePercent !== undefined) voicePatch.ratePercent = Number(ratePercent);
    if (reverbLevel !== undefined) voicePatch.reverbLevel = Number(reverbLevel);
    seatManager.updateVoiceConfig(voicePatch);
    io.emit('voice_config_changed', seatManager.voiceConfig);
  }

  const result = seatManager.handleGift({
    uniqueId,
    nickname,
    giftName: giftName || 'Hoa Sen Vàng',
    diamondCount: diamondCount || 10,
    repeatCount: repeatCount || 1
  });

  io.emit('gift_event', result);
  broadcastState();
  console.log(`[Gift] 🎁 ${result.donorName} tặng ${result.giftName} (+${result.points} Công Đức) [Giọng: ${seatManager.voiceConfig.id}, Pitch: ${seatManager.voiceConfig.pitchHz}Hz]`);

  // Phát giọng đọc kinh xướng tên hồi hướng công đức theo đúng cấu hình giọng đã chọn
  triggerChantSpeech(result.chantText, {
    type: 'merit_dedication',
    donorName: result.donorName,
    giftName: result.giftName,
    seatIndex: result.seatIndex
  });

  res.json({
    ok: true,
    result,
    voiceConfig: seatManager.voiceConfig,
    overlayClientsCount: io.engine ? io.engine.clientsCount : 0
  });
});

// Điền mẫu N người ngồi thiền (15, 36, 64, 100)
app.post('/api/seats/sample', requireAuth, (req, res) => {
  const count = (req.body && req.body.count) ? Number(req.body.count) : 15;
  seatManager.fillSampleSeats(count);
  broadcastState();
  io.emit('bell_ring', { reason: 'sample_fill' });
  console.log(`[Seats] Đã điền mẫu ${count}/${seatManager.currentTier.total} thiền sinh`);
  res.json({ ok: true, state: seatManager.getState() });
});

// Xóa 1 ghế hoặc làm trống toàn bộ bồ đoàn
app.post('/api/seats/clear', requireAuth, (req, res) => {
  const { seatIndex } = req.body || {};
  if (typeof seatIndex === 'number') {
    seatManager.clearSeat(seatIndex);
    console.log(`[Seats] Đã giải phóng ghế #${seatIndex + 1}`);
  } else {
    seatManager.clearAllSeats();
    console.log('[Seats] Đã làm trống toàn bộ bồ đoàn');
  }
  broadcastState();
  res.json({ ok: true, state: seatManager.getState() });
});

// Đổi skin trực tiếp cho 1 ghế
app.post('/api/seats/skin', requireAuth, (req, res) => {
  const { seatIndex, skin, nickname } = req.body;
  if (typeof seatIndex === 'number' && seatManager.seats[seatIndex]) {
    const seat = seatManager.seats[seatIndex];
    if (!seat.occupied) {
      seat.occupied = true;
      seat.user = {
        uniqueId: `manual_${seatIndex}_${Date.now()}`,
        nickname: nickname || `Phật Tử ${seatIndex + 1}`,
        skin: skin || 'nam',
        joinedAt: Date.now(),
        lastActive: Date.now(),
        meritPoints: 0,
        prayerText: 'Nam Mô A Di Đà Phật 🙏'
      };
    } else {
      seat.user.skin = skin || seat.user.skin;
      if (nickname) seat.user.nickname = nickname;
    }
    io.emit('seat_event', {
      action: 'change_skin',
      seatIndex,
      seat
    });
    broadcastState();
    return res.json({ ok: true, seat });
  }
  res.status(400).json({ ok: false, error: 'Invalid seatIndex' });
});

// Cho phép chọn file nhạc nền .MP3 bất kỳ trên máy tính để phát trên Overlay & WinForms
let customMp3FilePath = '';
app.post('/api/music/custom', requireAuth, (req, res) => {
  const { filePath } = req.body || {};
  if (filePath && require('fs').existsSync(filePath)) {
    customMp3FilePath = filePath;
    const customUrl = `/api/music/stream?t=${Date.now()}`;
    seatManager.updateVoiceConfig({
      bgMusicEnabled: true,
      bgMusicTrack: 'custom_mp3',
      customMp3Url: customUrl
    });
    io.emit('voice_config_changed', seatManager.voiceConfig);
    broadcastState();
    console.log(`[Music] 🎵 Đã nạp nhạc nền MP3 tùy chọn: ${filePath}`);
    return res.json({ ok: true, customMp3Url: customUrl, voiceConfig: seatManager.voiceConfig });
  }
  res.json({ ok: false, error: 'Không tìm thấy file MP3' });
});

app.get('/api/music/stream', (req, res) => {
  if (!customMp3FilePath || !require('fs').existsSync(customMp3FilePath)) {
    return res.status(404).end();
  }
  res.sendFile(customMp3FilePath);
});

// Cập nhật cấu hình Giọng Nam Ấm Đọc Kinh & Âm Thanh / Nhạc Nền
app.post('/api/voice/config', requireAuth, (req, res) => {
  const updated = seatManager.updateVoiceConfig(req.body || {});
  io.emit('voice_config_changed', updated);
  broadcastState();
  console.log(`[Audio] Đã cập nhật: Giọng=${updated.id} (${updated.pitchHz}Hz), Nhạc nền=${updated.bgMusicTrack}`);
  res.json({ ok: true, voiceConfig: updated });
});

// Đọc kinh / Niệm Phật / Xướng tên theo yêu cầu
app.post('/api/chant', requireAuth, async (req, res) => {
  const body = req.body || {};
  if (body.presetId || body.voiceName || body.pitchHz !== undefined || body.ratePercent !== undefined) {
    seatManager.updateVoiceConfig(body);
    io.emit('voice_config_changed', seatManager.voiceConfig);
  }
  const customText = body.text ? body.text : seatManager.getNextScriptureChant();
  await triggerChantSpeech(customText, {
    type: 'scripture_chant',
    title: 'Kệ Tịnh Tâm & Hồi Hướng'
  });
  res.json({
    ok: true,
    text: customText,
    voiceConfig: seatManager.voiceConfig,
    overlayClientsCount: io.engine ? io.engine.clientsCount : 0
  });
});

// Gõ chuông hoặc mõ thủ công từ WinForms
app.post('/api/sound/trigger', requireAuth, (req, res) => {
  const { soundType } = req.body || {};
  if (soundType === 'wooden_fish') {
    io.emit('wooden_fish_hit', {});
  } else {
    io.emit('bell_ring', { reason: 'manual' });
  }
  res.json({ ok: true });
});

// Endpoint stream file MP3 giọng đọc kinh (hỗ trợ truyền trực tiếp thông số để nghe thử trên WinForms)
app.get('/api/tts', async (req, res) => {
  const text = req.query.text || 'Nam Mô A Di Đà Phật';
  const tempConfig = { ...seatManager.voiceConfig };
  if (req.query.presetId && seatManager.getState().voicePresets[req.query.presetId]) {
    Object.assign(tempConfig, seatManager.getState().voicePresets[req.query.presetId]);
  }
  if (req.query.voiceName) tempConfig.voiceName = req.query.voiceName;
  if (req.query.pitchHz !== undefined) tempConfig.pitchHz = Number(req.query.pitchHz);
  if (req.query.ratePercent !== undefined) tempConfig.ratePercent = Number(req.query.ratePercent);

  const result = await synthesizeChantSpeech(text, tempConfig);
  if (!result || !result.buffer) {
    return res.status(500).json({ ok: false, error: 'Không thể tạo âm thanh TTS' });
  }
  res.set({
    'Content-Type': 'audio/mpeg',
    'Content-Length': result.buffer.length,
    'Cache-Control': 'no-cache'
  });
  res.send(result.buffer);
});

async function triggerChantSpeech(text, meta = {}) {
  try {
    const activeVoiceConfig = { ...seatManager.voiceConfig };
    const ttsRes = await synthesizeChantSpeech(text, activeVoiceConfig);
    const audioBase64 = ttsRes && ttsRes.buffer ? ttsRes.buffer.toString('base64') : null;
    io.emit('chant_speech', {
      text,
      audioBase64,
      engine: ttsRes ? ttsRes.engine : 'web-speech-fallback',
      voiceConfig: activeVoiceConfig,
      ...meta
    });
  } catch (err) {
    console.error('[ChantSpeech] Error:', err.message);
  }
}

// ============================================================================
// 2. KẾT NỐI TRỰC TIẾP TIKTOK LIVE (@USERNAME), AUTO-DEMO & CỔNG TIKFINITY
// ============================================================================

let activeTikTokConnection = null;
let activeTikTokUsername = '';
let autoDemoTimer = null;

function extractTikTokUsername(input) {
  let s = String(input || '').trim();
  const match = s.match(/tiktok\.com\/@([^/?#&]+)/i);
  if (match && match[1]) return match[1];
  return s.replace(/^@+/, '').split(/[/?#&\s]/)[0];
}

app.post('/api/tiktok/connect', requireAuth, async (req, res) => {
  const rawUser = extractTikTokUsername(req.body && req.body.username);
  if (!rawUser || rawUser === 'ten_kenh_tiktok') {
    return res.json({
      ok: false,
      error: 'Bạn chưa nhập ID kênh TikTok thật (đang để @ten_kenh_tiktok). Hãy nhập @username kênh đang phát LIVE, hoặc bấm [🤖 Giả Lập Live] để test tự động!'
    });
  }

  const ConnClass = TikTokLiveConnection || LegacyWebcastPushConnection;
  if (!ConnClass) {
    return res.json({ ok: false, error: 'Chưa nạp được thư viện tiktok-live-connector' });
  }

  if (activeTikTokConnection) {
    try { activeTikTokConnection.disconnect(); } catch (_) {}
    activeTikTokConnection = null;
  }

  try {
    const conn = new ConnClass(rawUser, {
      processInitialData: true,
      enableExtendedGiftInfo: false
    });

    const state = await conn.connect();
    activeTikTokConnection = conn;
    activeTikTokUsername = rawUser;

    // Tự động làm mới danh sách quà tặng theo đúng RoomId phiên Live vừa kết nối
    giftService.fetchLiveGiftCatalog(state.roomId).catch(() => {});

    console.log(`[TikTokLive] ✅ Đã kết nối trực tiếp phòng Live của @${rawUser} (RoomId: ${state.roomId})`);
    io.emit('tiktok_status', { connected: true, username: rawUser, roomId: state.roomId });

    conn.on('chat', data => {
      const userObj = data.user || {};
      const nickname = data.nickname || userObj.nickname || userObj.uniqueId || userObj.displayId || 'Phật Tử';
      const uniqueId = data.uniqueId || userObj.uniqueId || userObj.displayId || userObj.id || data.userId || nickname;
      const comment = data.comment || data.content || '';
      const avatarUrl = data.profilePictureUrl || userObj.profilePictureUrl || '';

      const r = seatManager.handleComment({ uniqueId, nickname, comment, avatarUrl });
      io.emit('seat_event', r);
      broadcastState();
      console.log(`[TikTok Chat] ${nickname}: "${comment}" -> Ghế #${r.seatIndex + 1} (${r.seat.user.skin}) [${r.action}]`);
    });

    conn.on('gift', data => {
      const giftType = data.giftType ?? (data.giftDetails && data.giftDetails.giftType);
      const repeatEnd = data.repeatEnd ?? data.repeatEnd;
      if (giftType === 1 && !repeatEnd) return;

      const userObj = data.user || {};
      const nickname = data.nickname || userObj.nickname || userObj.uniqueId || userObj.displayId || 'Thí Chủ';
      const uniqueId = data.uniqueId || userObj.uniqueId || userObj.displayId || userObj.id || data.userId || nickname;
      const resolvedGift = giftService.resolveGift(data);
      const giftName = resolvedGift.giftName;
      const diamondCount = resolvedGift.diamondCount;
      const repeatCount = data.repeatCount || 1;

      const r = seatManager.handleGift({ uniqueId, nickname, giftName, diamondCount, repeatCount });
      io.emit('gift_event', r);
      broadcastState();
      triggerChantSpeech(r.chantText, {
        type: 'merit_dedication',
        donorName: r.donorName,
        giftName: r.giftName,
        seatIndex: r.seatIndex
      });
      console.log(`[TikTok Gift] 🎁 ${nickname} tặng ${resolvedGift.displayGiftName} (ID:${resolvedGift.giftId}, ${diamondCount} xu) x${repeatCount}`);
    });

    conn.on('streamEnd', () => {
      console.log(`[TikTokLive] Phiên Live của @${rawUser} đã kết thúc.`);
      io.emit('tiktok_status', { connected: false, username: rawUser });
    });

    conn.on('error', err => {
      console.warn('[TikTokLive] Warning:', err ? err.message : err);
    });

    return res.json({
      ok: true,
      username: rawUser,
      roomId: state.roomId,
      giftCount: giftService.getGifts().length
    });
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    console.warn(`[TikTokLive] Không thể kết nối @${rawUser}:`, msg);
    return res.json({
      ok: false,
      error: `Kênh @${rawUser} hiện chưa phát LIVE trên TikTok (hoặc đã tắt Live). Chi tiết: ${msg}`
    });
  }
});

app.post('/api/tiktok/disconnect', requireAuth, (req, res) => {
  if (activeTikTokConnection) {
    try { activeTikTokConnection.disconnect(); } catch (_) {}
    activeTikTokConnection = null;
  }
  activeTikTokUsername = '';
  io.emit('tiktok_status', { connected: false, username: '' });
  res.json({ ok: true });
});

// Chế độ Giả Lập Luồng Người Xem Bình Luận Tự Động (Auto-Demo Live)
app.post('/api/tiktok/autodemo', requireAuth, (req, res) => {
  const enable = req.body && req.body.enable !== undefined ? Boolean(req.body.enable) : !autoDemoTimer;
  if (autoDemoTimer) {
    clearInterval(autoDemoTimer);
    autoDemoTimer = null;
  }

  if (enable) {
    const demoNames = ['Phúc Lâm', 'Tâm An', 'Hồng Nhung', 'Gia Bảo', 'Thanh Tùng', 'Bích Ngọc', 'Minh Khang', 'Thảo Vy', 'Quốc Khánh', 'Diệu Hiền', 'Nhật Minh', 'Kim Ngân'];
    const demoComments = [
      'nam Nam Mô A Di Đà Phật 🙏',
      'nữ Cầu gia đình bình an sức khỏe',
      'sư Con xin quy y Tam Bảo',
      'tiểu Chú tiểu xin vào ngồi thiền ạ',
      'ni Nam Mô Quán Thế Âm Bồ Tát',
      'cao tăng Nguyện cầu quốc thái dân an',
      'sen Cầu bình an cho cha mẹ',
      'cảnh sát Chúc bà con bình an thượng lộ',
      'bác sĩ Cầu sức khỏe bình an cho mọi nhà',
      'trộm Con xin hoàn lương hướng thiện ạ',
      'heo Bát Giới xin tịnh tâm niệm Phật',
      'bò Chăm chỉ tu tập mỗi ngày',
      'gà Dậy sớm tụng kinh cầu an',
      'học sinh Nam Mô A Di Đà Phật, cầu thi cử đỗ đạt',
      'đức cha Nguyện cầu bình an và hòa ái muôn nơi',
      'thần tài Cầu tài lộc, gia đạo hưng thịnh',
      'ninja Tìm về chốn thanh tịnh tu tâm',
      'công chúa Cầu quốc thái dân an, tâm an lạc',
      'adidaphat con xin dâng hương cúng Phật 🙏',
      'adidaphat thành tâm lễ Phật',
      'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật'
    ];
    let step = 0;
    autoDemoTimer = setInterval(() => {
      step++;
      const name = demoNames[Math.floor(Math.random() * demoNames.length)] + ' ' + (10 + (step % 89));
      const uid = `demo_${step % 45}`;
      if (step % 7 === 0) {
        // Cứ mỗi 7 lượt bình luận thì có 1 người tặng quà (Lấy từ danh sách quà TikTok API)
        const catalog = giftService.getGifts();
        const pick = catalog.length > 0
          ? catalog[Math.floor(Math.random() * Math.min(25, catalog.length))]
          : { name: 'Hoa Sen Vàng', diamondCount: 20 };
        const cleanGiftName = String(pick.name).replace(/\s*\([^)]*\)\s*/g, '').trim() || pick.name;

        const giftRes = seatManager.handleGift({
          uniqueId: uid,
          nickname: name,
          giftName: cleanGiftName,
          diamondCount: pick.diamondCount || 20,
          repeatCount: 1
        });
        io.emit('gift_event', giftRes);
        broadcastState();
        triggerChantSpeech(giftRes.chantText, {
          type: 'merit_dedication',
          donorName: giftRes.donorName,
          giftName: giftRes.giftName,
          seatIndex: giftRes.seatIndex
        });
      } else {
        const cmt = demoComments[Math.floor(Math.random() * demoComments.length)];
        const cmtRes = seatManager.handleComment({
          uniqueId: uid,
          nickname: name,
          comment: cmt
        });
        io.emit('seat_event', cmtRes);
        broadcastState();
      }
    }, 3500);
    console.log('[AutoDemo] 🤖 Đã BẬT chế độ giả lập người xem bình luận & tặng quà tự động');
  } else {
    console.log('[AutoDemo] ⏹ Đã TẮT chế độ giả lập tự động');
  }

  res.json({ ok: true, running: Boolean(autoDemoTimer) });
});

// ============================================================================
// CỔNG KẾT NỐI TIKFINITY (WEBHOOK + LOCAL WEBSOCKET BRIDGE)
// ============================================================================

app.all('/api/tikfinity/webhook', async (req, res) => {
  const payload = { ...(req.query || {}), ...(req.body || {}) };
  const eventType = String(payload.event || payload.type || 'comment').toLowerCase();
  const uniqueId = payload.uniqueId || payload.username || payload.userId || `tf_${Date.now()}`;
  const nickname = payload.nickname || payload.displayName || payload.username || 'Phật Tử';

  if (eventType.includes('gift')) {
    const giftRes = seatManager.handleGift({
      uniqueId,
      nickname,
      giftName: payload.giftName || 'Hoa Sen Công Đức',
      diamondCount: Number(payload.diamondCount || payload.coins || 5),
      repeatCount: Number(payload.repeatCount || 1)
    });
    io.emit('gift_event', giftRes);
    broadcastState();
    triggerChantSpeech(giftRes.chantText, {
      type: 'merit_dedication',
      donorName: giftRes.donorName,
      giftName: giftRes.giftName,
      seatIndex: giftRes.seatIndex
    });
    return res.json({ ok: true, handled: 'gift', giftRes });
  }

  const commentText = payload.comment || payload.text || payload.message || 'Nam Mô A Di Đà Phật';
  const commentRes = seatManager.handleComment({
    uniqueId,
    nickname,
    comment: commentText,
    avatarUrl: payload.profilePictureUrl || ''
  });
  io.emit('seat_event', commentRes);
  broadcastState();
  res.json({ ok: true, handled: 'comment', commentRes });
});

let tikfinityWs = null;
function connectTikFinitySocket() {
  try {
    tikfinityWs = new WebSocket('ws://127.0.0.1:21213/');
    tikfinityWs.on('open', () => {
      console.log('[TikFinity] ✅ Đã kết nối trực tiếp với TikFinity Local WebSocket (port 21213)');
      io.emit('tikfinity_status', { connected: true });
    });
    tikfinityWs.on('message', raw => {
      try {
        const msg = JSON.parse(raw.toString());
        const event = msg.event;
        const data = msg.data || {};
        if (event === 'chat' || event === 'comment') {
          const r = seatManager.handleComment({
            uniqueId: data.uniqueId,
            nickname: data.nickname,
            comment: data.comment
          });
          io.emit('seat_event', r);
          broadcastState();
        } else if (event === 'gift') {
          if (data.giftType === 1 && !data.repeatEnd) return;
          const r = seatManager.handleGift({
            uniqueId: data.uniqueId,
            nickname: data.nickname,
            giftName: data.giftName || 'Vật Phẩm Công Đức',
            diamondCount: data.diamondCount || 1,
            repeatCount: data.repeatCount || 1
          });
          io.emit('gift_event', r);
          broadcastState();
          triggerChantSpeech(r.chantText, {
            type: 'merit_dedication',
            donorName: r.donorName,
            giftName: r.giftName,
            seatIndex: r.seatIndex
          });
        }
      } catch (e) {}
    });
    tikfinityWs.on('close', () => {
      io.emit('tikfinity_status', { connected: false });
      setTimeout(connectTikFinitySocket, 10000);
    });
    tikfinityWs.on('error', () => {});
  } catch (err) {
    setTimeout(connectTikFinitySocket, 10000);
  }
}
connectTikFinitySocket();

setInterval(() => {
  const cfg = seatManager.voiceConfig;
  if (!cfg.autoChantEnabled) return;
  const elapsedSec = Math.floor((Date.now() - (seatManager._lastAutoChant || 0)) / 1000);
  if (elapsedSec >= (cfg.autoChantIntervalSec || 120)) {
    seatManager._lastAutoChant = Date.now();
    const chant = seatManager.getNextScriptureChant();
    triggerChantSpeech(chant, {
      type: 'scripture_chant',
      title: 'Tụng Kinh Định Kỳ'
    });
  }
}, 15000);

// ============================================================================
// 3. SOCKET.IO CONNECTION
// ============================================================================

io.on('connection', socket => {
  socket.emit('state_update', seatManager.getState());

  socket.on('switch_theme', themeId => {
    if (!isSocketAuthorized(socket)) {
      return console.warn('[Socket] Từ chối switch_theme từ client chưa xác thực');
    }
    const theme = seatManager.setTheme(themeId);
    io.emit('theme_changed', { themeId: seatManager.currentThemeId, theme });
    broadcastState();
  });

  socket.on('update_hud_config', configPatch => {
    if (!isSocketAuthorized(socket)) {
      return console.warn('[Socket] Từ chối update_hud_config từ client chưa xác thực');
    }
    const updated = seatManager.updateHudConfig(configPatch || {});
    io.emit('hud_config_changed', updated);
    broadcastState();
    console.log(`[HUD] Cập nhật vị trí: ${updated.guidePosition} (X:${updated.guidePosX}%, Y:${updated.guidePosY}%, OffsetY:${updated.guideOffsetY}px)`);
  });
});

server.listen(PORT, () => {
  console.log('==================================================================');
  console.log(`🙏 THIỀN ĐƯỜNG TỊNH TÂM SERVER ĐANG CHẠY TẠI: http://localhost:${PORT}`);
  console.log(`📺 Đường dẫn Overlay 9:16: http://localhost:${PORT}`);
  console.log(`🔗 Webhook TikFinity:      http://localhost:${PORT}/api/tikfinity/webhook`);
  console.log('==================================================================');
});
