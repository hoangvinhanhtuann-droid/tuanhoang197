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
  const btnToggleAdminAudio = document.getElementById('btn-toggle-admin-audio');
  const btnQuickBell = document.getElementById('btn-quick-bell');
  const btnQuickFish = document.getElementById('btn-quick-fish');
  const btnReloadOverlay = document.getElementById('btn-reload-overlay');
  const btnLogout = document.getElementById('btn-logout');

  // Quản lý âm thanh Admin: Mặc định BẬT để nghe giọng đọc và quà tặng trực tiếp
  let adminAudioEnabled = localStorage.getItem('admin_audio_enabled') !== 'false';

  function updateAdminAudioUI() {
    if (!btnToggleAdminAudio) return;
    if (adminAudioEnabled) {
      btnToggleAdminAudio.textContent = '🔊 Loa Admin: BẬT';
      btnToggleAdminAudio.style.background = '#059669';
      btnToggleAdminAudio.style.borderColor = '#10b981';
      btnToggleAdminAudio.title = 'Loa Admin đang BẬT. Bấm để TẮT nếu bạn dùng nguồn âm thanh khác để tránh vọng.';
    } else {
      btnToggleAdminAudio.textContent = '🔇 Loa Admin: TẮT';
      btnToggleAdminAudio.style.background = '#475569';
      btnToggleAdminAudio.style.borderColor = '#64748b';
      btnToggleAdminAudio.title = 'Loa Admin đang TẮT. Bấm để BẬT lại âm thanh đọc kinh và xướng tên.';
    }
  }
  updateAdminAudioUI();

  if (btnToggleAdminAudio) {
    btnToggleAdminAudio.addEventListener('click', () => {
      ensureAudio();
      adminAudioEnabled = !adminAudioEnabled;
      localStorage.setItem('admin_audio_enabled', String(adminAudioEnabled));
      updateAdminAudioUI();
      logActivity(adminAudioEnabled ? '🔊 Đã BẬT âm thanh trực tiếp trên trang Admin.' : '🔇 Đã TẮT âm thanh Admin (âm thanh sẽ chỉ phát trên màn hình Overlay/OBS).', '#38bdf8');
    });
  }

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
  const inputGiftRandomTemplates = document.getElementById('input-gift-random-templates');

  // DOM Elements - Slots & HUD
  const selectSlotMode = document.getElementById('select-slot-mode');
  const btnSampleFills = document.querySelectorAll('.btn-fill-sample');
  const btnResetMerit = document.getElementById('btn-reset-merit');
  const btnClearSeats = document.getElementById('btn-clear-seats');
  const selectHudPos = document.getElementById('select-hud-pos');
  const sliderHudOffsetY = document.getElementById('slider-hud-offsety');
  const valHudOffsetY = document.getElementById('val-hud-offsety');
  const sliderHudOpacity = document.getElementById('slider-hud-opacity');
  const valHudOpacity = document.getElementById('val-hud-opacity');
  const sliderHudScale = document.getElementById('slider-hud-scale');
  const valHudScale = document.getElementById('val-hud-scale');
  const chkHudCollapse = document.getElementById('chk-hud-collapse');
  const btnSaveHud = document.getElementById('btn-save-hud');
  const btnResetUiLayout = document.getElementById('btn-reset-ui-layout');

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
    } else if (evt.action === 'replace_seat') {
      const oldName = (evt.replacedUser && evt.replacedUser.nickname) || 'người trước';
      logActivity(`🔄 [Thế Chỗ] ${name} vào thế chỗ của ${oldName} (ghế #${idx})`, '#fbbf24');
    } else if (evt.action === 'leave_seat') {
      const uName = (evt.user && evt.user.nickname) || name;
      logActivity(`🚶 [Xả Thiền] ${uName} hoàn thành 10 phút tĩnh tâm và rời phòng (ghế #${idx} trống)`, '#94a3b8');
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

  socket.on('chant_speech', async payload => {
    if (!payload) return;
    const shortText = (payload.text || '').length > 45 ? payload.text.substring(0, 45) + '...' : payload.text;
    logActivity(`🎙️ [Xướng Tên] "${shortText}"`, '#fed7aa');
    if (adminAudioEnabled) {
      try {
        await audio.playChantSpeech(payload);
      } catch (err) {
        console.warn('[Admin] Play chant speech error:', err);
      }
    }
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
    if (!cfg) return;
    const active = document.activeElement;
    const pid = cfg.presetId || cfg.id;
    if (pid && selectVoicePreset && active !== selectVoicePreset) {
      selectVoicePreset.value = pid;
    }
    if (typeof cfg.pitchHz === 'number' && active !== sliderPitch) {
      sliderPitch.value = cfg.pitchHz;
      valPitch.textContent = `${cfg.pitchHz} Hz`;
    }
    if (typeof cfg.ratePercent === 'number' && active !== sliderRate) {
      sliderRate.value = cfg.ratePercent;
      valRate.textContent = `${cfg.ratePercent} %`;
    }
    if (typeof cfg.reverbLevel === 'number' && active !== sliderReverb) {
      sliderReverb.value = cfg.reverbLevel;
      valReverb.textContent = cfg.reverbLevel;
    }
    if (cfg.bgMusicTrack && active !== selectBgMusic) {
      selectBgMusic.value = cfg.bgMusicTrack;
      if (groupCustomMp3) {
        groupCustomMp3.style.display = cfg.bgMusicTrack === 'custom_mp3' ? 'flex' : 'none';
      }
    }
    if (typeof cfg.bgMusicVolume === 'number' && active !== sliderMusicVol) {
      sliderMusicVol.value = cfg.bgMusicVolume;
      valMusicVol.textContent = `${Math.round(cfg.bgMusicVolume * 100)}%`;
    }
    if (inputGiftRandomTemplates && active !== inputGiftRandomTemplates) {
      const templates = Array.isArray(cfg.giftThankTemplates) && cfg.giftThankTemplates.length > 0
        ? cfg.giftThankTemplates
        : (cfg.meritTemplate ? [cfg.meritTemplate] : []);
      if (templates.length > 0) {
        inputGiftRandomTemplates.value = templates.join('\n');
      }
    }
  }

  btnSaveVoice.addEventListener('click', () => {
    const pId = selectVoicePreset.value;
    const isFemale = pId.includes('nu') || pId.includes('su_co');
    const randomTemplates = inputGiftRandomTemplates
      ? inputGiftRandomTemplates.value.split('\n').map(s => s.trim()).filter(Boolean)
      : undefined;

    const pitch = Number(sliderPitch.value) || 0;
    const rate = Number(sliderRate.value) || 0;
    const revVal = Number(sliderReverb.value) || 0.28;
    const payload = {
      presetId: pId,
      voiceName: isFemale ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural',
      pitchHz: pitch,
      ratePercent: rate,
      playbackRate: Number((1.0 + rate / 100.0).toFixed(2)),
      warmthDb: Number(Math.max(0, -pitch * 0.55).toFixed(2)),
      mciSpeed: Math.round(1000 * (1.0 + rate / 100.0)),
      reverbLevel: revVal,
      bgMusicTrack: selectBgMusic.value,
      bgMusicVolume: Number(sliderMusicVol.value),
      giftThankTemplates: randomTemplates,
      meritTemplate1Coin: (randomTemplates && randomTemplates[0]) || undefined,
      meritTemplate: (randomTemplates && randomTemplates[0]) || undefined
    };

    btnSaveVoice.disabled = true;
    btnSaveVoice.textContent = '⏳ Đang lưu...';

    fetch('/api/voice/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(data => {
      btnSaveVoice.disabled = false;
      if (data && data.ok) {
        btnSaveVoice.textContent = '✅ Đã Lưu';
        setTimeout(() => {
          btnSaveVoice.textContent = '💾 Lưu';
        }, 2200);
        logActivity(`💾 Đã lưu cấu hình: Pitch ${pitch}Hz, Rate ${rate}%, Reverb ${revVal}, Nhạc nền ${selectBgMusic.options[selectBgMusic.selectedIndex]?.text || selectBgMusic.value} (${Math.round(payload.bgMusicVolume * 100)}%)`, '#4ade80');
      } else {
        btnSaveVoice.textContent = '💾 Lưu';
        logActivity('Lỗi lưu cấu hình: ' + (data?.error || 'Không rõ'), '#ef4444');
      }
    }).catch(err => {
      btnSaveVoice.disabled = false;
      btnSaveVoice.textContent = '💾 Lưu';
      logActivity('Lỗi mạng khi lưu: ' + err.message, '#ef4444');
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

  btnTestTts.addEventListener('click', async () => {
    ensureAudio();
    const text = 'Nam Mô A Di Đà Phật. Kính chúc quý Phật tử vạn sự bình an, thân tâm thanh tịnh, gia đạo an khang.';
    const pId = selectVoicePreset.value;
    const isFemale = pId.includes('nu') || pId.includes('su_co');
    const vName = isFemale ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural';
    const pitch = Number(sliderPitch.value) || 0;
    const rate = Number(sliderRate.value) || 0;
    const revLvl = Number(sliderReverb.value) || 0.28;
    const presetLabel = selectVoicePreset.options[selectVoicePreset.selectedIndex]?.text || pId;
    
    logActivity(`▶️ Đang nghe thử: [${presetLabel}] (Pitch: ${pitch}Hz, Tốc độ: +${rate}%, Vang: ${revLvl})...`, '#38bdf8');
    btnTestTts.disabled = true;
    const originalBtnText = btnTestTts.textContent;
    btnTestTts.textContent = '⏳ Đang tổng hợp...';

    try {
      const url = `/api/tts?text=${encodeURIComponent(text)}&presetId=${pId}&voiceName=${vName}&pitchHz=${pitch}&ratePercent=${rate}&t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuf = await res.arrayBuffer();
      
      // Chuyển arrayBuffer thành base64 để phát qua WebAudio DSP Engine
      let binary = '';
      const bytes = new Uint8Array(arrayBuf);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const audioBase64 = window.btoa(binary);

      btnTestTts.textContent = '🔊 Đang phát...';
      await audio.playChantSpeech({
        audioBase64,
        text,
        voiceConfig: {
          presetId: pId,
          voiceName: vName,
          pitchHz: pitch,
          ratePercent: rate,
          playbackRate: Number((1.0 + rate / 100.0).toFixed(2)),
          warmthDb: Number(Math.max(0, -pitch * 0.55).toFixed(2)),
          reverbLevel: revLvl
        }
      });
      btnTestTts.textContent = '✅ Đã nghe thử';
      setTimeout(() => {
        btnTestTts.textContent = originalBtnText;
        btnTestTts.disabled = false;
      }, 1500);
      logActivity(`✅ Đã hoàn tất nghe thử giọng đọc kinh chuẩn 432Hz`, '#4ade80');
    } catch (e) {
      console.warn('Audio play error:', e);
      btnTestTts.textContent = originalBtnText;
      btnTestTts.disabled = false;
      logActivity('Lỗi phát âm thanh: ' + e.message, '#ef4444');
    }
  });

  btnTriggerChant.addEventListener('click', () => {
    const pId = selectVoicePreset.value;
    const isFemale = pId.includes('nu') || pId.includes('su_co');
    fetch('/api/chant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        presetId: pId,
        voiceName: isFemale ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural',
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

  if (btnResetMerit) {
    btnResetMerit.addEventListener('click', () => {
      if (!confirm('Bạn có chắc chắn muốn reset toàn bộ điểm công đức và Bảng Công Đức về 0?')) return;
      fetch('/api/merit/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }).then(r => r.json()).then(() => {
        logActivity('✨ Đã reset Bảng Công Đức và điểm công đức về ban đầu', '#f6c453');
      });
    });
  }

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

  if (sliderHudScale && valHudScale) {
    sliderHudScale.addEventListener('input', () => {
      valHudScale.textContent = `${Math.round(sliderHudScale.value * 100)}%`;
    });
  }

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
    if (typeof cfg.guideScale === 'number' && sliderHudScale) {
      sliderHudScale.value = cfg.guideScale;
      valHudScale.textContent = `${Math.round(cfg.guideScale * 100)}%`;
    }
    if (typeof cfg.guideCollapsed === 'boolean') {
      chkHudCollapse.checked = cfg.guideCollapsed;
    }
  }

  btnSaveHud.addEventListener('click', () => {
    const pos = selectHudPos.value;
    const offsetY = Number(sliderHudOffsetY.value);
    const scale = Number(sliderHudScale ? sliderHudScale.value : 1.0);
    const payload = {
      guidePosition: pos,
      guideOffsetY: offsetY,
      guideOpacity: Number(sliderHudOpacity.value),
      guideScale: scale,
      guideCollapsed: chkHudCollapse.checked
    };

    fetch('/api/hud/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(data => {
      if (data.ok) {
        // Đồng thời cập nhật layout kéo thả để đồng bộ tức thì trên màn hình Live OBS
        let targetLeft = 2.3;
        let targetTop = 25.5;
        if (pos === 'top_left') { targetLeft = 2.3; targetTop = 10.5; }
        else if (pos === 'below_merit') { targetLeft = 70.2; targetTop = 48.0; }
        else if (pos === 'bottom_ticker') { targetLeft = 3.5; targetTop = 92.5; }
        else if (pos === 'top_right') { targetLeft = 70.2; targetTop = 10.5; }

        targetTop += Number((offsetY / 10).toFixed(1));

        fetch('/api/ui-layout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'thien_duong_pos_guide',
            left: targetLeft,
            top: targetTop,
            scale
          })
        });

        logActivity(`📐 Đã áp dụng vị trí khung: ${payload.guidePosition} (Offset ${payload.guideOffsetY}px) lên Live OBS!`, '#4ade80');
      }
    });
  });

  if (btnResetUiLayout) {
    btnResetUiLayout.addEventListener('click', () => {
      if (confirm('Anh có chắc muốn đặt lại toàn bộ vị trí & kích cỡ các khung (Hướng Dẫn, Công Đức, Tiêu Đề) về mặc định không?')) {
        fetch('/api/ui-layout/reset', { method: 'POST' })
          .then(r => r.json())
          .then(res => {
            if (res.ok) {
              logActivity('🔄 Đã khôi phục toàn bộ vị trí & cỡ khung về mặc định trên màn hình Live OBS!', '#38bdf8');
            }
          });
      }
    });
  }

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
    ensureAudio();
    const nick = (inputSimNickname.value || 'Thí Chủ').trim();
    const selectedOpt = selectSimGift.options[selectSimGift.selectedIndex];
    const giftName = selectedOpt ? selectedOpt.value : 'Hoa Sen Vàng';
    const coins = selectedOpt ? Number(selectedOpt.getAttribute('data-coins')) : 10;
    const repeat = Math.max(1, Number(inputSimRepeat.value) || 1);

    logActivity(`🎁 Đang phát sự kiện tặng quà [${giftName}] từ [${nick}]...`, '#38bdf8');

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
        voiceName: (selectVoicePreset.value.includes('nu') || selectVoicePreset.value.includes('su_co')) ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural',
        pitchHz: Number(sliderPitch.value),
        ratePercent: Number(sliderRate.value)
      })
    }).then(r => r.json()).then(res => {
      if (res && res.ok) {
        if (res.result && res.result.shouldSpeak === false) {
          const remainSec = Math.ceil((res.result.cooldownRemainingMs || 0) / 1000);
          logActivity(`⏳ [${nick}] vừa được xướng tên. Để chống đọc đè giọng, hệ thống sẽ mở lượt đọc tiếp sau ${remainSec}s (Điểm công đức vẫn được cộng dồn).`, '#fbbf24');
        } else {
          logActivity(`✅ Đã gửi quà [${giftName}] thành công, hệ thống đang xướng tên hồi hướng!`, '#10b981');
        }
      }
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

  // ==========================================================================
  // 7. TÙY CHỈNH VĂN BẢN TRÊN MÀN HÌNH LIVE (TIÊU ĐỀ, TÊN THẦY, HƯỚNG DẪN)
  // ==========================================================================
  const inputTextBannerTitle = document.getElementById('input-text-banner-title');
  const inputTextBannerSubtitle = document.getElementById('input-text-banner-subtitle');
  const inputTextMonkLeft = document.getElementById('input-text-monk-left');
  const inputTextMonkCenter = document.getElementById('input-text-monk-center');
  const inputTextMonkRight = document.getElementById('input-text-monk-right');
  const inputTextGuideTitle = document.getElementById('input-text-guide-title');
  const inputTextGuideLine1 = document.getElementById('input-text-guide-line1');
  const inputTextGuideLine2 = document.getElementById('input-text-guide-line2');
  const inputTextGuideLine3 = document.getElementById('input-text-guide-line3');
  const inputTextGuideLine4 = document.getElementById('input-text-guide-line4');
  const inputTextMeritTitle = document.getElementById('input-text-merit-title');
  const btnSaveTextConfig = document.getElementById('btn-save-text-config');
  const btnResetTextConfig = document.getElementById('btn-reset-text-config');

  function syncTextConfigUI(tc = {}) {
    if (inputTextBannerTitle) inputTextBannerTitle.value = tc.bannerTitle || '';
    if (inputTextBannerSubtitle) inputTextBannerSubtitle.value = tc.bannerSubtitle || '';
    if (inputTextMonkLeft) inputTextMonkLeft.value = tc.monkLeft || 'Thầy Minh Đạo';
    if (inputTextMonkCenter) inputTextMonkCenter.value = tc.monkCenter || 'Sư Trụ Trì';
    if (inputTextMonkRight) inputTextMonkRight.value = tc.monkRight || 'Thầy Tâm Từ';
    if (inputTextGuideTitle) inputTextGuideTitle.value = tc.guideTitle || 'HƯỚNG DẪN';
    if (inputTextGuideLine1) inputTextGuideLine1.value = tc.guideLine1 || 'Bình luận bất kỳ để vào thiền';
    if (inputTextGuideLine2) inputTextGuideLine2.value = tc.guideLine2 || 'Gõ adidaphat lên cắm nhang';
    if (inputTextGuideLine3) inputTextGuideLine3.value = tc.guideLine3 || 'Tặng quà được xướng tên';
    if (inputTextGuideLine4) inputTextGuideLine4.value = tc.guideLine4 || '✦ Hồi Hướng Công Đức ✦';
    if (inputTextMeritTitle) inputTextMeritTitle.value = tc.meritTitle || '✦ Công Đức ✦';
  }

  if (btnSaveTextConfig) {
    btnSaveTextConfig.addEventListener('click', () => {
      const payload = {
        bannerTitle: inputTextBannerTitle.value.trim(),
        bannerSubtitle: inputTextBannerSubtitle.value.trim(),
        monkLeft: inputTextMonkLeft.value.trim(),
        monkCenter: inputTextMonkCenter.value.trim(),
        monkRight: inputTextMonkRight.value.trim(),
        guideTitle: inputTextGuideTitle.value.trim(),
        guideLine1: inputTextGuideLine1.value.trim(),
        guideLine2: inputTextGuideLine2.value.trim(),
        guideLine3: inputTextGuideLine3.value.trim(),
        guideLine4: inputTextGuideLine4.value.trim(),
        meritTitle: inputTextMeritTitle.value.trim()
      };

      fetch('/api/text/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(r => r.json())
      .then(res => {
        if (res && res.ok) {
          logActivity('✍️ Đã cập nhật văn bản lên Live thành công!', '#10b981');
        }
      });
    });
  }

  if (btnResetTextConfig) {
    btnResetTextConfig.addEventListener('click', () => {
      if (!confirm('Khôi phục lại toàn bộ chữ mặc định theo mẫu Chùa?')) return;
      fetch('/api/text/reset', { method: 'POST' })
        .then(r => r.json())
        .then(res => {
          if (res && res.ok && res.textConfig) {
            syncTextConfigUI(res.textConfig);
            logActivity('🔄 Đã khôi phục chữ mặc định thành công!', '#fbbf24');
          }
        });
    });
  }

  socket.on('voice_config_changed', cfg => {
    syncVoiceConfigUI(cfg);
  });

  socket.on('text_config_changed', cfg => {
    syncTextConfigUI(cfg);
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
        if (state.textConfig) syncTextConfigUI(state.textConfig);
        if (badgeSeats) badgeSeats.textContent = `● Đang thiền: ${state.occupiedCount}/${state.totalSeats}`;
      }
    })
    .catch(() => {});
})();
