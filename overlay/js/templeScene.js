/**
 * Bộ dựng cảnh Chánh Điện 3D (Three.js) + 24 Bồ Đoàn & 8 Skin Nhân Vật (Canvas 2.5D)
 */

class TempleSceneRenderer {
  constructor() {
    this.threeCanvas = document.getElementById('three-canvas');
    this.sceneCanvas = document.getElementById('scene-canvas');
    this.ctx = this.sceneCanvas.getContext('2d');
    this.seatLabelsLayer = document.getElementById('seat-labels-layer');

    this.currentThemeId = 1;
    this.seats = [];
    this.seatBurstEffects = {}; // seatIndex -> { startTime, color }
    this.activeIncenseOfferings = new Map(); // seatIndex -> { seatIndex, user, startTime }
    this.woodenFishPulse = 0;

    this.initThreeScene();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    window.onWoodenFishBeat = () => {
      this.woodenFishPulse = 1.0;
    };

    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThreeScene() {
    if (typeof THREE === 'undefined') return;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 9 / 16, 0.1, 100);
    this.camera.position.set(0, 0, 10);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.threeCanvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));

    // 1. Vòng Hào Quang Phật (Tỏa sáng nhẹ phía sau đầu tượng Phật)
    const haloGeo = new THREE.RingGeometry(0.95, 1.45, 48);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffdf73,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    this.haloMesh = new THREE.Mesh(haloGeo, haloMat);
    this.haloMesh.position.set(0, 2.35, 0);
    this.scene.add(this.haloMesh);

    // 2. Hệ thống hạt Khói Lư Hương 3D bay từ bàn thờ lên
    const smokeCount = 55;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePositions = new Float32Array(smokeCount * 3);
    this.smokeData = [];

    for (let i = 0; i < smokeCount; i++) {
      const yOffset = (i / smokeCount) * 2.5;
      smokePositions[i * 3] = (Math.random() - 0.5) * 0.18;
      smokePositions[i * 3 + 1] = -0.15 + yOffset;
      smokePositions[i * 3 + 2] = 0;
      this.smokeData.push({
        phase: Math.random() * Math.PI * 2,
        speed: 0.35 + Math.random() * 0.25,
        y: yOffset
      });
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));

    const smokeTexture = this.createSoftCircleTexture('#fff9eb');
    const smokeMat = new THREE.PointsMaterial({
      size: 0.42,
      map: smokeTexture,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.smokePoints = new THREE.Points(smokeGeo, smokeMat);
    this.scene.add(this.smokePoints);

    // 3. Hệ thống hạt Bầu Khí Quyển theo từng Theme (Hoa sen vàng, Đèn trời, Đom đóm)
    const ambCount = 42;
    const ambGeo = new THREE.BufferGeometry();
    const ambPos = new Float32Array(ambCount * 3);
    this.ambData = [];

    for (let i = 0; i < ambCount; i++) {
      const x = (Math.random() - 0.5) * 5.2;
      const y = (Math.random() - 0.5) * 8.5;
      const z = (Math.random() - 0.5) * 1.5;
      ambPos[i * 3] = x;
      ambPos[i * 3 + 1] = y;
      ambPos[i * 3 + 2] = z;
      this.ambData.push({
        x,
        y,
        z,
        vx: (Math.random() - 0.5) * 0.15,
        vy: 0.2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2
      });
    }
    ambGeo.setAttribute('position', new THREE.BufferAttribute(ambPos, 3));

    this.ambMat = new THREE.PointsMaterial({
      size: 0.16,
      map: this.createSoftCircleTexture('#ffd966'),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.ambPoints = new THREE.Points(ambGeo, this.ambMat);
    this.scene.add(this.ambPoints);
  }

  createSoftCircleTexture(colorHex) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, colorHex);
    grad.addColorStop(0.5, 'rgba(255, 224, 140, 0.45)');
    grad.addColorStop(1, 'rgba(255, 224, 140, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }

  handleResize() {
    const container = document.getElementById('stage-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    // Tối ưu cân bằng giữa độ nét tuyệt đối và độ mượt 60 FPS:
    // Giữ canvas ở chuẩn Full HD 1080p, tránh đẩy lên 4K gây giật lag
    const dpr = rect.width >= 1000 ? 1 : Math.min(2, Math.max(1, 1080 / rect.width));

    this.width = rect.width;
    this.height = rect.height;

    this.sceneCanvas.width = Math.round(rect.width * dpr);
    this.sceneCanvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    if (this.renderer && this.camera) {
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(rect.width, rect.height, false);
      this.camera.aspect = rect.width / rect.height;
      this.camera.updateProjectionMatrix();
    }

    this.syncSeatLabelPositions();
  }

  setTheme(themeId) {
    this.currentThemeId = Number(themeId) || 1;
    if (this.ambMat) {
      const colors = {
        1: 0xffcf75,
        2: 0x9ae6ff,
        3: 0xffe066,
        4: 0xe6f4b8,
        5: 0xffdf9e
      };
      this.ambMat.color.setHex(colors[this.currentThemeId] || 0xffcf75);
    }
    this.updateMonkTagPositions();
  }

  updateMonkTagPositions() {
    const leftTag = document.getElementById('tag-thay-minh-dao');
    const centerTag = document.getElementById('tag-su-tru-tri');
    const rightTag = document.getElementById('tag-thay-tam-tu');
    if (!leftTag || !centerTag || !rightTag) return;

    // Căn chỉnh vị trí nhãn 3 vị Thầy khớp với từng mẫu thiết kế
    const layouts = {
      1: { l: ['18%', '56.2%'], c: ['50%', '55.0%'], r: ['82%', '56.2%'] },
      2: { l: ['26%', '55.5%'], c: ['50%', '54.5%'], r: ['74%', '55.5%'] },
      3: { l: ['19%', '55.8%'], c: ['50%', '54.8%'], r: ['81%', '55.8%'] },
      4: { l: ['29%', '45.8%'], c: ['50%', '45.2%'], r: ['71%', '45.8%'] },
      5: { l: ['29%', '48.8%'], c: ['50%', '48.8%'], r: ['71%', '48.8%'] }
    };
    const cfg = layouts[this.currentThemeId] || layouts[1];
    leftTag.style.left = cfg.l[0];
    leftTag.style.top = cfg.l[1];
    centerTag.style.left = cfg.c[0];
    centerTag.style.top = cfg.c[1];
    rightTag.style.left = cfg.r[0];
    rightTag.style.top = cfg.r[1];
  }

  updateSeats(seats = [], gridCols = 4, gridRows = 6) {
    this.seats = seats;
    this.gridCols = Number(gridCols) || 4;
    this.gridRows = Number(gridRows) || 6;
    this.renderSeatDOMLabels();
  }

  triggerSeatBurst(seatIndex, color = '#ffd700') {
    this.seatBurstEffects[seatIndex] = {
      startTime: performance.now(),
      color
    };
  }

  /**
   * Tính tọa độ phối cảnh (x, y, scale) của từng bồ đoàn (hỗ trợ động 24 -> 36 -> 48 -> 64 -> 100 chỗ)
   */
  getSeatProjection(row, col) {
    const w = this.width || 540;
    const h = this.height || 960;
    const cols = Math.max(2, this.gridCols || 4);
    const rows = Math.max(2, this.gridRows || 6);

    const t = row / Math.max(1, rows - 1); // 0..1
    const yRatio = 0.632 + Math.pow(t, 1.06) * 0.315;
    const y = h * yRatio;

    let halfSpanTop = cols > 4 ? 0.285 : 0.255;
    let halfSpanBottom = cols > 4 ? 0.395 : 0.355;

    if (this.currentThemeId === 2) {
      halfSpanTop = cols > 4 ? 0.225 : 0.185;
      halfSpanBottom = cols > 4 ? 0.365 : 0.325;
    } else if (this.currentThemeId === 5) {
      halfSpanTop = cols > 4 ? 0.255 : 0.225;
      halfSpanBottom = cols > 4 ? 0.385 : 0.355;
    }

    const halfSpan = halfSpanTop + (halfSpanBottom - halfSpanTop) * t;
    const midCol = (cols - 1) / 2;
    const colNorm = midCol > 0 ? (col - midCol) / midCol : 0; // -1 .. +1
    const x = w * (0.5 + colNorm * halfSpan);

    // Tự động thu gọn tỉ lệ nhân vật khi lưới mở rộng lên 6x6, 8x8, 10x10
    const densityFactor = Math.min(1.0, 4.3 / Math.pow(cols, 0.88));
    const scale = (0.72 + t * 0.36) * densityFactor;

    return { x, y, scale };
  }

  renderSeatDOMLabels() {
    if (!this.seatLabelsLayer) return;
    this.seatLabelsLayer.innerHTML = '';
    const total = this.seats.length;

    this.seats.forEach(seat => {
      if (!seat.occupied || !seat.user) return;
      const proj = this.getSeatProjection(seat.row, seat.col);
      const headOffset = 42 * proj.scale;

      const tag = document.createElement('div');
      tag.className = 'seat-name-tag' + (seat.user.hasMeritAura ? ' merit-vip' : '');
      tag.style.left = `${proj.x}px`;
      tag.style.top = `${proj.y - headOffset}px`;
      if (total > 36) {
        tag.style.fontSize = total > 64 ? '8px' : '9.5px';
        tag.style.padding = '1px 6px';
      }
      tag.textContent = seat.user.nickname;

      if (seat.user.prayerText && Date.now() - (seat.user.lastActive || 0) < 6000) {
        const bubble = document.createElement('div');
        bubble.className = 'prayer-bubble';
        bubble.textContent = seat.user.prayerText;
        tag.appendChild(bubble);
      }

      this.seatLabelsLayer.appendChild(tag);
    });
  }

  syncSeatLabelPositions() {
    this.renderSeatDOMLabels();
  }

  animate(now) {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    const timeSec = now * 0.001;

    this.updateThreeLayer(timeSec, dt);
    this.drawSceneCanvas(timeSec, dt);

    requestAnimationFrame(this.animate);
  }

  updateThreeLayer(timeSec, dt) {
    if (!this.renderer || !this.scene || !this.camera) return;

    // Xoay nhẹ hào quang Phật
    if (this.haloMesh) {
      this.haloMesh.rotation.z = timeSec * 0.15;
      this.haloMesh.material.opacity = 0.16 + Math.sin(timeSec * 2.2) * 0.06;
    }

    // Khói lư hương uốn lượn bay lên
    if (this.smokePoints && this.smokeData) {
      const posAttr = this.smokePoints.geometry.attributes.position;
      for (let i = 0; i < this.smokeData.length; i++) {
        const d = this.smokeData[i];
        d.y += d.speed * dt;
        if (d.y > 2.4) d.y = 0;
        const progress = d.y / 2.4;
        const swayX = Math.sin(timeSec * 1.6 + d.phase + progress * 4.0) * (0.04 + progress * 0.18);
        posAttr.setXYZ(i, swayX, -0.15 + d.y, 0);
      }
      posAttr.needsUpdate = true;
    }

    // Hạt ánh sáng / hoa sen rơi / đèn trời theo Theme
    if (this.ambPoints && this.ambData) {
      const posAttr = this.ambPoints.geometry.attributes.position;
      const falling = this.currentThemeId === 3 || this.currentThemeId === 4;
      for (let i = 0; i < this.ambData.length; i++) {
        const p = this.ambData[i];
        p.x += Math.sin(timeSec + p.phase) * 0.003;
        p.y += (falling ? -p.vy : p.vy) * dt;
        if (p.y > 4.5) p.y = -4.5;
        if (p.y < -4.5) p.y = 4.5;
        posAttr.setXYZ(i, p.x, p.y, p.z);
      }
      posAttr.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }

  drawSceneCanvas(timeSec, dt) {
    const ctx = this.ctx;
    const w = this.width || 540;
    const h = this.height || 960;
    ctx.clearRect(0, 0, w, h);

    // Giảm dần xung nhịp gõ mõ
    if (this.woodenFishPulse > 0) {
      this.woodenFishPulse = Math.max(0, this.woodenFishPulse - dt * 2.4);
    }

    // Ở Mẫu 1, vẽ thêm Sư Trụ Trì ngồi chính giữa trước bàn thờ cùng chiếc Mõ đỏ
    if (this.currentThemeId === 1) {
      this.drawCenterAbbotMonk(ctx, w * 0.5, h * 0.598, (w / 540) * 0.88, timeSec);
    }

    // Hiệu ứng vòng sóng âm thanh tâm linh mỗi nhịp gõ mõ
    if (this.woodenFishPulse > 0.01) {
      const pulseY = this.currentThemeId >= 4 ? h * 0.51 : h * 0.59;
      const radius = (1 - this.woodenFishPulse) * 58 + 10;
      ctx.save();
      ctx.beginPath();
      ctx.arc(w * 0.5, pulseY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 223, 115, ${this.woodenFishPulse * 0.55})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Vẽ 24 bồ đoàn từ hàng 0 (xa) tới hàng 5 (gần) để đảm bảo chiều sâu chuẩn xác
    for (let i = 0; i < this.seats.length; i++) {
      const seat = this.seats[i];
      const proj = this.getSeatProjection(seat.row, seat.col);
      const unitScale = (w / 540) * proj.scale;

      // 1. Vẽ tọa cụ & bồ đoàn theo phong cách của từng Mẫu Chùa
      this.drawCushion(ctx, proj.x, proj.y, unitScale, seat, timeSec);

      // 2. Nếu có người đang ngồi thiền -> Kiểm tra xem có đang đi lên cắm nhang không
      const isWalkingToOfferIncense = this.activeIncenseOfferings.has(seat.index);
      if (seat.occupied && seat.user) {
        if (isWalkingToOfferIncense) {
          // Người này đang đi lên cắm nhang: vẽ bóng sen vàng mờ trên bồ đoàn chờ họ quay về
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(proj.x, proj.y - 2 * unitScale, 18 * unitScale, 8 * unitScale, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
          ctx.fill();
          ctx.restore();
        } else {
          this.drawMeditatorAvatar(ctx, proj.x, proj.y, unitScale, seat.user, seat.index, timeSec);
        }
      }

      // 3. Hiệu ứng hoa sen vàng bừng sáng khi mới vào hoặc đổi skin / tặng quà / vừa cắm nhang về
      const burst = this.seatBurstEffects[seat.index];
      if (burst) {
        const age = (performance.now() - burst.startTime) / 1000;
        if (age < 1.4) {
          const p = age / 1.4;
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(proj.x, proj.y, (28 + p * 36) * unitScale, (12 + p * 16) * unitScale, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 215, 0, ${(1 - p) * 0.9})`;
          ctx.lineWidth = 3 * unitScale;
          ctx.stroke();
          ctx.restore();
        } else {
          delete this.seatBurstEffects[seat.index];
        }
      }
    }

    // 4. Vẽ những người đang đi lên cắm nhang (dâng hương, cúi lạy trước lư hương Chánh Điện)
    this.drawIncenseOfferings(ctx, w, h, timeSec);
  }

  /**
   * Kích hoạt hoạt ảnh nhân vật đứng dậy đi lên cắm nhang khi gõ "adidaphat"
   */
  triggerIncenseOffering(seatIndex, user) {
    if (typeof seatIndex !== 'number' || seatIndex < 0) return;
    this.activeIncenseOfferings.set(seatIndex, {
      seatIndex,
      user,
      startTime: performance.now(),
      totalDuration: 9000 // 9 giây hoàn tất 3 pha
    });
    // Gõ 1 tiếng chuông khánh nhẹ kích hoạt tâm linh
    if (window.audioEngine && typeof window.audioEngine.playTempleBell === 'function') {
      window.audioEngine.playTempleBell();
    }
  }

  /**
   * Vẽ hoạt ảnh người đi lên cắm nhang, dâng 3 nén hương đỏ bốc khói, lạy 3 xá rồi trở về
   */
  drawIncenseOfferings(ctx, w, h, timeSec) {
    if (this.activeIncenseOfferings.size === 0) return;

    const now = performance.now();
    for (const [seatIndex, off] of this.activeIncenseOfferings.entries()) {
      const elapsed = now - off.startTime;
      if (elapsed >= off.totalDuration) {
        // Hoàn tất: ban phước bằng vòng sen vàng bừng sáng tại bồ đoàn
        this.seatBurstEffects[seatIndex] = { startTime: now };
        this.activeIncenseOfferings.delete(seatIndex);
        continue;
      }

      const seat = this.seats.find(s => s.index === seatIndex);
      if (!seat) {
        this.activeIncenseOfferings.delete(seatIndex);
        continue;
      }

      const proj = this.getSeatProjection(seat.row, seat.col);
      const originX = proj.x;
      const originY = proj.y;
      const originScale = (w / 540) * proj.scale;

      // Vị trí trước lư hương bàn thờ Phật (phân chia 3 vị trí trái - giữa - phải nếu đông người)
      const slotOffset = ((seatIndex % 3) - 1) * 36 * (w / 540);
      const targetX = w * 0.5 + slotOffset;
      const targetY = (this.currentThemeId >= 4 ? h * 0.518 : h * 0.584);
      const targetScale = (w / 540) * 0.94;

      let curX = originX;
      let curY = originY;
      let curScale = originScale;
      let isBowing = false;
      let bowDrop = 0;

      if (elapsed < 2500) {
        // Pha 1: Đi lên bàn thờ (0.0s -> 2.5s)
        const t = elapsed / 2500;
        const smoothT = t * t * (3 - 2 * t);
        curX = originX + (targetX - originX) * smoothT;
        curY = originY + (targetY - originY) * smoothT;
        curScale = originScale + (targetScale - originScale) * smoothT;
        // Nhịp bước chân nhấp nhô
        const footStep = Math.abs(Math.sin(t * Math.PI * 7)) * 4 * curScale;
        curY -= footStep;
      } else if (elapsed < 6500) {
        // Pha 2: Đứng dâng 3 nén nhang & Cúi lạy 3 xá (2.5s -> 6.5s)
        curX = targetX;
        curY = targetY;
        curScale = targetScale;
        isBowing = true;
        const bowT = (elapsed - 2500) / 4000;
        // 3 nhịp lạy cung kính
        const bowWave = Math.abs(Math.sin(bowT * Math.PI * 3));
        bowDrop = bowWave * 8.5 * curScale;
        // Tăng độ sáng xung nhịp khói lư hương
        this.woodenFishPulse = Math.max(this.woodenFishPulse, 0.45);
      } else {
        // Pha 3: Quay trở về bồ đoàn (6.5s -> 9.0s)
        const t = (elapsed - 6500) / 2500;
        const smoothT = t * t * (3 - 2 * t);
        curX = targetX + (originX - targetX) * smoothT;
        curY = targetY + (originY - targetY) * smoothT;
        curScale = targetScale + (originScale - targetScale) * smoothT;
        const footStep = Math.abs(Math.sin(t * Math.PI * 7)) * 3.5 * curScale;
        curY -= footStep;
      }

      // 1. Vẽ bóng đổ dưới chân người đang di chuyển
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(curX, curY + 4 * curScale, 18 * curScale, 7 * curScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Vẽ nhân vật dâng hương
      this.drawMeditatorAvatar(ctx, curX, curY + bowDrop * 0.4, curScale, off.user, seatIndex, timeSec, {
        bowDrop,
        isBowing,
        isOfferingIncense: isBowing
      });

      // 3. Nếu đang trong pha dâng hương: vẽ 3 nén nhang đỏ phát sáng bốc khói vàng trên tay
      if (isBowing) {
        this.drawIncenseSticks(ctx, curX, curY - 22 * curScale + bowDrop, curScale, timeSec);
      }
    }
  }

  /**
   * Vẽ 3 nén nhang đỏ cúng dường với đóm đỏ rực và làn khói vàng bốc lên
   */
  drawIncenseSticks(ctx, x, y, s, timeSec) {
    ctx.save();
    ctx.translate(x, y);

    const stickOffsets = [-5 * s, 0, 5 * s];
    for (let idx = 0; idx < 3; idx++) {
      const ox = stickOffsets[idx];
      const oy = (idx === 1 ? -4 * s : 0);

      // Thân nén hương vàng nâu
      ctx.strokeStyle = '#c2410c';
      ctx.lineWidth = 1.8 * s;
      ctx.beginPath();
      ctx.moveTo(ox, 16 * s);
      ctx.lineTo(ox, oy);
      ctx.stroke();

      // Đóm than đỏ rực trên đầu nén hương
      const glow = 0.7 + Math.sin(timeSec * 8 + idx * 2) * 0.3;
      ctx.fillStyle = `rgba(239, 68, 68, ${glow})`;
      ctx.beginPath();
      ctx.arc(ox, oy, 2.4 * s, 0, Math.PI * 2);
      ctx.fill();

      // Hào quang đóm hương
      ctx.fillStyle = `rgba(251, 191, 36, ${glow * 0.6})`;
      ctx.beginPath();
      ctx.arc(ox, oy, 4.2 * s, 0, Math.PI * 2);
      ctx.fill();

      // Làn khói hương mỏng bay lên uốn lượn
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.55)';
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      const sway1 = Math.sin(timeSec * 3 + idx) * 4 * s;
      const sway2 = Math.cos(timeSec * 2.5 + idx) * 6 * s;
      ctx.quadraticCurveTo(ox + sway1, oy - 12 * s, ox + sway2, oy - 24 * s);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Vẽ Sư Trụ Trì ngồi chính giữa gõ mõ (cho Mẫu 1 giống hệt hình mẫu)
   */
  drawCenterAbbotMonk(ctx, x, y, s, timeSec) {
    const breath = Math.sin(timeSec * 2.0) * 1.2 * s;
    ctx.save();
    ctx.translate(x, y);

    // Đệm ngồi vàng của Sư Trụ Trì
    ctx.fillStyle = '#c98a27';
    ctx.beginPath();
    ctx.ellipse(0, 6 * s, 26 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thân y cà sa vàng cam của Sư Trụ Trì
    const robeGrad = ctx.createLinearGradient(0, -34 * s, 0, 8 * s);
    robeGrad.addColorStop(0, '#f6ad3c');
    robeGrad.addColorStop(1, '#c87815');
    ctx.fillStyle = robeGrad;
    ctx.beginPath();
    ctx.moveTo(-22 * s, 4 * s);
    ctx.quadraticCurveTo(-24 * s, -18 * s, -12 * s, -28 * s + breath);
    ctx.lineTo(12 * s, -28 * s + breath);
    ctx.quadraticCurveTo(24 * s, -18 * s, 22 * s, 4 * s);
    ctx.closePath();
    ctx.fill();

    // Dải y đỏ vắt chéo vai
    ctx.strokeStyle = '#b83227';
    ctx.lineWidth = 4.5 * s;
    ctx.beginPath();
    ctx.moveTo(-11 * s, -26 * s + breath);
    ctx.lineTo(14 * s, -2 * s);
    ctx.stroke();

    // Đầu Sư Trụ Trì
    ctx.fillStyle = '#e5a97c';
    ctx.beginPath();
    ctx.arc(0, -36 * s + breath, 9.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Chiếc Mõ Đỏ bên phải Sư Trụ Trì (nhịp nhẹ khi gõ mõ)
    const tapOffset = this.woodenFishPulse * 2.5 * s;
    ctx.fillStyle = '#c53030';
    ctx.beginPath();
    ctx.ellipse(24 * s, -2 * s + tapOffset, 8 * s, 6 * s, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Vẽ Tọa Cụ & Bồ Đoàn theo từng Mẫu Chùa (1..5)
   */
  drawCushion(ctx, x, y, s, seat, timeSec) {
    ctx.save();
    ctx.translate(x, y);

    const rx = 28 * s;
    const ry = 12.5 * s;

    // 1. Tấm tọa cụ vuông bên dưới bồ đoàn
    const matW = 66 * s;
    const matH = 26 * s;
    ctx.fillStyle = this.currentThemeId === 4 ? '#bca371' : (this.currentThemeId === 3 ? '#d69e2e' : '#7b1818');
    ctx.strokeStyle = 'rgba(238, 193, 97, 0.55)';
    ctx.lineWidth = 1.2 * s;

    ctx.beginPath();
    ctx.moveTo(-matW * 0.44, -matH * 0.48);
    ctx.lineTo(matW * 0.44, -matH * 0.48);
    ctx.lineTo(matW * 0.52, matH * 0.52);
    ctx.lineTo(-matW * 0.52, matH * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Vòng hào quang Công Đức dưới bồ đoàn nếu người ngồi đã tặng quà
    if (seat.occupied && seat.user && (seat.user.hasMeritAura || seat.user.skin === 'phattu_vang' || seat.user.skin === 'caotang')) {
      const pulse = 0.65 + Math.sin(timeSec * 4 + seat.index) * 0.25;
      ctx.beginPath();
      ctx.ellipse(0, 1 * s, rx * 1.28, ry * 1.28, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
      ctx.lineWidth = 2.5 * s;
      ctx.stroke();
    }

    // 2. Bóng đổ dưới đệm tròn
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, 4.5 * s, rx * 1.03, ry * 1.02, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Thân Bồ Đoàn Tròn 3D
    const grad = ctx.createRadialGradient(-6 * s, -4 * s, 2 * s, 0, 0, rx);
    if (this.currentThemeId === 2) {
      // Đài sen vàng phát sáng
      grad.addColorStop(0, '#fff3b0');
      grad.addColorStop(0.65, '#eab308');
      grad.addColorStop(1, '#a16207');
    } else if (this.currentThemeId === 4) {
      // Đệm cói Thiền Viện Trúc Lâm
      grad.addColorStop(0, '#e9c46a');
      grad.addColorStop(0.7, '#c8963e');
      grad.addColorStop(1, '#8d5b1c');
    } else {
      // Bồ đoàn tròn vàng cam truyền thống
      grad.addColorStop(0, '#f3b755');
      grad.addColorStop(0.68, '#d48c29');
      grad.addColorStop(1, '#8c5312');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nếu là Mẫu 2 (Liên Hoa Đêm Trăng), vẽ thêm viền cánh sen quanh bồ đoàn
    if (this.currentThemeId === 2) {
      ctx.strokeStyle = 'rgba(255, 245, 190, 0.65)';
      ctx.lineWidth = 1.2 * s;
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * rx * 0.72, Math.sin(ang) * ry * 0.72, 4.5 * s, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /**
   * Vẽ Nhân Vật Ngồi Thiền Quay Lưng Hướng Lên Tượng Phật (Hỗ trợ đủ 19 Skin:
   * 8 Phật Giáo + 6 Hài Hước + 5 Độc Đáo: Học Sinh, Đức Cha, Thần Tài, Ninja, Công Chúa)
   */
  drawMeditatorAvatar(ctx, x, y, s, user, seatIndex, timeSec, options = {}) {
    const skinKey = user.skin || 'nam';
    const breath = Math.sin(timeSec * 2.3 + seatIndex * 0.7) * 1.4 * s;
    const sway = Math.sin(timeSec * 1.2 + seatIndex * 1.1) * 0.8 * s;
    const bowDrop = options.bowDrop || 0;

    ctx.save();
    ctx.translate(x + sway, y - 3 * s);

    // Cấu hình màu sắc theo từng Skin (19 Skins)
    const palettes = {
      nam: { robeTop: '#8795a5', robeBot: '#526071', sash: '#d9e2ec', head: 'male_short' },
      nu: { robeTop: '#f8fafc', robeBot: '#cbd5e1', sash: '#e2e8f0', head: 'female_bun' },
      su: { robeTop: '#f6ad3c', robeBot: '#b76e14', sash: '#9c4221', head: 'monk_shaved' },
      tieusu: { robeTop: '#c08552', robeBot: '#7f4f24', sash: '#ecc94b', head: 'novice_topknot' },
      nicogiao: { robeTop: '#d4b475', robeBot: '#9c7a3c', sash: '#cbd5e0', head: 'monk_shaved' },
      caotang: { robeTop: '#e53e3e', robeBot: '#9b2c2c', sash: '#ffd700', head: 'monk_halo' },
      phattu_sen: { robeTop: '#f9a8d4', robeBot: '#db2777', sash: '#fdf2f8', head: 'female_lotus' },
      phattu_vang: { robeTop: '#fde047', robeBot: '#ca8a04', sash: '#ffffff', head: 'male_crown' },
      canhsat: { robeTop: '#356944', robeBot: '#1e3f28', sash: '#eab308', head: 'police_cap' },
      bacsi: { robeTop: '#ffffff', robeBot: '#dbeafe', sash: '#38bdf8', head: 'doctor_cap' },
      trom: { robeTop: '#334155', robeBot: '#0f172a', sash: '#f8fafc', head: 'thief_beanie' },
      heo: { robeTop: '#f9a8d4', robeBot: '#ec4899', sash: '#fbcfe8', head: 'pig_ears' },
      bo: { robeTop: '#ffffff', robeBot: '#e2e8f0', sash: '#1e293b', head: 'cow_horns' },
      ga: { robeTop: '#fde047', robeBot: '#eab308', sash: '#f97316', head: 'chicken_comb' },
      hocsinh: { robeTop: '#ffffff', robeBot: '#1e3a8a', sash: '#dc2626', head: 'student_scarf' },
      duccha: { robeTop: '#0f172a', robeBot: '#020617', sash: '#ffffff', head: 'priest_collar' },
      thantai: { robeTop: '#dc2626', robeBot: '#991b1b', sash: '#facc15', head: 'god_of_wealth' },
      ninja: { robeTop: '#1e1b4b', robeBot: '#0f172a', sash: '#4338ca', head: 'ninja_mask' },
      congchua: { robeTop: '#fbcfe8', robeBot: '#f472b6', sash: '#ffffff', head: 'princess_tiara' }
    };
    const pal = palettes[skinKey] || palettes.nam;

    // 1. Tà áo / Chân xếp bằng trên bồ đoàn
    ctx.fillStyle = pal.robeBot;
    ctx.beginPath();
    ctx.ellipse(0, -1 * s, 24.5 * s, 9.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Thân lưng ngồi thiền (hình giọt nước/chuông mềm mại)
    const bodyGrad = ctx.createLinearGradient(-16 * s, -34 * s, 16 * s, 2 * s);
    bodyGrad.addColorStop(0, pal.robeTop);
    bodyGrad.addColorStop(1, pal.robeBot);
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    ctx.moveTo(-21 * s, 0);
    ctx.quadraticCurveTo(-22 * s, -16 * s, -12.5 * s, -28 * s + breath + bowDrop * 0.3);
    ctx.quadraticCurveTo(0, -32 * s + breath + bowDrop * 0.5, 12.5 * s, -28 * s + breath + bowDrop * 0.3);
    ctx.quadraticCurveTo(22 * s, -16 * s, 21 * s, 0);
    ctx.quadraticCurveTo(0, 6 * s, -21 * s, 0);
    ctx.closePath();
    ctx.fill();

    // 3. Chi tiết đặc trưng trên thân lưng của từng Skin
    if (skinKey === 'canhsat') {
      // Cầu vai quân hàm vàng hai bên vai + Đai lưng cảnh sát
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-15 * s, -27 * s + breath, 6.5 * s, 3.2 * s);
      ctx.fillRect(8.5 * s, -27 * s + breath, 6.5 * s, 3.2 * s);
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 2.6 * s;
      ctx.beginPath();
      ctx.moveTo(-19 * s, -7 * s);
      ctx.quadraticCurveTo(0, -4 * s, 19 * s, -7 * s);
      ctx.stroke();
    } else if (skinKey === 'bacsi') {
      // Chữ thập đỏ (+) sau lưng áo Blouse + Dây ống nghe y tế vắt qua cổ
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.arc(0, -24 * s + breath, 8.5 * s, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-2 * s, -19 * s + breath * 0.5, 4 * s, 11 * s);
      ctx.fillRect(-5.5 * s, -15.5 * s + breath * 0.5, 11 * s, 4 * s);
    } else if (skinKey === 'trom') {
      // Áo kẻ sọc ngang Đen - Trắng + Bao tải vàng đeo sau lưng
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.6 * s;
      for (let sy = -23; sy <= -7; sy += 5.2) {
        ctx.beginPath();
        ctx.moveTo(-16 * s, sy * s + breath * 0.6);
        ctx.lineTo(16 * s, sy * s + breath * 0.6);
        ctx.stroke();
      }
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(8 * s, -12 * s + breath * 0.5, 7.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 1.2 * s;
      ctx.stroke();
    } else if (skinKey === 'bo') {
      // Các đốm bò sữa đen trên lưng trắng
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(-8 * s, -18 * s + breath * 0.6, 5.5 * s, 4 * s, 0.3, 0, Math.PI * 2);
      ctx.ellipse(7 * s, -11 * s + breath * 0.4, 6.2 * s, 4.5 * s, -0.4, 0, Math.PI * 2);
      ctx.ellipse(-3 * s, -6 * s + breath * 0.2, 4.2 * s, 3 * s, 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (skinKey === 'heo') {
      // Đuôi heo xoăn màu hồng đậm phía sau lưng
      ctx.strokeStyle = '#db2777';
      ctx.lineWidth = 2.2 * s;
      ctx.beginPath();
      ctx.arc(0, -4 * s, 3.8 * s, 0, Math.PI * 1.65);
      ctx.stroke();
    } else if (skinKey === 'ga') {
      // Hai cánh gà vàng cam xếp hai bên hông
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(-16.5 * s, -14 * s + breath * 0.5, 4 * s, 9 * s, 0.2, 0, Math.PI * 2);
      ctx.ellipse(16.5 * s, -14 * s + breath * 0.5, 4 * s, 9 * s, -0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (skinKey === 'hocsinh') {
      // Khăn quàng đỏ chữ V sau gáy + Balo học sinh cam/xanh sau lưng
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-9 * s, -26 * s + breath);
      ctx.lineTo(0, -18 * s + breath);
      ctx.lineTo(9 * s, -26 * s + breath);
      ctx.lineTo(5 * s, -21 * s + breath);
      ctx.lineTo(0, -15 * s + breath);
      ctx.lineTo(-5 * s, -21 * s + breath);
      ctx.closePath();
      ctx.fill();
      // Balo sau lưng
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-8 * s, -17 * s + breath * 0.5, 16 * s, 14 * s, 4 * s) : ctx.rect(-8 * s, -17 * s + breath * 0.5, 16 * s, 14 * s);
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.8 * s;
      ctx.stroke();
    } else if (skinKey === 'duccha') {
      // Cổ áo giáo sĩ trắng + Chuỗi Thánh Giá vàng sau lưng
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6 * s, -28 * s + breath, 12 * s, 3.5 * s);
      // Chuỗi Thánh Giá vàng
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(0, -22 * s + breath * 0.5);
      ctx.lineTo(0, -6 * s + breath * 0.5);
      ctx.moveTo(-4.5 * s, -17 * s + breath * 0.5);
      ctx.lineTo(4.5 * s, -17 * s + breath * 0.5);
      ctx.stroke();
    } else if (skinKey === 'thantai') {
      // Kim nguyên bảo / Thỏi vàng sau lưng + Đai vàng
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(0, -14 * s + breath * 0.5, 9 * s, 5.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 1.5 * s;
      ctx.stroke();
    } else if (skinKey === 'ninja') {
      // Thanh kiếm bọc vải đeo chéo sau lưng
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(-15 * s, -28 * s + breath);
      ctx.lineTo(15 * s, -3 * s);
      ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-16 * s, -30 * s + breath, 5 * s, 5 * s);
    } else if (skinKey === 'congchua') {
      // Nơ bướm hồng sau lưng
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.ellipse(-6 * s, -15 * s + breath * 0.5, 5 * s, 3.5 * s, -0.3, 0, Math.PI * 2);
      ctx.ellipse(6 * s, -15 * s + breath * 0.5, 5 * s, 3.5 * s, 0.3, 0, Math.PI * 2);
      ctx.arc(0, -15 * s + breath * 0.5, 3 * s, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Nếp áo / Dải y cà sa vắt chéo qua lưng cho 8 skin Phật giáo
      ctx.strokeStyle = pal.sash;
      ctx.lineWidth = 3.2 * s;
      ctx.beginPath();
      ctx.moveTo(-10 * s, -27 * s + breath);
      ctx.quadraticCurveTo(2 * s, -14 * s + breath * 0.5, 15 * s, -2 * s);
      ctx.stroke();
    }

    // 4. Vẽ Đầu & Mũ / Tai / Sừng theo đúng Skin
    const headY = -36.5 * s + breath + bowDrop;

    if (pal.head === 'monk_halo') {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.35)';
      ctx.beginPath();
      ctx.arc(0, headY, 13.5 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    if (pal.head === 'police_cap') {
      ctx.fillStyle = '#1f242d';
      ctx.beginPath();
      ctx.arc(0, headY, 8.8 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#285436';
      ctx.beginPath();
      ctx.ellipse(0, headY - 6 * s, 11.5 * s, 5.2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-9.5 * s, headY - 3.5 * s, 19 * s, 2.8 * s);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, headY - 4.8 * s, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();
    } else if (pal.head === 'doctor_cap') {
      ctx.fillStyle = '#1f242d';
      ctx.beginPath();
      ctx.arc(0, headY, 8.8 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-9.5 * s, headY - 10 * s, 19 * s, 8.5 * s, 3 * s) : ctx.rect(-9.5 * s, headY - 10 * s, 19 * s, 8.5 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-1.2 * s, headY - 8.5 * s, 2.4 * s, 5.6 * s);
      ctx.fillRect(-2.8 * s, headY - 6.9 * s, 5.6 * s, 2.4 * s);
    } else if (pal.head === 'thief_beanie') {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, headY, 9.2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, headY - 8.5 * s, 3.2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.8 * s;
      ctx.beginPath();
      ctx.moveTo(-8.5 * s, headY - 1 * s);
      ctx.lineTo(8.5 * s, headY - 1 * s);
      ctx.stroke();
    } else if (pal.head === 'pig_ears') {
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.ellipse(-9.5 * s, headY - 5.5 * s, 5 * s, 3.2 * s, -0.5, 0, Math.PI * 2);
      ctx.ellipse(9.5 * s, headY - 5.5 * s, 5 * s, 3.2 * s, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.arc(0, headY, 9.5 * s, 0, Math.PI * 2);
      ctx.fill();
    } else if (pal.head === 'cow_horns') {
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 3 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-7 * s, headY - 5 * s);
      ctx.quadraticCurveTo(-12 * s, headY - 11 * s, -8 * s, headY - 13 * s);
      ctx.moveTo(7 * s, headY - 5 * s);
      ctx.quadraticCurveTo(12 * s, headY - 11 * s, 8 * s, headY - 13 * s);
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(-10.5 * s, headY - 2 * s, 4 * s, 2.2 * s, -0.2, 0, Math.PI * 2);
      ctx.ellipse(10.5 * s, headY - 2 * s, 4 * s, 2.2 * s, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, headY, 9 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(-3.5 * s, headY - 2 * s, 3.8 * s, 0, Math.PI * 2);
      ctx.fill();
    } else if (pal.head === 'chicken_comb') {
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(0, headY, 8.8 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-3.2 * s, headY - 8.5 * s, 2.8 * s, 0, Math.PI * 2);
      ctx.arc(0, headY - 10.2 * s, 3.3 * s, 0, Math.PI * 2);
      ctx.arc(3.2 * s, headY - 8.5 * s, 2.8 * s, 0, Math.PI * 2);
      ctx.fill();
    } else if (pal.head === 'student_scarf') {
      // Đầu Học Sinh tóc đen ngắn + Viền cổ áo
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, headY, 8.8 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(0, headY + 7 * s, 8.5 * s, 2.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (pal.head === 'priest_collar') {
      // Đầu Đức Cha tóc ngắn gọn + Cổ cồn trắng
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, headY, 8.8 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5 * s, headY + 5.5 * s, 10 * s, 2.8 * s);
    } else if (pal.head === 'god_of_wealth') {
      // Mũ Cánh Chuồn Thần Tài
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, headY - 2 * s, 9.8 * s, 0, Math.PI * 2);
      ctx.fill();
      // 2 cánh chuồn ngang 2 bên
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-17 * s, headY - 4 * s, 7 * s, 3.5 * s);
      ctx.fillRect(10 * s, headY - 4 * s, 7 * s, 3.5 * s);
    } else if (pal.head === 'ninja_mask') {
      // Khăn trùm đầu Ninja + Băng trán kim loại
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(0, headY, 9 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-8 * s, headY - 5 * s, 16 * s, 3.2 * s);
    } else if (pal.head === 'princess_tiara') {
      // Tóc búi Công Chúa + Vương miện ngọc
      ctx.fillStyle = '#1e1b18';
      ctx.beginPath();
      ctx.arc(0, headY, 9 * s, 0, Math.PI * 2);
      ctx.fill();
      // Vương miện vàng
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(-7 * s, headY - 7 * s);
      ctx.lineTo(-4 * s, headY - 13 * s);
      ctx.lineTo(0, headY - 9 * s);
      ctx.lineTo(4 * s, headY - 13 * s);
      ctx.lineTo(7 * s, headY - 7 * s);
      ctx.closePath();
      ctx.fill();
    } else if (pal.head === 'monk_shaved' || pal.head === 'monk_halo') {
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-7 * s, headY - 5 * s);
      ctx.quadraticCurveTo(-12 * s, headY - 11 * s, -8 * s, headY - 13 * s);
      ctx.moveTo(7 * s, headY - 5 * s);
      ctx.quadraticCurveTo(12 * s, headY - 11 * s, 8 * s, headY - 13 * s);
      ctx.stroke();
      // 2 tai bò ngang
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(-10.5 * s, headY - 2 * s, 4 * s, 2.2 * s, -0.2, 0, Math.PI * 2);
      ctx.ellipse(10.5 * s, headY - 2 * s, 4 * s, 2.2 * s, 0.2, 0, Math.PI * 2);
      ctx.fill();
      // Đầu trắng đốm đen
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, headY, 9 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(-3.5 * s, headY - 2 * s, 3.8 * s, 0, Math.PI * 2);
      ctx.fill();
    } else if (pal.head === 'chicken_comb') {
      // Đầu Gà Vàng + Mào Đỏ 3 chóp nổi bật trên đỉnh đầu
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(0, headY, 8.8 * s, 0, Math.PI * 2);
      ctx.fill();
      // Mào gà đỏ 3 đỉnh
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-3.2 * s, headY - 8.5 * s, 2.8 * s, 0, Math.PI * 2);
      ctx.arc(0, headY - 10.2 * s, 3.3 * s, 0, Math.PI * 2);
      ctx.arc(3.2 * s, headY - 8.5 * s, 2.8 * s, 0, Math.PI * 2);
      ctx.fill();
    } else if (pal.head === 'monk_shaved' || pal.head === 'monk_halo') {
      // Đầu tròn cạo nhẵn của Sư Thầy / Sư Cô / Cao Tăng
      const headGrad = ctx.createRadialGradient(-2 * s, headY - 3 * s, 1 * s, 0, headY, 9.5 * s);
      headGrad.addColorStop(0, '#f3c6a0');
      headGrad.addColorStop(1, '#c68b59');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.arc(0, headY, 9 * s, 0, Math.PI * 2);
      ctx.fill();
    } else if (pal.head === 'novice_topknot') {
      // Chú Tiểu có chỏm tóc nhỏ trên đỉnh đầu
      ctx.fillStyle = '#e8b892';
      ctx.beginPath();
      ctx.arc(0, headY, 8.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a202c';
      ctx.beginPath();
      ctx.arc(0, headY - 8.2 * s, 3.3 * s, 0, Math.PI * 2);
      ctx.fill();
    } else if (pal.head === 'female_bun' || pal.head === 'female_lotus') {
      // Cư sĩ Nữ tóc đen búi cao kèm trâm hoa sen
      ctx.fillStyle = '#1e1b18';
      ctx.beginPath();
      ctx.arc(0, headY, 9 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, headY - 5.5 * s, 5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.head === 'female_lotus' ? '#f472b6' : '#f6e05e';
      ctx.beginPath();
      ctx.arc(4 * s, headY - 6 * s, 2.2 * s, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Cư sĩ Nam tóc đen gọn gàng (hoặc kim quan cho Thí Chủ Hoàng Kim)
      ctx.fillStyle = '#1f242d';
      ctx.beginPath();
      ctx.arc(0, headY, 9 * s, 0, Math.PI * 2);
      ctx.fill();
      if (pal.head === 'male_crown') {
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, headY - 7.5 * s, 3.8 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.templeScene = new TempleSceneRenderer();
});
