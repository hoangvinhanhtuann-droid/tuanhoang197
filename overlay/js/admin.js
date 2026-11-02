/**
 * Quản lý Bảng Điều Khiển Web Admin cho Thiền Đường Tịnh Tâm
 * Đồng bộ hai chiều thời gian thực qua WebSocket & REST API
 */

(function () {
  // Tự động chuyển hướng về /login nếu gặp lỗi 401 Unauthorized
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await originalFetch.apply(this, args);
    if (res.status === 401 && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    return res;
  };

  const socket = io();
  const audio = new TempleAudioEngine();
  let isAutoDemoRunning = false;
  let voicePresets = {};
  let currentThemeId = 1;

  // DOM Elements - Status
  const badgeSocket = document.getElementById('badge-socket');
  const badgeTiktok = document.getElementById('badge-tiktok');
  const badgeSeats = document.getElementById('badge-seats');
  const logBox = document.getElementById('live-log-box');

  // DOM Elements - Quick Actions
  const btnQuickBell = document.getElementById('btn-quick-bell');
  const btnQuickFish = document.getElementById('btn-quick-fish');
  const btnReloadOverlay = document.getElementById('btn-reload-overlay');
  const btnLogout = document.getElementById('btn-logout');

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      if (confirm('Anh có chắc chắn muốn đăng xuất khỏi Bảng Điều Khiển không?')) {
        try {
          await fetch('/api/logout', { method: 'POST' });
        } catch (_) {}
        localStorage.removeItem('thien_duong_token');
        window.location.href = '/login';
      }
    });
  }

  // DOM Elements - Themes
  const themePreviewImg = document.getElementById('theme-preview-img');
  const txtActiveThemeName = document.getElementById('txt-active-theme-name');
  const themeButtons = document.querySelectorAll('.theme-opt-btn');

  const themeImages = {
    1: '/assets/backgrounds/theme_1_chanhdien.jpg',
    2: '/assets/backgrounds/theme_2_demtrang.jpg',
    3: '/assets/backgrounds/theme_3_cuclac.jpg',
    4: '/assets/backgrounds/theme_4_truclam.jpg',
    5: '/assets/backgrounds/theme_5_3dgame.jpg'
  };

  const themeNames = {
    1: 'Mẫu 1: Chánh Điện Truyền Thống',
    2: 'Mẫu 2: Liên Hoa Đêm Trăng',
    3: 'Mẫu 3: Tây Phương Cực Lạc',
    4: 'Mẫu 4: Thiền Viện Trúc Lâm',
    5: 'Mẫu 5: 3D Game Stylized'
  };

  // DOM Elements - Audio & Voice
  const selectVoicePreset = document.getElementById('select-voice-preset');
  const sliderPitch = document.getElementById('slider-pitch');
  const valPitch = document.getElementById('val-pitch');
  const sliderRate = document.getElementById('slider-rate');
  const valRate = document.getElementById('val-rate');
  const sliderReverb = document.getElementById('slider-reverb');
  const valReverb = document.getElementById('val-reverb');
  const selectBgMusic = document.getElementById('select-bg-music');
  const groupCustomMp3 = document.getElementById('group-custom-mp3');
  const inputCustomMp3 = document.getElementById('input-custom-mp3');
  const btnLoadMp3 = document.getElementById('btn-load-mp3');
  const sliderMusicVol = document.getElementById('slider-music-vol');
  const valMusicVol = document.getElementById('val-music-vol');
  const btnTestTts = document.getElementById('btn-test-tts');
  const btnTriggerChant = document.getElementById('btn-trigger-chant');
  const btnSaveVoice = document.getElementById('btn-save-voice');

  // DOM Elements - Slots & HUD
  const selectSlotMode = document.getElementById('select-slot-mode');
  const btnSampleFills = document.querySelectorAll('.btn-fill-sample');
  const btnClearSeats = document.getElementById('btn-clear-seats');
  const selectHudPos = document.getElementById('select-hud-pos');
  const sliderHudOffsetY = document.getElementById('slider-hud-offsety');
  const valHudOffsetY = document.getElementById('val-hud-offsety');
  const sliderHudOpacity = document.getElementById('slider-hud-opacity');
  const valHudOpacity = document.getElementById('val-hud-opacity');
  const chkHudCollapse = document.getElementById('chk-hud-collapse');
  const btnSaveHud = document.getElementById('btn-save-hud');

  // DOM Elements - Simulator & TikTok
  const inputTiktokUser = document.getElementById('input-tiktok-username');
  const btnTiktokConnect = document.getElementById('btn-tiktok-connect');
  const btnTiktokDisconnect = document.getElementById('btn-tiktok-disconnect');
  const btnToggleAutoDemo = document.getElementById('btn-toggle-autodemo');
  const inputSimNickname = document.getElementById('input-sim-nickname');
  const selectSimSkin = document.getElementById('select-sim-skin');
  const inputSimComment = document.getElementById('input-sim-comment');
  const btnSimJoin = document.getElementById('btn-sim-join');
  const btnSimIncense = document.getElementById('btn-sim-incense');
  const selectSimGift = document.getElementById('select-sim-gift');
  const inputSimRepeat = document.getElementById('input-sim-repeat');
  const btnSimGift = document.getElementById('btn-sim-gift');
  const txtGiftCount = document.getElementById('txt-gift-count');

  // Khởi tạo audio khi click lần đầu
  function ensureAudio() {
    if (!audio.unlocked) {
      audio.initContext();
    }
  }
  window.addEventListener('pointerdown', ensureAudio, { once: true });

  // Ghi nhật ký vào khung log
  function logActivity(text, color = '#d4c2a3') {
    if (!logBox) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const p = document.createElement('div');
    p.style.color = color;
    p.style.marginBottom = '2px';
    p.innerHTML = `<span style="color:#a89578;">[${timeStr}]</span> ${escapeHtml(text)}`;
    logBox.appendChild(p);
    logBox.scrollTop = logBox.scrollHeight;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ==========================================================================
  // 1. KẾT NỐI SOCKET.IO & ĐỒNG BỘ TRẠNG THÁI SERVER
  // ==========================================================================

  socket.on('connect', () => {
    badgeSocket.className = 'status-badge';
    badgeSocket.textContent = '● Server Online';
    logActivity('✅ Đã kết nối với máy chủ quản lý', '#4ade80');
  });

  socket.on('disconnect', () => {
    badgeSocket.className = 'status-badge disconnected';
    badgeSocket.textContent = '● Mất kết nối Server';
    logActivity('❌ Mất kết nối với máy chủ', '#ef4444');
  });

  socket.on('state_update', state => {
    if (!state) return;

    // Cập nhật số người ngồi thiền
    if (badgeSeats) {
      badgeSeats.textContent = `● Đang thiền: ${state.occupiedCount}/${state.totalSeats}`;
    }

    // Cập nhật theme
    if (state.theme && state.theme.id) {
      updateActiveThemeUI(state.theme.id);
    }

    // Cập nhật cấu hình giọng
    if (state.voiceConfig) {
      syncVoiceConfigUI(state.voiceConfig);
    }

    // Cập nhật danh sách mẫu giọng
    if (state.voicePresets) {
      voicePresets = state.voicePresets;
    }

    // Cập nhật cấu hình HUD
    if (state.hudConfig) {
      syncHudConfigUI(state.hudConfig);
    }

    // Cập nhật slot mode
    if (state.slotMode && selectSlotMode) {
      selectSlotMode.value = state.slotMode;
    }
  });

  socket.on('theme_changed', ({ themeId }) => {
    updateActiveThemeUI(themeId);
    logActivity(`🏛️ Giao diện chùa đổi sang: ${themeNames[themeId] || ('Mẫu ' + themeId)}`, '#f6c453');
  });

  socket.on('tiktok_status', data => {
    if (data.connected) {
      badgeTiktok.className = 'status-badge';
      badgeTiktok.textContent = `● TikTok: @${data.username}`;
      btnTiktokConnect.style.display = 'none';
      btnTiktokDisconnect.style.display = 'inline-flex';
      logActivity(`✅ Đã kết nối TikTok Live của @${data.username} (RoomId: ${data.roomId || 'OK'})`, '#4ade80');
    } else {
      badgeTiktok.className = 'status-badge disconnected';
      badgeTiktok.textContent = '● TikTok: Chưa kết nối';
      btnTiktokConnect.style.display = 'inline-flex';
      btnTiktokDisconnect.style.display = 'none';
      logActivity('⏹ Đã ngắt kết nối TikTok Live', '#f87171');
    }
  });

  socket.on('seat_event', evt => {
    if (!evt) return;
    const name = (evt.seat && evt.seat.user && evt.seat.user.nickname) || 'Phật Tử';
    const skin = (evt.seat && evt.seat.user && evt.seat.user.skin) || 'nam';
    const idx = (typeof evt.seatIndex === 'number') ? evt.seatIndex + 1 : '?';

    if (evt.isIncenseOffering || evt.action === 'offer_incense') {
      logActivity(`🪔 [Dâng Hương] Phật tử ${name} (ghế #${idx}) lên cắm nhang bái Phật`, '#fde047');
    } else if (evt.action === 'join_seat') {
      logActivity(`🙏 [Vào Thiền] ${name} ngồi bồ đoàn #${idx} (skin: ${skin})`, '#93c5fd');
    } else if (evt.action === 'change_skin') {
      logActivity(`👕 [Đổi Skin] ${name} (ghế #${idx}) đổi sang: ${skin}`, '#c084fc');
    }
  });

  socket.on('gift_event', evt => {
    if (!evt) return;
    logActivity(`🎁 [Tặng Quà] ${evt.donorName} cúng dường ${evt.giftName} (+${evt.points} Công Đức)`, '#38bdf8');
  });

  socket.on('chant_speech', payload => {
    if (!payload) return;
    const shortText = (payload.text || '').length > 45 ? payload.text.substring(0, 45) + '...' : payload.text;
    logActivity(`🎙️ [Đọc Kinh] "${shortText}"`, '#fed7aa');
  });

  socket.on('bell_ring', () => {
    logActivity('🔔 [Thỉnh Chuông] Boooong...', '#fbbf24');
  });

  socket.on('wooden_fish_hit', () => {
    logActivity('🪵 [Gõ Mõ] Cốc cốc cốc...', '#d4c2a3');
  });

  // ==========================================================================
  // 2. ĐỒNG BỘ GIAO DIỆN CHÙA & THAO TÁC CỘT 1
  // ==========================================================================

  function updateActiveThemeUI(themeId) {
    currentThemeId = themeId;
    if (txtActiveThemeName) {
      txtActiveThemeName.textContent = `Mẫu ${themeId}`;
    }
    if (themePreviewImg && themeImages[themeId]) {
      themePreviewImg.src = themeImages[themeId];
    }
    themeButtons.forEach(btn => {
      const id = Number(btn.getAttribute('data-theme'));
      btn.classList.toggle('active', id === themeId);
    });
  }

  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-theme'));
      fetch('/api/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: id })
      }).then(r => r.json()).then(data => {
        if (data.ok) {
          updateActiveThemeUI(id);
        }
      });
    });
  });

  // ==========================================================================
  // 3. ĐỒNG BỘ GIỌNG ĐỌC & ÂM THANH (CỘT 2)
  // ==========================================================================

  sliderPitch.addEventListener('input', () => {
    valPitch.textContent = `${sliderPitch.value} Hz`;
  });

  sliderRate.addEventListener('input', () => {
    valRate.textContent = `${sliderRate.value} %`;
  });

  sliderReverb.addEventListener('input', () => {
    valReverb.textContent = sliderReverb.value;
  });

  sliderMusicVol.addEventListener('input', () => {
    valMusicVol.textContent = `${Math.round(sliderMusicVol.value * 100)}%`;
  });

  selectBgMusic.addEventListener('change', () => {
    if (groupCustomMp3) {
      groupCustomMp3.style.display = selectBgMusic.value === 'custom_mp3' ? 'flex' : 'none';
    }
  });

  selectVoicePreset.addEventListener('change', () => {
    const pId = selectVoicePreset.value;
    const p = voicePresets[pId];
    if (p) {
      if (p.pitchHz !== undefined) {
        sliderPitch.value = p.pitchHz;
        valPitch.textContent = `${p.pitchHz} Hz`;
      }
      if (p.ratePercent !== undefined) {
        sliderRate.value = p.ratePercent;
        valRate.textContent = `${p.ratePercent} %`;
      }
      if (p.reverbLevel !== undefined) {
        sliderReverb.value = p.reverbLevel;
        valReverb.textContent = p.reverbLevel;
      }
    }
  });

  function syncVoiceConfigUI(cfg) {
    if (cfg.id && selectVoicePreset) {
      selectVoicePreset.value = cfg.id;
    }
    if (typeof cfg.pitchHz === 'number') {
      sliderPitch.value = cfg.pitchHz;
      valPitch.textContent = `${cfg.pitchHz} Hz`;
    }
    if (typeof cfg.ratePercent === 'number') {
      sliderRate.value = cfg.ratePercent;
      valRate.textContent = `${cfg.ratePercent} %`;
    }
    if (typeof cfg.reverbLevel === 'number') {
      sliderReverb.value = cfg.reverbLevel;
      valReverb.textContent = cfg.reverbLevel;
    }
    if (cfg.bgMusicTrack) {
      selectBgMusic.value = cfg.bgMusicTrack;
      if (groupCustomMp3) {
        groupCustomMp3.style.display = cfg.bgMusicTrack === 'custom_mp3' ? 'flex' : 'none';
      }
    }
    if (typeof cfg.bgMusicVolume === 'number') {
      sliderMusicVol.value = cfg.bgMusicVolume;
      valMusicVol.textContent = `${Math.round(cfg.bgMusicVolume * 100)}%`;
    }
  }

  btnSaveVoice.addEventListener('click', () => {
    const payload = {
      presetId: selectVoicePreset.value,
      pitchHz: Number(sliderPitch.value),
      ratePercent: Number(sliderRate.value),
      reverbLevel: Number(sliderReverb.value),
      bgMusicTrack: selectBgMusic.value,
      bgMusicVolume: Number(sliderMusicVol.value)
    };

    fetch('/api/voice/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(data => {
      if (data.ok) {
        logActivity('💾 Đã lưu cấu hình âm thanh & giọng đọc', '#4ade80');
      }
    });
  });

  btnLoadMp3.addEventListener('click', () => {
    const path = (inputCustomMp3.value || '').trim();
    if (!path) {
      alert('Vui lòng nhập đường dẫn file MP3 trên máy tính (ví dụ: D:\\nhac\\kinhadida.mp3)');
      return;
    }
    fetch('/api/music/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: path })
    }).then(r => r.json()).then(data => {
      if (data.ok) {
        logActivity(`🎵 Đã nạp file nhạc MP3: ${path}`, '#4ade80');
      } else {
        alert(data.error || 'Không tìm thấy file MP3');
      }
    });
  });

  btnTestTts.addEventListener('click', () => {
    ensureAudio();
    const text = 'Nam Mô A Di Đà Phật. Cầu chúc quý Phật tử vạn sự bình an, tâm thanh tịnh.';
    const pId = selectVoicePreset.value;
    const pitch = sliderPitch.value;
    const rate = sliderRate.value;
    const url = `/api/tts?text=${encodeURIComponent(text)}&presetId=${pId}&pitchHz=${pitch}&ratePercent=${rate}&t=${Date.now()}`;
    
    logActivity('▶️ Đang nghe thử giọng đọc TTS...', '#38bdf8');
    const ttsAudio = new Audio(url);
    ttsAudio.play().catch(e => {
      console.warn('Audio play error:', e);
      logActivity('Lỗi phát âm thanh: ' + e.message, '#ef4444');
    });
  });

  btnTriggerChant.addEventListener('click', () => {
    fetch('/api/chant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        presetId: selectVoicePreset.value,
        pitchHz: Number(sliderPitch.value),
        ratePercent: Number(sliderRate.value)
      })
    }).then(r => r.json()).then(() => {
      logActivity('📿 Đã phát bài kinh lên màn hình Live', '#f6c453');
    });
  });

  // ==========================================================================
  // 4. QUY MÔ BỒ ĐOÀN & VỊ TRÍ KHUNG HƯỚNG DẪN (CỘT 3)
  // ==========================================================================

  selectSlotMode.addEventListener('change', () => {
    fetch('/api/seats/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotMode: selectSlotMode.value })
    }).then(r => r.json()).then(data => {
      if (data.ok) {
        logActivity(`🧘 Đã chuyển quy mô bồ đoàn: ${data.state.slotMode}`, '#93c5fd');
      }
    });
  });

  btnSampleFills.forEach(btn => {
    btn.addEventListener('click', () => {
      const count = Number(btn.getAttribute('data-count'));
      fetch('/api/seats/sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count })
      }).then(r => r.json()).then(data => {
        if (data.ok) {
          logActivity(`👥 Đã điền mẫu ${count} người ngồi thiền`, '#38bdf8');
        }
      });
    });
  });

  btnClearSeats.addEventListener('click', () => {
    if (!confirm('Bạn có chắc chắn muốn giải phóng toàn bộ bồ đoàn không?')) return;
    fetch('/api/seats/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }).then(r => r.json()).then(() => {
      logActivity('🧹 Đã làm trống toàn bộ bồ đoàn', '#f87171');
    });
  });

  // Sliders HUD
  sliderHudOffsetY.addEventListener('input', () => {
    valHudOffsetY.textContent = `${sliderHudOffsetY.value} px`;
  });

  sliderHudOpacity.addEventListener('input', () => {
    valHudOpacity.textContent = `${Math.round(sliderHudOpacity.value * 100)}%`;
  });

  function syncHudConfigUI(cfg) {
    if (cfg.guidePosition && selectHudPos) {
      selectHudPos.value = cfg.guidePosition;
    }
    if (typeof cfg.guideOffsetY === 'number') {
      sliderHudOffsetY.value = cfg.guideOffsetY;
      valHudOffsetY.textContent = `${cfg.guideOffsetY} px`;
    }
    if (typeof cfg.guideOpacity === 'number') {
      sliderHudOpacity.value = cfg.guideOpacity;
      valHudOpacity.textContent = `${Math.round(cfg.guideOpacity * 100)}%`;
    }
    if (typeof cfg.guideCollapsed === 'boolean') {
      chkHudCollapse.checked = cfg.guideCollapsed;
    }
  }

  btnSaveHud.addEventListener('click', () => {
    const payload = {
      guidePosition: selectHudPos.value,
      guideOffsetY: Number(sliderHudOffsetY.value),
      guideOpacity: Number(sliderHudOpacity.value),
      guideCollapsed: chkHudCollapse.checked
    };

    fetch('/api/hud/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(data => {
      if (data.ok) {
        logActivity(`📐 Đã áp dụng vị trí khung: ${payload.guidePosition} (Offset ${payload.guideOffsetY}px)`, '#4ade80');
      }
    });
  });

  // ==========================================================================
  // 5. GIẢ LẬP LIVE & QUÀ TẶNG TIKTOK (CỘT 4)
  // ==========================================================================

  // Tải danh mục quà tặng TikTok thật
  function loadTikTokGifts() {
    fetch('/api/tiktok/gifts')
      .then(r => r.json())
      .then(data => {
        if (!data.ok || !data.gifts) return;
        if (txtGiftCount) txtGiftCount.textContent = data.gifts.length;
        if (selectSimGift) {
          selectSimGift.innerHTML = '';
          data.gifts.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.name;
            opt.setAttribute('data-coins', g.diamondCount || 10);
            opt.textContent = `${g.name} (${g.diamondCount || 10} xu)`;
            selectSimGift.appendChild(opt);
          });
        }
      })
      .catch(() => {});
  }
  loadTikTokGifts();

  // Kết nối TikTok Live
  btnTiktokConnect.addEventListener('click', () => {
    const user = (inputTiktokUser.value || '').trim();
    if (!user) {
      alert('Vui lòng nhập @username kênh TikTok đang phát LIVE!');
      return;
    }

    logActivity(`⏳ Đang kết nối kênh @${user}...`, '#38bdf8');
    fetch('/api/tiktok/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user })
    }).then(r => r.json()).then(data => {
      if (!data.ok) {
        alert(data.error);
        logActivity(`❌ Lỗi kết nối: ${data.error}`, '#ef4444');
      }
    });
  });

  btnTiktokDisconnect.addEventListener('click', () => {
    fetch('/api/tiktok/disconnect', { method: 'POST' });
  });

  // Toggle Auto-Demo
  btnToggleAutoDemo.addEventListener('click', () => {
    isAutoDemoRunning = !isAutoDemoRunning;
    fetch('/api/tiktok/autodemo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable: isAutoDemoRunning })
    }).then(r => r.json()).then(data => {
      isAutoDemoRunning = data.running;
      btnToggleAutoDemo.textContent = isAutoDemoRunning
        ? '⏹ Dừng Giả Lập Tự Động (Auto-Demo)'
        : '🤖 Bật Giả Lập Tự Động (Auto-Demo)';
      btnToggleAutoDemo.className = isAutoDemoRunning ? 'btn btn-red' : 'btn btn-blue';
      logActivity(isAutoDemoRunning ? '🤖 BẬT chế độ giả lập người xem tự động' : '⏹ TẮT giả lập tự động', '#f6c453');
    });
  });

  // Simulator: Vào Thiền với Skin
  btnSimJoin.addEventListener('click', () => {
    const nick = (inputSimNickname.value || 'Phật Tử').trim();
    const skin = selectSimSkin.value;
    const baseCmt = (inputSimComment.value || 'Nam Mô A Di Đà Phật').trim();
    // Thêm từ khóa skin vào đầu câu để hệ thống nhận diện
    const fullComment = `${skin} ${baseCmt}`;

    fetch('/api/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: nick,
        uniqueId: `sim_${nick.replace(/\s+/g, '_')}`,
        comment: fullComment
      })
    });
  });

  // Simulator: Cắm Nhang Lễ Phật (gõ adidaphat)
  btnSimIncense.addEventListener('click', () => {
    const nick = (inputSimNickname.value || 'Phật Tử').trim();
    const cmt = 'adidaphat con xin cắm nhang lễ Phật 🙏';

    fetch('/api/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: nick,
        uniqueId: `sim_${nick.replace(/\s+/g, '_')}`,
        comment: cmt
      })
    });
  });

  // Simulator: Tặng Quà TikTok
  btnSimGift.addEventListener('click', () => {
    const nick = (inputSimNickname.value || 'Thí Chủ').trim();
    const selectedOpt = selectSimGift.options[selectSimGift.selectedIndex];
    const giftName = selectedOpt ? selectedOpt.value : 'Hoa Sen Vàng';
    const coins = selectedOpt ? Number(selectedOpt.getAttribute('data-coins')) : 10;
    const repeat = Math.max(1, Number(inputSimRepeat.value) || 1);

    fetch('/api/gift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: nick,
        uniqueId: `sim_${nick.replace(/\s+/g, '_')}`,
        giftName,
        diamondCount: coins,
        repeatCount: repeat,
        presetId: selectVoicePreset.value,
        pitchHz: Number(sliderPitch.value),
        ratePercent: Number(sliderRate.value)
      })
    });
  });

  // ==========================================================================
  // 6. CÁC NÚT NHANH TRÊN HEADER
  // ==========================================================================

  btnQuickBell.addEventListener('click', () => {
    ensureAudio();
    audio.playTempleBell(1.0);
    fetch('/api/sound/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ soundType: 'bell' })
    });
  });

  btnQuickFish.addEventListener('click', () => {
    ensureAudio();
    audio.playWoodenFish();
    fetch('/api/sound/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ soundType: 'wooden_fish' })
    });
  });

  btnReloadOverlay.addEventListener('click', () => {
    fetch('/api/overlay/reload', { method: 'POST' }).then(() => {
      logActivity('🔄 Đã gửi lệnh làm mới tất cả màn hình Overlay trên OBS Studio!', '#38bdf8');
    });
  });

  // Nạp trạng thái ban đầu qua GET /api/state
  fetch('/api/state')
    .then(r => r.json())
    .then(state => {
      if (state) {
        if (state.theme) updateActiveThemeUI(state.theme.id);
        if (state.voiceConfig) syncVoiceConfigUI(state.voiceConfig);
        if (state.voicePresets) voicePresets = state.voicePresets;
        if (state.hudConfig) syncHudConfigUI(state.hudConfig);
        if (badgeSeats) badgeSeats.textContent = `● Đang thiền: ${state.occupiedCount}/${state.totalSeats}`;
      }
    })
    .catch(() => {});
})();
