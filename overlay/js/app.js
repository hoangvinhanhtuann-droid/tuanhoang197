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
    if (state.uiLayout) {
      applyUiLayout(state.uiLayout);
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

  socket.on('voice_config_changed', cfg => {
    if (window.templeAudio && cfg) {
      window.templeAudio.updateConfig(cfg);
    }
  });

  socket.on('seat_event', evt => {
    if (!evt) return;
    if (window.templeScene && typeof evt.seatIndex === 'number') {
      const burstColor = evt.action === 'leave_seat' ? 'rgba(255, 230, 180, 0.45)' : (evt.action === 'replace_seat' ? '#60a5fa' : '#ffd700');
      window.templeScene.triggerSeatBurst(evt.seatIndex, burstColor);

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
    if ((evt.action === 'join_seat' || evt.action === 'replace_seat') && window.templeAudio) {
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

  // Hàng đợi phát bài kinh & xướng tên tuần tự - ĐẢM BẢO KHÔNG BAO GIỜ NÓI ĐÈ LÊN NHAU
  const clientChantQueue = [];
  let isProcessingClientChant = false;

  async function processClientChantQueue() {
    if (isProcessingClientChant) return;
    isProcessingClientChant = true;

    while (clientChantQueue.length > 0) {
      const payload = clientChantQueue.shift();
      try {
        const isMerit = payload.type === 'merit_dedication';
        const title = isMerit
          ? `✦ XƯỚNG TÊN HỒI HƯỚNG · ${(payload.donorName || '').toUpperCase()} ✦`
          : `✦ ${(payload.title || 'TỤNG KINH TỊNH TÂM').toUpperCase()} ✦`;

        let targetSeatIndex = (typeof payload.seatIndex === 'number' && payload.seatIndex >= 0) ? payload.seatIndex : -1;
        if (targetSeatIndex < 0 && payload.donorName && window.templeScene && window.templeScene.seats) {
          const normDonor = String(payload.donorName).toLowerCase().trim();
          const foundSeat = window.templeScene.seats.find(s => s && s.occupied && s.user && String(s.user.nickname).toLowerCase().trim() === normDonor);
          if (foundSeat) targetSeatIndex = foundSeat.index;
        }

        const textLen = (payload.text || '').length;
        const estDurationMs = Math.min(15000, Math.max(7500, textLen * 110));

        showChantToast(title, payload.text, estDurationMs);

        if (isMerit && targetSeatIndex >= 0 && window.templeScene) {
          window.templeScene.setSpotlightSeat(targetSeatIndex, estDurationMs);
        }

        if (window.templeAudio) {
          await window.templeAudio.playChantSpeech(payload);
        } else {
          await new Promise(r => setTimeout(r, estDurationMs));
        }

        if (window.templeScene) {
          window.templeScene.clearSpotlightSeat();
        }
        // Khoảng lặng 400ms giữa 2 lượt đọc
        await new Promise(r => setTimeout(r, 400));
      } catch (err) {
        console.warn('[ClientChantQueue] Error:', err);
      }
    }

    isProcessingClientChant = false;
  }

  socket.on('chant_speech', payload => {
    if (!payload) return;
    clientChantQueue.push(payload);
    processClientChantQueue();
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

  // ==========================================================================
  // HỆ THỐNG KÉO THẢ (DRAG) & PHÓNG TO / THU NHỎ (RESIZE) ĐỒNG BỘ THỜI GIAN THỰC LÊN LIVE OBS
  // Hỗ trợ Bảng Hướng Dẫn, Bảng Công Đức, Banner Tiêu Đề & Nhãn Tên 3 Thầy
  // ==========================================================================
  const movableInstancesMap = new Map();

  function applyUiLayout(layoutMap) {
    if (!layoutMap) return;
    Object.keys(layoutMap).forEach(key => {
      const inst = movableInstancesMap.get(key);
      if (inst) {
        const l = layoutMap[key];
        inst.updateExternal(l.left, l.top, l.scale);
      }
    });
  }

  function setupDraggableAndResizable(el, handle, storageKey, defaultOpts = {}) {
    if (!el || !stageContainer) return null;

    const dragHandle = handle || el;
    let currentLeftPct = defaultOpts.left !== undefined ? defaultOpts.left : 0;
    let currentTopPct = defaultOpts.top !== undefined ? defaultOpts.top : 0;
    let currentScale = defaultOpts.scale !== undefined ? defaultOpts.scale : 1.0;
    const origin = defaultOpts.origin || 'top left';
    const centerTranslate = !!defaultOpts.centerTranslate;

    // Khôi phục từ localStorage (nếu có cache cục bộ)
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const d = JSON.parse(saved);
        if (typeof d.left === 'number') currentLeftPct = d.left;
        if (typeof d.top === 'number') currentTopPct = d.top;
        if (typeof d.scale === 'number') currentScale = d.scale;
      }
    } catch (_) {}

    function apply() {
      el.style.left = `${currentLeftPct}%`;
      el.style.top = `${currentTopPct}%`;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.transform = centerTranslate
        ? `translate(-50%, -50%) scale(${currentScale})`
        : `scale(${currentScale})`;
      el.style.transformOrigin = origin;
    }
    apply();

    function saveLocal() {
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          left: currentLeftPct,
          top: currentTopPct,
          scale: currentScale
        }));
      } catch (_) {}
    }

    // Gửi vị trí đồng bộ qua Socket.IO tới màn hình Live OBS trong thời gian thực
    let lastEmitTime = 0;
    let emitTimer = null;
    function emitLiveThrottled() {
      const now = Date.now();
      if (now - lastEmitTime > 35) {
        lastEmitTime = now;
        sendSocketLayout();
      } else {
        clearTimeout(emitTimer);
        emitTimer = setTimeout(() => {
          lastEmitTime = Date.now();
          sendSocketLayout();
        }, 35);
      }
    }

    function sendSocketLayout() {
      if (socket && socket.connected) {
        socket.emit('update_ui_layout', {
          key: storageKey,
          left: currentLeftPct,
          top: currentTopPct,
          scale: currentScale
        });
      }
    }

    // 1. Kéo thả di chuyển (Drag)
    dragHandle.style.cursor = 'grab';
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeftPx = 0, initialTopPx = 0;

    const onPointerDown = e => {
      if (e.target.closest('.card-resize-handle') || e.target.closest('button')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = el.getBoundingClientRect();
      const stageRect = stageContainer.getBoundingClientRect();
      if (centerTranslate) {
        initialLeftPx = (rect.left + rect.width / 2) - stageRect.left;
        initialTopPx = (rect.top + rect.height / 2) - stageRect.top;
      } else {
        initialLeftPx = rect.left - stageRect.left;
        initialTopPx = rect.top - stageRect.top;
      }

      el.classList.add('is-dragging');
      el.style.transition = 'none';
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    };

    const onPointerMove = e => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const stageW = stageContainer.clientWidth || 540;
      const stageH = stageContainer.clientHeight || 960;

      const newLeftPx = centerTranslate
        ? Math.max(10, Math.min(stageW - 10, initialLeftPx + dx))
        : Math.max(-20, Math.min(stageW - 30, initialLeftPx + dx));
      const newTopPx = centerTranslate
        ? Math.max(10, Math.min(stageH - 10, initialTopPx + dy))
        : Math.max(0, Math.min(stageH - 30, initialTopPx + dy));

      currentLeftPct = Number(((newLeftPx / stageW) * 100).toFixed(2));
      currentTopPct = Number(((newTopPx / stageH) * 100).toFixed(2));

      apply();
      emitLiveThrottled();
    };

    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      el.classList.remove('is-dragging');
      el.style.transition = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      saveLocal();
      sendSocketLayout();
    };

    dragHandle.addEventListener('pointerdown', onPointerDown);

    // 2. Kéo góc để phóng to / thu nhỏ (Resize Handle)
    const resizeHandle = el.querySelector('.card-resize-handle');
    let isResizing = false;
    if (resizeHandle) {
      let resizeStartX = 0, resizeStartY = 0;
      let initialScale = 1.0;

      const onResizeDown = e => {
        e.stopPropagation();
        isResizing = true;
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        initialScale = currentScale;

        el.classList.add('is-resizing');
        el.style.transition = 'none';
        window.addEventListener('pointermove', onResizeMove);
        window.addEventListener('pointerup', onResizeUp);
      };

      const onResizeMove = e => {
        if (!isResizing) return;
        const dx = e.clientX - resizeStartX;
        const dy = e.clientY - resizeStartY;
        const dist = (dx + dy) * 0.5;
        const scaleDelta = dist / 180;
        currentScale = Math.max(0.55, Math.min(2.4, Number((initialScale + scaleDelta).toFixed(2))));
        apply();
        emitLiveThrottled();
      };

      const onResizeUp = () => {
        if (!isResizing) return;
        isResizing = false;
        el.classList.remove('is-resizing');
        el.style.transition = '';
        window.removeEventListener('pointermove', onResizeMove);
        window.removeEventListener('pointerup', onResizeUp);
        saveLocal();
        sendSocketLayout();
      };

      resizeHandle.addEventListener('pointerdown', onResizeDown);
    }

    // 3. Zoom bằng lăn chuột khi giữ Alt hoặc Ctrl
    el.addEventListener('wheel', e => {
      if (e.altKey || e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        currentScale = Math.max(0.55, Math.min(2.4, Number((currentScale + delta).toFixed(2))));
        apply();
        saveLocal();
        sendSocketLayout();
      }
    }, { passive: false });

    const instance = {
      storageKey,
      apply,
      updateExternal: (left, top, scale) => {
        if (!isDragging && !isResizing) {
          if (typeof left === 'number') currentLeftPct = left;
          if (typeof top === 'number') currentTopPct = top;
          if (typeof scale === 'number') currentScale = scale;
          apply();
          saveLocal();
        }
      },
      reset: (broadcast = true) => {
        currentLeftPct = defaultOpts.left !== undefined ? defaultOpts.left : 0;
        currentTopPct = defaultOpts.top !== undefined ? defaultOpts.top : 0;
        currentScale = defaultOpts.scale !== undefined ? defaultOpts.scale : 1.0;
        apply();
        saveLocal();
        if (broadcast) sendSocketLayout();
      }
    };

    movableInstancesMap.set(storageKey, instance);
    return instance;
  }

  // Khởi tạo các khung kéo thả & co giãn
  const movableInstances = [];

  const topHudEl = document.getElementById('top-hud');
  const bannerDragHandle = document.getElementById('banner-drag-handle') || topHudEl;
  if (topHudEl) {
    movableInstances.push(setupDraggableAndResizable(topHudEl, bannerDragHandle, 'thien_duong_pos_tophud', {
      left: 4.5,
      top: 7.2,
      scale: 1.0,
      origin: 'top center'
    }));
  }

  if (guideCard) {
    movableInstances.push(setupDraggableAndResizable(guideCard, guideDragHandle, 'thien_duong_pos_guide', {
      left: 2.3,
      top: 25.5,
      scale: 1.0,
      origin: 'top left'
    }));
  }

  const meritCardEl = document.getElementById('merit-card');
  const meritDragHandleEl = document.getElementById('merit-drag-handle') || meritCardEl;
  if (meritCardEl) {
    movableInstances.push(setupDraggableAndResizable(meritCardEl, meritDragHandleEl, 'thien_duong_pos_merit', {
      left: 70.2,
      top: 25.5,
      scale: 1.0,
      origin: 'top left'
    }));
  }

  const tagMonkLeft = document.getElementById('tag-thay-minh-dao');
  if (tagMonkLeft) {
    movableInstances.push(setupDraggableAndResizable(tagMonkLeft, tagMonkLeft, 'thien_duong_pos_monk_1', {
      left: 28,
      top: 55,
      scale: 1.0,
      origin: 'center center',
      centerTranslate: true
    }));
  }

  const tagMonkCenter = document.getElementById('tag-su-tru-tri');
  if (tagMonkCenter) {
    movableInstances.push(setupDraggableAndResizable(tagMonkCenter, tagMonkCenter, 'thien_duong_pos_monk_2', {
      left: 50,
      top: 54,
      scale: 1.0,
      origin: 'center center',
      centerTranslate: true
    }));
  }

  const tagMonkRight = document.getElementById('tag-thay-tam-tu');
  if (tagMonkRight) {
    movableInstances.push(setupDraggableAndResizable(tagMonkRight, tagMonkRight, 'thien_duong_pos_monk_3', {
      left: 72,
      top: 55,
      scale: 1.0,
      origin: 'center center',
      centerTranslate: true
    }));
  }

  const btnResetPositions = document.getElementById('btn-reset-positions');
  if (btnResetPositions) {
    btnResetPositions.addEventListener('click', () => {
      if (socket && socket.connected) {
        socket.emit('reset_ui_layout');
      } else {
        movableInstances.forEach(inst => inst && inst.reset && inst.reset(false));
      }
    });
  }

  // Lắng nghe sự kiện đồng bộ vị trí khung từ Server (khi di chuyển ở tab khác hoặc Bảng Quản trị)
  socket.on('ui_layout_changed', data => {
    if (!data || !data.key) return;
    const inst = movableInstancesMap.get(data.key);
    if (inst) {
      inst.updateExternal(data.left, data.top, data.scale);
    }
  });

  socket.on('ui_layout_reset', layoutMap => {
    if (layoutMap) {
      applyUiLayout(layoutMap);
    } else {
      movableInstances.forEach(inst => inst && inst.reset && inst.reset(false));
    }
  });

  // 5. Áp dụng cấu hình HUD từ Server (Chỉ điều khiển hiển thị/ẩn, độ mờ opacity và gập gọn, không ghi đè vị trí kéo thả)
  function applyHudConfig(cfg) {
    if (!guideCard || !cfg) return;

    if (cfg.guidePosition === 'hidden') {
      guideCard.classList.add('ui-hidden');
      return;
    }
    guideCard.classList.remove('ui-hidden');

    if (typeof cfg.guideOpacity === 'number') {
      guideCard.style.opacity = cfg.guideOpacity;
      if (meritCardEl) meritCardEl.style.opacity = cfg.guideOpacity;
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
