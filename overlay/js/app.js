/**
 * Điều phối kết nối Socket.IO, HUD, Đồng hồ phiên thiền, Chuyển đổi 5 Mẫu Chùa
 * và Phát Giọng Nam Ấm Đọc Kinh / Xướng Tên Hồi Hướng Công Đức.
 */

(function () {
  const socket = io();
  const bgLayer = document.getElementById('theme-bg-layer');
  const bannerTitle = document.getElementById('banner-title');
  const bannerSubtitle = document.getElementById('banner-subtitle');
  const seatCounter = document.getElementById('seat-counter');
  const sessionTimer = document.getElementById('session-timer');
  const meritContainer = document.getElementById('merit-list-container');
  const chantToast = document.getElementById('chant-toast');
  const chantToastTitle = document.getElementById('chant-toast-title');
  const chantToastText = document.getElementById('chant-toast-text');
  const btnUnlockAudio = document.getElementById('btn-unlock-audio');
  const btnTestBell = document.getElementById('btn-test-bell');
  const btnTestChant = document.getElementById('btn-test-chant');
  const themeButtons = document.querySelectorAll('.theme-btn');

  let sessionStartTime = Date.now() - 45000;
  let toastTimeout = null;

  // Mở khóa âm thanh khi click vào bất kỳ đâu trên màn hình Overlay
  function unlockAudio() {
    if (window.templeAudio) {
      window.templeAudio.initContext();
      if (btnUnlockAudio) {
        btnUnlockAudio.textContent = '🔊 Đã Bật Âm';
        btnUnlockAudio.classList.remove('active-pulse');
      }
    }
  }
  window.addEventListener('pointerdown', unlockAudio, { once: false });
  window.addEventListener('DOMContentLoaded', unlockAudio);
  window.addEventListener('load', unlockAudio);
  socket.on('connect', unlockAudio);

  if (btnUnlockAudio) {
    btnUnlockAudio.addEventListener('click', unlockAudio);
  }

  if (btnTestBell) {
    btnTestBell.addEventListener('click', () => {
      unlockAudio();
      window.templeAudio.playTempleBell(1.0);
    });
  }

  if (btnTestChant) {
    btnTestChant.addEventListener('click', () => {
      unlockAudio();
      fetch('/api/chant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
    });
  }

  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-theme'));
      socket.emit('switch_theme', id);
    });
  });

  let currentThemeObj = null;
  let currentTextConfig = {};

  function applyTheme(theme) {
    if (!theme) return;
    currentThemeObj = theme;
    document.body.className = `theme-${theme.id}`;
    if (bgLayer) {
      bgLayer.style.backgroundImage = `url('${theme.bgImage}')`;
    }
    if (bannerTitle) bannerTitle.textContent = currentTextConfig.bannerTitle || theme.title || 'THIỀN ĐƯỜNG TỊNH TÂM';
    if (bannerSubtitle) bannerSubtitle.textContent = currentTextConfig.bannerSubtitle || theme.subtitle || 'Nam Mô A Di Đà Phật';

    themeButtons.forEach(btn => {
      const btnId = Number(btn.getAttribute('data-theme'));
      btn.classList.toggle('active', btnId === theme.id);
    });

    if (window.templeScene) {
      window.templeScene.setTheme(theme.id);
    }
  }

  function applyTextConfig(cfg) {
    if (!cfg) return;
    currentTextConfig = { ...currentTextConfig, ...cfg };

    if (bannerTitle) {
      bannerTitle.textContent = currentTextConfig.bannerTitle || (currentThemeObj && currentThemeObj.title) || 'THIỀN ĐƯỜNG TỊNH TÂM';
    }
    if (bannerSubtitle) {
      bannerSubtitle.textContent = currentTextConfig.bannerSubtitle || (currentThemeObj && currentThemeObj.subtitle) || 'Nam Mô A Di Đà Phật';
    }

    const tagMonkLeft = document.getElementById('tag-thay-minh-dao');
    const tagMonkCenter = document.getElementById('tag-su-tru-tri');
    const tagMonkRight = document.getElementById('tag-thay-tam-tu');

    if (tagMonkLeft && currentTextConfig.monkLeft) tagMonkLeft.textContent = currentTextConfig.monkLeft;
    if (tagMonkCenter && currentTextConfig.monkCenter) tagMonkCenter.textContent = currentTextConfig.monkCenter;
    if (tagMonkRight && currentTextConfig.monkRight) tagMonkRight.textContent = currentTextConfig.monkRight;

    const guideTitleEl = document.getElementById('guide-title-text');
    if (guideTitleEl && currentTextConfig.guideTitle) {
      guideTitleEl.textContent = '✥ ' + currentTextConfig.guideTitle.replace(/^✥\s*/, '');
    }

    const guideLine1El = document.getElementById('guide-line-1');
    if (guideLine1El && currentTextConfig.guideLine1) {
      guideLine1El.innerHTML = currentTextConfig.guideLine1;
    }

    const guideLine2El = document.getElementById('guide-line-2');
    if (guideLine2El && currentTextConfig.guideLine2) {
      guideLine2El.innerHTML = currentTextConfig.guideLine2;
    }

    const guideLine3El = document.getElementById('guide-line-3');
    if (guideLine3El && currentTextConfig.guideLine3) {
      guideLine3El.innerHTML = currentTextConfig.guideLine3;
    }

    const guideLine4El = document.getElementById('guide-line-4');
    if (guideLine4El && currentTextConfig.guideLine4) {
      guideLine4El.innerHTML = currentTextConfig.guideLine4;
    }

    const meritTitleEl = document.getElementById('merit-header-title');
    if (meritTitleEl && currentTextConfig.meritTitle) {
      meritTitleEl.textContent = currentTextConfig.meritTitle;
    }
  }

  function renderMeritList(meritList = []) {
    if (!meritContainer) return;
    if (!meritList || meritList.length === 0) {
      meritContainer.innerHTML = '<div class="merit-empty">Chưa có</div>';
      return;
    }

    meritContainer.innerHTML = meritList.slice(0, 6).map(item => `
      <div class="merit-item">
        <span class="merit-item-name">🙏 ${escapeHtml(item.nickname)}</span>
        <span class="merit-item-pts">+${item.points}</span>
      </div>
    `).join('');
  }

  function showChantToast(title, text, durationMs = 9500) {
    if (!chantToast) return;
    if (chantToastTitle) chantToastTitle.textContent = title || '✦ HỒI HƯỚNG CÔNG ĐỨC ✦';
    if (chantToastText) chantToastText.textContent = text || '';
    chantToast.classList.remove('hidden');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      chantToast.classList.add('hidden');
    }, durationMs);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Đồng hồ đếm thời gian phiên thiền
  setInterval(() => {
    if (!sessionTimer) return;
    const elapsedSec = Math.max(0, Math.floor((Date.now() - sessionStartTime) / 1000));
    const hrs = String(Math.floor(elapsedSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0');
    const secs = String(elapsedSec % 60).padStart(2, '0');
    sessionTimer.textContent = `${hrs}:${mins}:${secs}`;
  }, 1000);

  // Nhận cập nhật trạng thái từ Node.js Server
  socket.on('state_update', state => {
    if (!state) return;
    if (state.sessionStartTime) {
      sessionStartTime = state.sessionStartTime - 45000;
    }
    if (seatCounter) {
      seatCounter.textContent = `${state.occupiedCount}/${state.totalSeats}`;
    }
    if (state.theme) {
      applyTheme(state.theme);
    }
    if (state.hudConfig) {
      applyHudConfig(state.hudConfig);
    }
    if (state.textConfig) {
      applyTextConfig(state.textConfig);
    }
    if (state.voiceConfig && window.templeAudio) {
      window.templeAudio.updateConfig(state.voiceConfig);
    }
    if (window.templeScene && state.seats) {
      window.templeScene.updateSeats(state.seats, state.gridCols, state.gridRows);
    }
    renderMeritList(state.meritList);
  });

  socket.on('theme_changed', ({ theme }) => {
    applyTheme(theme);
  });

  socket.on('seat_event', evt => {
    if (!evt) return;
    if (window.templeScene && typeof evt.seatIndex === 'number') {
      window.templeScene.triggerSeatBurst(evt.seatIndex, '#ffd700');

      // Nếu là sự kiện dâng hương cắm nhang lễ Phật (khi gõ "adidaphat" / "a di đà phật")
      if (evt.isIncenseOffering || evt.action === 'offer_incense') {
        const u = (evt.seat && evt.seat.user) ? evt.seat.user : { nickname: 'Phật Tử', skin: 'nam' };
        window.templeScene.triggerIncenseOffering(evt.seatIndex, u);
        showChantToast(
          `🪔 THÀNH TÂM DÂNG HƯƠNG LỄ PHẬT 🪔`,
          `Phật tử ${escapeHtml(u.nickname)} thành tâm dâng nén tâm hương cúng dường Tam Bảo. Nam Mô A Di Đà Phật 🙏`,
          8000
        );
      }
    }
    if (evt.action === 'join_seat' && window.templeAudio) {
      window.templeAudio.playTempleBell(0.55);
    }
  });

  socket.on('gift_event', evt => {
    if (!evt) return;
    if (window.templeScene && typeof evt.seatIndex === 'number') {
      window.templeScene.triggerSeatBurst(evt.seatIndex, '#ffea00');
    }
    showChantToast(
      `✦ CÔNG ĐỨC VÔ LƯỢNG · ${evt.donorName.toUpperCase()} ✦`,
      evt.chantText,
      11000
    );
  });

  socket.on('chant_speech', payload => {
    if (!payload) return;
    const title = payload.type === 'merit_dedication'
      ? `✦ XƯỚNG TÊN HỒI HƯỚNG · ${(payload.donorName || '').toUpperCase()} ✦`
      : `✦ ${(payload.title || 'TỤNG KINH TỊNH TÂM').toUpperCase()} ✦`;
    showChantToast(title, payload.text, 11000);

    if (window.templeAudio) {
      window.templeAudio.playChantSpeech(payload);
    }
  });

  socket.on('bell_ring', () => {
    if (window.templeAudio) {
      window.templeAudio.playTempleBell(0.95);
    }
  });

  socket.on('wooden_fish_hit', () => {
    if (window.templeAudio) {
      window.templeAudio.playWoodenFish();
    }
  });

  // ==========================================================================
  // TÙY CHỈNH KHUNG HƯỚNG DẪN: KÉO THẢ (DRAG & DROP), GẬP MỞ VÀ CAROUSEL
  // ==========================================================================
  const guideCard = document.getElementById('guide-card');
  const guideDragHandle = document.getElementById('guide-drag-handle');
  const btnToggleGuide = document.getElementById('btn-toggle-guide');
  const stageContainer = document.getElementById('stage-container');

  // 1. Luân chuyển Carousel thông minh (mỗi 6 giây)
  const carouselSlides = document.querySelectorAll('.guide-carousel-slide');
  let currentSlideIdx = 0;
  if (carouselSlides.length > 1) {
    setInterval(() => {
      carouselSlides[currentSlideIdx].classList.remove('active');
      currentSlideIdx = (currentSlideIdx + 1) % carouselSlides.length;
      carouselSlides[currentSlideIdx].classList.add('active');
    }, 6000);
  }

  // 2. Nút Gập / Mở bảng
  if (btnToggleGuide && guideCard) {
    btnToggleGuide.addEventListener('click', e => {
      e.stopPropagation();
      const isCollapsed = guideCard.classList.toggle('collapsed');
      btnToggleGuide.textContent = isCollapsed ? '＋' : '─';
    });
  }

  // 3. Khôi phục vị trí đã lưu từ LocalStorage
  function restoreSavedGuidePosition() {
    if (!guideCard) return;
    try {
      const saved = localStorage.getItem('thien_duong_guide_pos');
      if (saved) {
        const { top, left } = JSON.parse(saved);
        if (top && left) {
          guideCard.classList.add('pos-custom');
          guideCard.style.top = top;
          guideCard.style.left = left;
          guideCard.style.right = 'auto';
        }
      }
    } catch (_) {}
  }
  restoreSavedGuidePosition();

  // 4. Kéo thả tự do trên toàn bộ màn hình (Full Free Drag & Drop)
  if (guideCard && guideDragHandle && stageContainer) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;
    let currentLeftPct = 2.3;
    let currentTopPct = 10.5;

    const onPointerDown = e => {
      if (e.target === btnToggleGuide) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = guideCard.getBoundingClientRect();
      const stageRect = stageContainer.getBoundingClientRect();
      initialLeft = rect.left - stageRect.left;
      initialTop = rect.top - stageRect.top;

      guideCard.classList.add('is-dragging');
      guideCard.style.transition = 'none';
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    };

    const onPointerMove = e => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const stageW = stageContainer.clientWidth || 540;
      const stageH = stageContainer.clientHeight || 960;
      const cardW = guideCard.offsetWidth || 160;
      const cardH = guideCard.offsetHeight || 135;

      const newLeft = Math.max(4, Math.min(stageW - cardW - 4, initialLeft + dx));
      const newTop = Math.max(4, Math.min(stageH - cardH - 4, initialTop + dy));

      currentLeftPct = Number(((newLeft / stageW) * 100).toFixed(2));
      currentTopPct = Number(((newTop / stageH) * 100).toFixed(2));

      guideCard.classList.remove('pos-top-left', 'pos-top-right', 'pos-mid-left', 'pos-below-merit', 'pos-bottom-ticker');
      guideCard.classList.add('pos-custom');
      guideCard.style.left = `${currentLeftPct}%`;
      guideCard.style.top = `${currentTopPct}%`;
      guideCard.style.right = 'auto';
    };

    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      guideCard.classList.remove('is-dragging');
      guideCard.style.transition = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      // 1. Lưu lại tọa độ vào LocalStorage
      try {
        localStorage.setItem('thien_duong_guide_pos', JSON.stringify({
          top: `${currentTopPct}%`,
          left: `${currentLeftPct}%`
        }));
      } catch (_) {}

      // 2. Đồng bộ ngay lập tức lên Server để lưu vào runtime_state.json và cập nhật Web Admin
      socket.emit('update_hud_config', {
        guidePosition: 'custom',
        guidePosX: currentLeftPct,
        guidePosY: currentTopPct
      });
    };

    guideDragHandle.addEventListener('pointerdown', onPointerDown);
  }

  // 5. Áp dụng cấu hình HUD từ Server (gửi từ Web Admin hoặc WinForms)
  function applyHudConfig(cfg) {
    if (!guideCard || !cfg) return;

    // Reset các class preset vị trí
    guideCard.classList.remove('pos-top-left', 'pos-top-right', 'pos-mid-left', 'pos-below-merit', 'pos-bottom-ticker', 'pos-custom', 'ui-hidden');

    if (cfg.guidePosition === 'hidden') {
      guideCard.classList.add('ui-hidden');
      return;
    }

    if (cfg.guidePosition === 'custom') {
      guideCard.classList.add('pos-custom');
      const x = typeof cfg.guidePosX === 'number' ? `${cfg.guidePosX}%` : (cfg.guidePosX || '2.3%');
      const y = typeof cfg.guidePosY === 'number' ? `${cfg.guidePosY}%` : (cfg.guidePosY || '10.5%');
      guideCard.style.left = x;
      guideCard.style.top = y;
      guideCard.style.right = 'auto';
    } else if (cfg.guidePosition === 'top_left') {
      guideCard.classList.add('pos-top-left');
      guideCard.style.left = '2.3%';
      guideCard.style.top = '10.5%';
      guideCard.style.right = 'auto';
    } else if (cfg.guidePosition === 'top_right') {
      guideCard.classList.add('pos-top-right');
      guideCard.style.left = 'auto';
      guideCard.style.right = '2.3%';
      guideCard.style.top = '10.5%';
    } else if (cfg.guidePosition === 'below_merit') {
      guideCard.classList.add('pos-below-merit');
      guideCard.style.left = 'auto';
      guideCard.style.right = '2.3%';
      guideCard.style.top = '42.0%';
    } else if (cfg.guidePosition === 'bottom_ticker') {
      guideCard.classList.add('pos-bottom-ticker');
      guideCard.style.left = '3.5%';
      guideCard.style.right = '3.5%';
      guideCard.style.top = '92.5%';
    } else { // mid_left
      guideCard.classList.add('pos-mid-left');
      guideCard.style.left = '2.3%';
      guideCard.style.top = '22.0%';
      guideCard.style.right = 'auto';
    }

    if (typeof cfg.guideOpacity === 'number') {
      guideCard.style.opacity = cfg.guideOpacity;
    }

    const scale = typeof cfg.guideScale === 'number' ? cfg.guideScale : 0.95;
    const offX = typeof cfg.guideOffsetX === 'number' ? cfg.guideOffsetX : 0;
    const offY = typeof cfg.guideOffsetY === 'number' ? cfg.guideOffsetY : 0;

    if (cfg.guidePosition === 'bottom_ticker') {
      guideCard.style.transform = `scale(${scale})`;
      guideCard.style.transformOrigin = 'center center';
    } else {
      guideCard.style.transform = `translate(${offX}px, ${offY}px) scale(${scale})`;
      guideCard.style.transformOrigin = (cfg.guidePosition === 'below_merit' || cfg.guidePosition === 'top_right') ? 'top right' : 'top left';
    }

    if (typeof cfg.guideCollapsed === 'boolean') {
      guideCard.classList.toggle('collapsed', cfg.guideCollapsed);
      if (btnToggleGuide) {
        btnToggleGuide.textContent = cfg.guideCollapsed ? '＋' : '─';
      }
    }
  }

  socket.on('hud_config_changed', cfg => {
    applyHudConfig(cfg);
  });

  socket.on('text_config_changed', cfg => {
    applyTextConfig(cfg);
  });

  socket.on('reload_overlay', () => {
    console.log('[Overlay] 🔄 Nhận tín hiệu làm mới giao diện từ Web Admin!');
    window.location.reload();
  });
})();
