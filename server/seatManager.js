/**
 * Quản lý trạng thái Phòng Thiền (Mở rộng Động 24 -> 36 -> 48 -> 64 -> 100 Bồ Đoàn),
 * Chống trùng lặp chỗ ngồi 100%, Nhận diện 8 Skin Nhân Vật (bất chấp bảng mã Unicode),
 * 5 Giao Diện Chùa, 6 Chế độ Nhạc Nền, Bảng Công Đức và Cấu hình Giọng Đọc Kinh.
 */

const CHARACTER_SKINS = {
  nam: {
    id: 'nam',
    name: 'Cư Sĩ Nam (Áo Tràng Xám)',
    keywords: ['nam', 'trai', 'ao trang', 'cu si nam', 'cu si', 'phat tu nam'],
    robeColor: '#7b8794',
    innerColor: '#e2e8f0',
    headStyle: 'male_bun',
    auraColor: '#f6e05e'
  },
  nu: {
    id: 'nu',
    name: 'Cư Sĩ Nữ (Áo Lam Trắng)',
    keywords: ['nu', 'gai', 'ao lam', 'cu si nu', 'phat tu nu'],
    robeColor: '#edf2f7',
    innerColor: '#cbd5e0',
    headStyle: 'female_lotus_bun',
    auraColor: '#fbb6ce'
  },
  su: {
    id: 'su',
    name: 'Sư Thầy (Y Cà Sa Vàng)',
    keywords: ['su', 'thay', 'su thay', 'thay chua', 'chua', 'ty kheo'],
    robeColor: '#d69e2e',
    innerColor: '#975a16',
    headStyle: 'monk_shaved',
    auraColor: '#fbd38d'
  },
  tieusu: {
    id: 'tieusu',
    name: 'Chú Tiểu (Áo Nâu Lam)',
    keywords: ['tieu', 'chu tieu', 'tieusu', 'sa di'],
    robeColor: '#b7791f',
    innerColor: '#ecc94b',
    headStyle: 'novice_topknot',
    auraColor: '#fefcbf'
  },
  nicogiao: {
    id: 'nicogiao',
    name: 'Sư Cô / Ni Cô (Áo Lam Vàng)',
    keywords: ['ni', 'ni co', 'su co', 'ni su'],
    robeColor: '#c09b52',
    innerColor: '#e2e8f0',
    headStyle: 'monk_shaved',
    auraColor: '#f6ad55'
  },
  caotang: {
    id: 'caotang',
    name: 'Cao Tăng (Cà Sa Đỏ Tổ)',
    keywords: ['cao tang', 'caotang', 'hoa thuong', 'tru tri', 'ca sa', 'dai su', 'phuong truong'],
    robeColor: '#c53030',
    innerColor: '#ecc94b',
    headStyle: 'monk_halo',
    auraColor: '#ffd700'
  },
  phattu_sen: {
    id: 'phattu_sen',
    name: 'Phật Tử Áo Sen Hồng',
    keywords: ['sen', 'ao sen', 'hong', 'lien hoa'],
    robeColor: '#f687b3',
    innerColor: '#fff5f7',
    headStyle: 'female_lotus_bun',
    auraColor: '#fed7e2'
  },
  phattu_vang: {
    id: 'phattu_vang',
    name: 'Thí Chủ Hoàng Kim (Công Đức)',
    keywords: ['vang', 'hoang kim', 'cong duc', 'vip', 'thi chu'],
    robeColor: '#ecc94b',
    innerColor: '#ffffff',
    headStyle: 'male_crown_bun',
    auraColor: '#ffd700'
  },
  canhsat: {
    id: 'canhsat',
    name: 'Cảnh Sát / Công An',
    keywords: ['canh sat', 'canhsat', 'cong an', 'congan', 'cs', 'police', 'sir'],
    robeColor: '#2f5e3d',
    innerColor: '#eab308',
    headStyle: 'police_cap',
    auraColor: '#60a5fa'
  },
  bacsi: {
    id: 'bacsi',
    name: 'Bác Sĩ Lương Y (Áo Blouse)',
    keywords: ['bac si', 'bac sy', 'bacsi', 'bacsy', 'bs', 'y ta', 'yta', 'doctor', 'luong y'],
    robeColor: '#f8fafc',
    innerColor: '#ef4444',
    headStyle: 'doctor_cap',
    auraColor: '#38bdf8'
  },
  trom: {
    id: 'trom',
    name: 'Đạo Chích Hoàn Lương (Trộm)',
    keywords: ['trom', 'an trom', 'antrom', 'dao chich', 'daochich', 'ke trom', 'cuop', 'thief'],
    robeColor: '#1e293b',
    innerColor: '#f1f5f9',
    headStyle: 'thief_beanie',
    auraColor: '#94a3b8'
  },
  heo: {
    id: 'heo',
    name: 'Heo Hồng (Trư Bát Giới)',
    keywords: ['heo', 'lon', 'con heo', 'con lon', 'bat gioi', 'tru bat gioi', 'pig', 'un in'],
    robeColor: '#f472b6',
    innerColor: '#fbcfe8',
    headStyle: 'pig_ears',
    auraColor: '#f9a8d4'
  },
  bo: {
    id: 'bo',
    name: 'Bò Sữa Ngồi Thiền',
    keywords: ['bo', 'con bo', 'bo sua', 'trau', 'con trau', 'nguu', 'cow'],
    robeColor: '#f8fafc',
    innerColor: '#1e293b',
    headStyle: 'cow_horns',
    auraColor: '#fde047'
  },
  ga: {
    id: 'ga',
    name: 'Gà Vàng Chăm Chỉ',
    keywords: ['ga', 'con ga', 'ga trong', 'ga con', 'ga mai', 'chicken', 'cuc tac'],
    robeColor: '#facc15',
    innerColor: '#ef4444',
    headStyle: 'chicken_comb',
    auraColor: '#fef08a'
  },
  hocsinh: {
    id: 'hocsinh',
    name: 'Học Sinh Chăm Ngoan (Khăn Quàng Đỏ)',
    keywords: ['hoc sinh', 'hocsinh', 'hs', 'hoc tro', 'dong phuc', 'khan quang', 'di hoc'],
    robeColor: '#f8fafc',
    innerColor: '#dc2626',
    headStyle: 'student_scarf',
    auraColor: '#38bdf8'
  },
  duccha: {
    id: 'duccha',
    name: 'Đức Cha / Linh Mục (Áo Chùng Đen)',
    keywords: ['duc cha', 'duccha', 'cha', 'linh muc', 'linhmuc', 'cha xu', 'pastor', 'priest'],
    robeColor: '#0f172a',
    innerColor: '#ffffff',
    headStyle: 'priest_collar',
    auraColor: '#cbd5e1'
  },
  thantai: {
    id: 'thantai',
    name: 'Thần Tài Triệu Phú (Cầu May Mắn)',
    keywords: ['than tai', 'thantai', 'phat tai', 'tai loc', 'may man', 'trieu phu', 'giau to'],
    robeColor: '#dc2626',
    innerColor: '#facc15',
    headStyle: 'god_of_wealth',
    auraColor: '#ffd700'
  },
  ninja: {
    id: 'ninja',
    name: 'Ninja Nhẫn Giả (Tĩnh Tâm)',
    keywords: ['ninja', 'nhan gia', 'shinobi', 'sat thu', 'kiem khach'],
    robeColor: '#1e1b4b',
    innerColor: '#4338ca',
    headStyle: 'ninja_mask',
    auraColor: '#818cf8'
  },
  congchua: {
    id: 'congchua',
    name: 'Tiểu Công Chúa (Váy Dạ Hội)',
    keywords: ['cong chua', 'congchua', 'princess', 'nang tho', 'tieu thu'],
    robeColor: '#f472b6',
    innerColor: '#ec4899',
    headStyle: 'princess_tiara',
    auraColor: '#f43f5e'
  }
};

const TEMPLE_THEMES = {
  1: {
    id: 1,
    name: 'Mẫu 1: Chánh Điện Cổ Tự Truyền Thống',
    title: 'THIỀN ĐƯỜNG TỊNH TÂM',
    subtitle: 'Nam Mô A Di Đà Phật',
    bgImage: '/assets/themes/theme_1_bg.jpg',
    fallbackImage: '/assets/mockups/mockup_1.jpg',
    cushionStyle: 'classic_round',
    particleType: 'incense_and_embers',
    ambientColor: '#ffcf75'
  },
  2: {
    id: 2,
    name: 'Mẫu 2: Liên Hoa Tiên Cảnh Đêm Trăng',
    title: 'LIÊN HOA TỊNH CẢNH',
    subtitle: 'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật',
    bgImage: '/assets/themes/theme_2_bg.jpg',
    fallbackImage: '/assets/mockups/mockup_2.jpg',
    cushionStyle: 'glowing_lotus',
    particleType: 'sky_lanterns_and_fireflies',
    ambientColor: '#7fd8ff'
  },
  3: {
    id: 3,
    name: 'Mẫu 3: Tây Phương Cực Lạc Lưu Ly',
    title: 'TÂY PHƯƠNG CỰC LẠC',
    subtitle: 'Nam Mô A Di Đà Phật',
    bgImage: '/assets/themes/theme_3_bg.jpg',
    fallbackImage: '/assets/mockups/mockup_3.jpg',
    cushionStyle: 'royal_silk_gold',
    particleType: 'falling_gold_lotus',
    ambientColor: '#ffe07d'
  },
  4: {
    id: 4,
    name: 'Mẫu 4: Thiền Viện Trúc Lâm Thanh Tịnh',
    title: 'THIỀN VIỆN TRÚC LÂM',
    subtitle: 'Tĩnh Tâm Quán Chiếu · An Trú Hiện Tại',
    bgImage: '/assets/themes/theme_4_bg.jpg',
    fallbackImage: '/assets/mockups/mockup_4.jpg',
    cushionStyle: 'woven_straw',
    particleType: 'bamboo_leaves_and_sunbeams',
    ambientColor: '#d6e8b5'
  },
  5: {
    id: 5,
    name: 'Mẫu 5: Phong Cách 3D Chibi Trang Nghiêm',
    title: 'THIỀN ĐƯỜNG TỊNH TÂM',
    subtitle: 'Nam Mô A Di Đà Phật',
    bgImage: '/assets/themes/theme_5_bg.jpg',
    fallbackImage: '/assets/mockups/mockup_5.jpg',
    cushionStyle: 'chibi_plush',
    particleType: 'sparkles_and_incense',
    ambientColor: '#ffdf9e'
  }
};

const VOICE_PRESETS = {
  nam_tram_doc_kinh: {
    id: 'nam_tram_doc_kinh',
    name: 'Giọng Nam Trầm Ấm Đọc Kinh (Khuyên dùng)',
    voiceName: 'vi-VN-NamMinhNeural',
    pitchHz: -3,
    ratePercent: -6,
    reverbLevel: 0.16,
    warmthDb: 1.5,
    playbackRate: 0.94,
    mciSpeed: 940
  },
  lao_hoa_thuong: {
    id: 'lao_hoa_thuong',
    name: 'Giọng Lão Hòa Thượng Uy Nghiêm (Trầm Sâu)',
    voiceName: 'vi-VN-NamMinhNeural',
    pitchHz: -6,
    ratePercent: -12,
    reverbLevel: 0.20,
    warmthDb: 2.2,
    playbackRate: 0.88,
    mciSpeed: 880
  },
  thay_phap_thoai: {
    id: 'thay_phap_thoai',
    name: 'Giọng Thầy Trẻ Ấm Áp Pháp Thoại',
    voiceName: 'vi-VN-NamMinhNeural',
    pitchHz: -1,
    ratePercent: -4,
    reverbLevel: 0.14,
    warmthDb: 1.0,
    playbackRate: 0.96,
    mciSpeed: 960
  },
  su_co_thanh_tinh: {
    id: 'su_co_thanh_tinh',
    name: 'Giọng Sư Cô Thanh Tịnh Dịu Hiền (Nữ)',
    voiceName: 'vi-VN-HoaiMyNeural',
    pitchHz: -1,
    ratePercent: -4,
    reverbLevel: 0.16,
    warmthDb: 1.0,
    playbackRate: 0.96,
    mciSpeed: 960
  },
  // Tương thích các mã preset từ Web Admin
  nam_nhuanduc: {
    id: 'nam_nhuanduc',
    name: 'Nam Âm Trầm (Thích Nhuận Đức)',
    voiceName: 'vi-VN-NamMinhNeural',
    pitchHz: -3,
    ratePercent: -6,
    reverbLevel: 0.16,
    warmthDb: 1.5,
    playbackRate: 0.94,
    mciSpeed: 940
  },
  nam_trungnien: {
    id: 'nam_trungnien',
    name: 'Nam Trung Niên Trang Nghiêm (Minh Tuệ)',
    voiceName: 'vi-VN-NamMinhNeural',
    pitchHz: -2,
    ratePercent: -5,
    reverbLevel: 0.15,
    warmthDb: 1.2,
    playbackRate: 0.95,
    mciSpeed: 950
  },
  nu_diudang: {
    id: 'nu_diudang',
    name: 'Nữ Dịu Dàng Truyền Cảm (Thảo Vy)',
    voiceName: 'vi-VN-HoaiMyNeural',
    pitchHz: -2,
    ratePercent: -5,
    reverbLevel: 0.24,
    warmthDb: 1.5,
    playbackRate: 0.95,
    mciSpeed: 950
  },
  chuong_tinh_tam: {
    id: 'chuong_tinh_tam',
    name: 'Chuông Mõ Tĩnh Tâm',
    voiceName: 'vi-VN-HoaiMyNeural',
    pitchHz: -2,
    ratePercent: -5,
    reverbLevel: 0.24,
    warmthDb: 1.5,
    playbackRate: 0.95,
    mciSpeed: 950
  }
};

const BG_MUSIC_TRACKS = {
  zen_pentatonic_432: {
    id: 'zen_pentatonic_432',
    name: '1. Nhạc Thiền Tĩnh Tâm 432Hz (Chuông Xoay & Ngũ Cung)'
  },
  omitofo_chant_pad: {
    id: 'omitofo_chant_pad',
    name: '2. Giai Điệu Niệm Phật A Di Đà (Đàn Tranh & Pháp Khí)'
  },
  guzheng_lotus_pond: {
    id: 'guzheng_lotus_pond',
    name: '3. Cổ Tranh Liên Hoa Đêm Trăng (Đàn Tranh & Tiêu Trúc)'
  },
  singing_bowl_meditation: {
    id: 'singing_bowl_meditation',
    name: '4. Chuông Xoay Tây Tạng & Suối Thiền Rừng Trúc'
  },
  temple_night_ambience: {
    id: 'temple_night_ambience',
    name: '5. Tĩnh Lặng Chùa Đêm & Chuông Gió Hiên Chùa'
  },
  custom_mp3: {
    id: 'custom_mp3',
    name: '6. Nhạc MP3 Tự Chọn Từ Máy Tính (Custom MP3)'
  }
};

const GRID_TIERS = {
  24: { total: 24, cols: 4, rows: 6 },
  36: { total: 36, cols: 6, rows: 6 },
  48: { total: 48, cols: 6, rows: 8 },
  64: { total: 64, cols: 8, rows: 8 },
  100: { total: 100, cols: 10, rows: 10 }
};

const SCRIPTURE_CHANTS = [
  'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật... Nguyện đem công đức này, trang nghiêm Phật Tịnh Độ, trên đền bốn ơn nặng, dưới cứu khổ tam đồ.',
  'Nam Mô A Di Đà Phật... Tâm dẫn đầu các pháp, tâm làm chủ, tâm tạo. Nếu nói hay hành động, với tâm niệm thanh tịnh, an lạc sẽ theo ta, như bóng không rời hình.',
  'Nam Mô Đại Từ Đại Bi Quán Thế Âm Bồ Tát... Nguyện cầu cho toàn thể chư vị Phật tử đang tĩnh tọa tại Thiền Đường Tịnh Tâm thân tâm thường an lạc, gia đạo bình an, vạn sự cát tường.',
  'Nam Mô A Di Đà Phật... Hơi thở vào tâm tĩnh lặng, hơi thở ra miệng mỉm cười. An trú trong hiện tại, giây phút đẹp tuyệt vời.',
  'Nam Mô Dược Sư Lưu Ly Quang Vương Phật... Nguyện ánh sáng từ bi soi chiếu muôn loài, tiêu trừ nghiệp chướng, tật bệnh tiêu tan, phước huệ trang nghiêm.'
];

const SAMPLE_FIRST_NAMES = ['Thanh', 'Minh', 'An', 'Quang', 'Hoàng', 'Bảo', 'Diệu', 'Tuệ', 'Thu', 'Ngọc', 'Đức', 'Hải', 'Mai', 'Phương', 'Trung', 'Thiện', 'Tịnh', 'Phúc', 'Tâm', 'Huyền'];
const SAMPLE_LAST_NAMES = ['Hương', 'Tâm', 'Nhiên', 'Huy', 'Nam', 'Ngọc', 'Linh', 'Minh', 'Hà', 'Lan', 'Anh', 'Đăng', 'Thảo', 'Kiên', 'Đức', 'Phúc', 'Giác', 'Lạc', 'Bình', 'Châu'];

/**
 * Chuẩn hóa chuỗi Tiếng Việt về không dấu để bắt từ khóa (nam, nữ, sư, tiểu, ni, cao tăng...)
 * chính xác 100% trên mọi bàn phím điện thoại iOS/Android (NFC & NFD).
 */
function stripVietnameseAccents(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUserKey(str) {
  if (!str) return '';
  return String(str).normalize('NFC').toLowerCase().trim();
}

const DEFAULT_UI_LAYOUT = {
  thien_duong_pos_tophud: { left: 4.5, top: 7.2, scale: 1.0 },
  thien_duong_pos_guide: { left: 2.3, top: 25.5, scale: 1.0 },
  thien_duong_pos_merit: { left: 70.2, top: 25.5, scale: 1.0 },
  thien_duong_pos_monk_1: { left: 28, top: 55, scale: 1.0 },
  thien_duong_pos_monk_2: { left: 50, top: 54, scale: 1.0 },
  thien_duong_pos_monk_3: { left: 72, top: 55, scale: 1.0 }
};

const RANDOM_GIFT_THANK_TEMPLATES = [
  'Xin cảm tạ tín chủ {name} đã phát tâm cúng dường, kính chúc tín chủ thân tâm an lạc, vạn sự cát tường.',
  'Cảm tạ thiện duyên của tín chủ {name}, nguyện cầu tín chủ luôn bình an, phúc lành tăng trưởng.',
  'Xin tri ân tấm lòng của tín chủ {name}. Nguyện Đức Phật từ bi gia hộ cho tín chủ và gia đình được bình an, mạnh khỏe.',
  'Kính chúc tín chủ {name} phúc tuệ song tu, gia đạo an khang, mọi sự hanh thông.',
  'Xin cảm niệm thiện tâm của tín chủ {name}, nguyện cầu cuộc sống luôn an vui, tâm hồn thanh tịnh, gia đình hạnh phúc.',
  'Nguyện chúc tín chủ {name} gieo duyên lành, gặt quả thiện, phúc báu ngày càng tăng trưởng.',
  'Xin cảm tạ thiện duyên của quý Phật tử {name}, kính chúc quý vị thân khỏe tâm an, gia đình hòa thuận.',
  'Kính chúc tín chủ {name} luôn gặp điều lành, tránh điều dữ, cuộc sống bình an, thuận duyên như ý.',
  'Xin tri ân tấm lòng thiện lành của tín chủ {name}. Nguyện cầu ánh sáng từ bi soi đường, dẫn lối cho tín chủ trên đường đời.',
  'Kính chúc tín chủ {name} phước lành viên mãn, tâm an trí sáng, gia đình hưng thịnh.'
];

class SeatManager {
  constructor() {
    this.currentThemeId = 1;
    this.sessionStartTime = Date.now();
    this.slotMode = 'auto';
    this.currentTier = GRID_TIERS[24];
    this.seats = [];
    this.rebuildSeatGrid(24, false);
    this.lastGiftTemplateIdx = -1;
    this.giftSpeechCooldowns = new Map(); // Lưu timestamp lần đọc cảm ơn gần nhất của mỗi người (Cooldown 10s)

    this.meritList = [];
    this.voiceConfig = {
      ...VOICE_PRESETS.nam_tram_doc_kinh,
      woodenFishEnabled: true,
      woodenFishBpm: 46,
      bellEnabled: true,
      bgMusicEnabled: true,
      bgMusicTrack: 'zen_pentatonic_432',
      customMp3Url: '',
      bgMusicVolume: 0.38,
      autoChantEnabled: false,
      autoChantIntervalSec: 120,
      giftThankTemplates: [...RANDOM_GIFT_THANK_TEMPLATES],
      meritTemplate1Coin: 'Xin cảm tạ tín chủ {name} đã phát tâm cúng dường, kính chúc tín chủ thân tâm an lạc, vạn sự cát tường.',
      meritTemplate: 'Nam Mô A Di Đà Phật. Xin thành tâm hồi hướng công đức cho tín chủ {name} đã phát tâm cúng dường {gift}. Nguyện cầu cho thí chủ cùng gia quyến thân tâm an lạc, sở cầu như ý.'
    };
    this.hudConfig = {
      guidePosition: 'top_left',
      guidePosX: 2.3,
      guidePosY: 10.5,
      guideOffsetX: 0,
      guideOffsetY: 0,
      guideOpacity: 0.92,
      guideScale: 0.95,
      guideCollapsed: false,
      carouselSpeedSec: 6
    };
    this.textConfig = {
      bannerTitle: '',
      bannerSubtitle: '',
      monkLeft: 'Thầy Minh Đạo',
      monkCenter: 'Sư Trụ Trì',
      monkRight: 'Thầy Tâm Từ',
      guideTitle: 'HƯỚNG DẪN',
      guideLine1: 'Bình luận bất kỳ để vào thiền',
      guideLine2: 'Gõ adidaphat lên cắm nhang',
      guideLine3: 'Tặng quà được xướng tên',
      guideLine4: '✦ Hồi Hướng Công Đức ✦',
      meritTitle: '✦ Công Đức ✦'
    };
    this.chantIndex = 0;
    this.uiLayout = JSON.parse(JSON.stringify(DEFAULT_UI_LAYOUT));
  }

  rebuildSeatGrid(targetTotal, preserveUsers = true) {
    const tier = GRID_TIERS[targetTotal] || GRID_TIERS[24];
    this.currentTier = tier;

    // Lọc danh sách người dùng duy nhất (chống trùng lặp 100%)
    const seenKeys = new Set();
    const existingUsers = [];
    if (preserveUsers) {
      for (const s of this.seats) {
        if (s.occupied && s.user) {
          const uKey = normalizeUserKey(s.user.uniqueId) || normalizeUserKey(s.user.nickname);
          const nKey = normalizeUserKey(s.user.nickname);
          if (!seenKeys.has(uKey) && !seenKeys.has(nKey)) {
            seenKeys.add(uKey);
            if (nKey) seenKeys.add(nKey);
            existingUsers.push(s.user);
          }
        }
      }
    }

    this.seats = Array.from({ length: tier.total }, (_, index) => {
      const user = existingUsers[index] || null;
      return {
        index,
        row: Math.floor(index / tier.cols),
        col: index % tier.cols,
        occupied: Boolean(user),
        user
      };
    });
  }

  setSlotMode(mode) {
    this.slotMode = String(mode || 'auto');
    if (this.slotMode === 'auto') {
      const occ = this.seats.filter(s => s.occupied).length;
      const needed = this.pickAutoTierCount(occ);
      this.rebuildSeatGrid(needed, true);
    } else {
      const fixedTotal = Number(this.slotMode) || 24;
      this.rebuildSeatGrid(fixedTotal, true);
    }
    return this.getState();
  }

  pickAutoTierCount(occupiedCount) {
    if (occupiedCount <= 24) return 24;
    if (occupiedCount <= 36) return 36;
    if (occupiedCount <= 48) return 48;
    if (occupiedCount <= 64) return 64;
    return 100;
  }

  ensureCapacityForNewSeat() {
    if (this.slotMode !== 'auto') return;
    const occupiedCount = this.seats.filter(s => s.occupied).length;
    if (occupiedCount >= this.currentTier.total && this.currentTier.total < 100) {
      const nextTier = this.pickAutoTierCount(occupiedCount + 1);
      if (nextTier > this.currentTier.total) {
        this.rebuildSeatGrid(nextTier, true);
      }
    }
  }

  /**
   * Nhận diện Skin từ nội dung bình luận (Hỗ trợ cả có dấu, không dấu, viết hoa, iOS NFD,
   * kèm bộ lọc chống nhầm "Bồ Tát" / "bố mẹ" với từ khóa "bò")
   */
  detectSkinFromText(text, currentSkin = null) {
    if (!text) return currentSkin || 'nam';
    const rawNfc = String(text).normalize('NFC').toLowerCase();
    const stripped = stripVietnameseAccents(text);
    if (!stripped) return currentSkin || 'nam';

    // Nếu người dùng gõ chính xác "bò" có dấu huyền -> Nhận diện ngay skin Bò
    if (/(?:^|[\s,.;:!?])bò(?=$|[\s,.;:!?])/i.test(rawNfc)) {
      return 'bo';
    }

    // Loại bỏ các cụm từ Phật giáo/gia đình ("bồ tát", "bồ đề", "bồ đoàn", "bố mẹ", "bố già")
    // để không bao giờ nhận nhầm chữ "bồ"/"bố" không dấu thành "bò"
    const sanitizedForKeyword = ` ${stripped} `
      .replace(/\s(bo tat|bo de|bo doan|bo me|bo gia|tam bo)\s/g, ' ')
      .replace(/\s+/g, ' ');

    const order = [
      'hocsinh',
      'duccha',
      'thantai',
      'ninja',
      'congchua',
      'canhsat',
      'bacsi',
      'trom',
      'heo',
      'bo',
      'ga',
      'caotang',
      'tieusu',
      'nicogiao',
      'phattu_vang',
      'phattu_sen',
      'su',
      'nu',
      'nam'
    ];

    for (const skinKey of order) {
      const skin = CHARACTER_SKINS[skinKey];
      for (const kw of skin.keywords) {
        if (stripped === kw || sanitizedForKeyword.includes(` ${kw} `)) {
          return skinKey;
        }
      }
    }
    return currentSkin || (Math.random() > 0.45 ? 'nu' : 'nam');
  }

  /**
   * Nhận diện bình luận cắm nhang (dâng hương lên Đức Phật khi gõ "adidaphat" / "a di đà phật")
   */
  isIncenseOfferingComment(text) {
    if (!text) return false;
    const stripped = stripVietnameseAccents(text);
    return /(adidaphat|a di da phat|di da phat|nam mo a di da|cam nhang|thap huong|dang huong|le phat|lay phat|cung phat)/i.test(stripped);
  }

  /**
   * Tìm ghế hiện tại của người dùng theo cả uniqueId VÀ nickname,
   * đồng thời tự động dọn sạch các ghế bị trùng tên (nếu có) để mỗi người chỉ ngồi đúng 1 bồ đoàn!
   */
  findAndDeduplicateUserSeat(cleanId, displayName) {
    const idNorm = normalizeUserKey(cleanId);
    const nameNorm = normalizeUserKey(displayName);

    const matchedSeats = this.seats.filter(s => {
      if (!s.occupied || !s.user) return false;
      const sId = normalizeUserKey(s.user.uniqueId);
      const sName = normalizeUserKey(s.user.nickname);
      return (idNorm && sId === idNorm) || (nameNorm && sName === nameNorm);
    });

    if (matchedSeats.length === 0) return null;

    // Giữ lại ghế đầu tiên, xóa toàn bộ các ghế bị nhân bản phía sau
    const primarySeat = matchedSeats[0];
    for (let i = 1; i < matchedSeats.length; i++) {
      matchedSeats[i].occupied = false;
      matchedSeats[i].user = null;
    }

    return primarySeat;
  }

  findFirstEmptySeat() {
    return this.seats.find(s => !s.occupied);
  }

  handleComment({ uniqueId, nickname, comment, avatarUrl }) {
    const displayName = String(nickname || uniqueId || 'Phật Tử').normalize('NFC').trim();
    const cleanId = normalizeUserKey(uniqueId || displayName);
    const text = String(comment || '').normalize('NFC').trim();
    const isIncense = this.isIncenseOfferingComment(text);

    // 1. Kiểm tra nếu người này đã có bồ đoàn -> Cập nhật đúng vị trí đó, tuyệt đối không tạo thêm ghế mới!
    let existingSeat = this.findAndDeduplicateUserSeat(cleanId, displayName);
    if (existingSeat) {
      const newSkin = this.detectSkinFromText(text, existingSeat.user.skin);
      const skinChanged = newSkin !== existingSeat.user.skin;
      existingSeat.user.uniqueId = cleanId;
      existingSeat.user.nickname = displayName;
      existingSeat.user.skin = newSkin;
      existingSeat.user.lastActive = Date.now();
      if (isIncense) {
        existingSeat.user.lastIncenseAt = Date.now();
      }
      existingSeat.user.prayerText = text.length > 0 ? text.slice(0, 48) : 'Nam Mô A Di Đà Phật 🙏';

      return {
        action: isIncense ? 'offer_incense' : (skinChanged ? 'change_skin' : 'prayer'),
        seatIndex: existingSeat.index,
        seat: existingSeat,
        skinInfo: CHARACTER_SKINS[newSkin],
        isIncenseOffering: isIncense,
        incenseText: isIncense ? (text || 'Nam Mô A Di Đà Phật') : ''
      };
    }

    // 2. Người mới vào thiền -> Mở rộng lưới nếu cần và xếp vào 1 bồ đoàn trống
    this.ensureCapacityForNewSeat();

    let targetSeat = this.findFirstEmptySeat();
    let isReplaced = false;
    let replacedUser = null;

    if (!targetSeat) {
      // Trường hợp phòng thiền đã kín chỗ -> Người đã ngồi lâu nhất (joinedAt nhỏ nhất) sẽ nhường chỗ, ra ngoài sớm hơn!
      const candidates = this.seats
        .filter(s => s.occupied && s.user)
        .sort((a, b) => {
          const aTime = a.user.joinedAt || a.user.lastActive || 0;
          const bTime = b.user.joinedAt || b.user.lastActive || 0;
          return aTime - bTime; // Người ngồi lâu nhất lên đầu danh sách để nhường chỗ
        });

      if (candidates.length > 0) {
        targetSeat = candidates[0];
        replacedUser = { ...targetSeat.user };
        isReplaced = true;
      } else {
        targetSeat = this.seats[0];
      }
    }

    const chosenSkin = this.detectSkinFromText(text, null);
    targetSeat.occupied = true;
    targetSeat.user = {
      uniqueId: cleanId,
      nickname: displayName,
      skin: chosenSkin,
      joinedAt: Date.now(),
      lastActive: Date.now(),
      lastIncenseAt: isIncense ? Date.now() : 0,
      meritPoints: 0,
      hasMeritAura: chosenSkin === 'caotang' || chosenSkin === 'phattu_vang',
      prayerText: text.length > 0 ? text.slice(0, 48) : 'Nam Mô A Di Đà Phật 🙏',
      avatarUrl: avatarUrl || ''
    };

    return {
      action: isReplaced ? 'replace_seat' : (isIncense ? 'offer_incense' : 'join_seat'),
      seatIndex: targetSeat.index,
      seat: targetSeat,
      skinInfo: CHARACTER_SKINS[chosenSkin],
      isIncenseOffering: isIncense,
      incenseText: isIncense ? (text || 'Nam Mô A Di Đà Phật') : '',
      isReplaced,
      replacedUser
    };
  }

  getRandomGiftTemplate() {
    const list = (Array.isArray(this.voiceConfig.giftThankTemplates) && this.voiceConfig.giftThankTemplates.length > 0)
      ? this.voiceConfig.giftThankTemplates
      : RANDOM_GIFT_THANK_TEMPLATES;

    if (list.length === 1) return list[0];
    let idx = Math.floor(Math.random() * list.length);
    if (idx === this.lastGiftTemplateIdx && list.length > 1) {
      idx = (idx + 1) % list.length;
    }
    this.lastGiftTemplateIdx = idx;
    return list[idx];
  }

  handleGift({ uniqueId, nickname, giftName = 'Hoa Sen Vàng', diamondCount = 1, repeatCount = 1 }) {
    const displayName = String(nickname || uniqueId || 'Thí Chủ').normalize('NFC').trim();
    const cleanId = normalizeUserKey(uniqueId || displayName);
    const points = Math.max(1, Number(diamondCount || 1) * Number(repeatCount || 1));

    let seat = this.findAndDeduplicateUserSeat(cleanId, displayName);
    if (!seat) {
      const joinRes = this.handleComment({
        uniqueId: cleanId,
        nickname: displayName,
        comment: 'Cúng dường Tam Bảo 🙏'
      });
      seat = joinRes.seat;
    }

    seat.user.meritPoints = (seat.user.meritPoints || 0) + points;
    seat.user.lastActive = Date.now();
    seat.user.hasMeritAura = true;
    seat.user.lastGiftAt = Date.now();
    seat.user.lastGiftName = giftName;
    seat.user.lastGiftPoints = points;
    if (points >= 5) {
      seat.user.skin = 'phattu_vang';
    }

    const existingMerit = this.meritList.find(
      m => normalizeUserKey(m.uniqueId) === cleanId || normalizeUserKey(m.nickname) === normalizeUserKey(displayName)
    );
    if (existingMerit) {
      existingMerit.points += points;
      existingMerit.lastGift = giftName;
      existingMerit.updatedAt = Date.now();
    } else {
      this.meritList.push({
        uniqueId: cleanId,
        nickname: displayName,
        points,
        lastGift: giftName,
        updatedAt: Date.now()
      });
    }

    this.meritList.sort((a, b) => b.points - a.points || b.updatedAt - a.updatedAt);
    this.meritList = this.meritList.slice(0, 12);

    // KIỂM TRA COOLDOWN 10 GIÂY MỖI NGƯỜI:
    // Một người tặng liên tiếp hoặc tặng nhiều món cùng lúc thì CHỈ ĐỌC TÊN 1 LẦN DUY NHẤT.
    // Sau 10 giây mới tính lượt đọc tiếp theo!
    const now = Date.now();
    const COOLDOWN_MS = 10000;
    const lastSpoken = this.giftSpeechCooldowns.get(cleanId) || 0;
    const isWithinCooldown = (now - lastSpoken < COOLDOWN_MS);

    // Luôn chọn ngẫu nhiên câu cảm ơn chúc phúc để log và hiển thị thông báo
    const template = this.getRandomGiftTemplate();
    const chantText = template
      .replace(/\{name\}/g, displayName)
      .replace(/\{gift\}/g, giftName);

    let shouldSpeak = false;
    if (!isWithinCooldown) {
      shouldSpeak = true;
      this.giftSpeechCooldowns.set(cleanId, now);
    } else {
      shouldSpeak = false;
    }

    return {
      action: 'gift_merit',
      seatIndex: seat.index,
      seat,
      donorName: displayName,
      giftName,
      points,
      chantText,
      shouldSpeak,
      cooldownRemainingMs: Math.max(0, COOLDOWN_MS - (now - lastSpoken))
    };
  }

  fillSampleSeats(count = 15) {
    const targetCount = Math.max(1, Math.min(100, Number(count) || 15));
    const neededTier = this.slotMode === 'auto'
      ? this.pickAutoTierCount(targetCount)
      : Math.max(this.currentTier.total, this.pickAutoTierCount(targetCount));

    this.rebuildSeatGrid(neededTier, false);

    const base15 = [
      { nickname: 'Thanh Hương', skin: 'su' },
      { nickname: 'Minh Tâm', skin: 'nu' },
      { nickname: 'An Nhiên', skin: 'nu' },
      { nickname: 'Quang Huy', skin: 'nam' },
      { nickname: 'Hoàng Nam', skin: 'nu' },
      { nickname: 'Bảo Ngọc', skin: 'su' },
      { nickname: 'Diệu Linh', skin: 'nu' },
      { nickname: 'Tuệ Minh', skin: 'nam' },
      { nickname: 'Thu Hà', skin: 'nu' },
      { nickname: 'Ngọc Lan', skin: 'su' },
      { nickname: 'Đức Anh', skin: 'nam' },
      { nickname: 'Hải Đăng', skin: 'nam' },
      { nickname: 'Mai Anh', skin: 'nu' },
      { nickname: 'Phương Thảo', skin: 'nam' },
      { nickname: 'Trung Kiên', skin: 'nam' }
    ];

    const skinPool = ['nam', 'nu', 'su', 'tieusu', 'nicogiao', 'caotang', 'phattu_sen', 'phattu_vang'];

    for (let idx = 0; idx < targetCount && idx < this.seats.length; idx++) {
      let nickname;
      let skin;
      if (idx < base15.length) {
        nickname = base15[idx].nickname;
        skin = base15[idx].skin;
      } else {
        const fn = SAMPLE_FIRST_NAMES[idx % SAMPLE_FIRST_NAMES.length];
        const ln = SAMPLE_LAST_NAMES[(idx * 3 + 7) % SAMPLE_LAST_NAMES.length];
        nickname = `${fn} ${ln} ${idx + 1}`;
        skin = skinPool[idx % skinPool.length];
      }

      this.seats[idx].occupied = true;
      this.seats[idx].user = {
        uniqueId: normalizeUserKey(nickname),
        nickname,
        skin,
        joinedAt: Date.now() - idx * 3000,
        lastActive: Date.now() - 10000,
        meritPoints: skin === 'phattu_vang' ? 20 : 0,
        hasMeritAura: skin === 'phattu_vang' || skin === 'caotang',
        prayerText: 'Nam Mô A Di Đà Phật 🙏'
      };
    }
  }

  fillSample15Seats() {
    this.fillSampleSeats(15);
  }

  clearSeat(index) {
    if (this.seats[index]) {
      this.seats[index].occupied = false;
      this.seats[index].user = null;
    }
  }

  clearAllSeats() {
    if (this.slotMode === 'auto') {
      this.rebuildSeatGrid(24, false);
    } else {
      this.seats.forEach(s => {
        s.occupied = false;
        s.user = null;
      });
    }
  }

  /**
   * Tự động kiểm tra thiền sinh ngồi cố định đủ 10 phút để xả thiền rời phòng
   * (Trả về danh sách những người đã hoàn thành 10 phút)
   */
  checkExpiredSeats(maxDurationMs = 10 * 60 * 1000) {
    const now = Date.now();
    const expiredList = [];

    this.seats.forEach(seat => {
      if (seat.occupied && seat.user) {
        const joinedAt = seat.user.joinedAt || seat.user.lastActive || now;
        const elapsed = now - joinedAt;
        if (elapsed >= maxDurationMs) {
          const departingUser = { ...seat.user };
          seat.occupied = false;
          seat.user = null;
          expiredList.push({
            seatIndex: seat.index,
            user: departingUser,
            durationMin: Math.max(1, Math.round(elapsed / 60000))
          });
        }
      }
    });

    return expiredList;
  }

  /**
   * Reset toàn bộ Công Đức về ban đầu (Xóa Bảng Công Đức, đưa điểm về 0)
   */
  resetAllMerits() {
    this.meritList = [];
    this.giftSpeechCooldowns.clear();
    this.seats.forEach(s => {
      if (s.user) {
        s.user.meritPoints = 0;
        s.user.hasMeritAura = (s.user.skin === 'caotang');
        s.user.lastGiftAt = 0;
        s.user.lastGiftName = '';
        s.user.lastGiftPoints = 0;
        if (s.user.skin === 'phattu_vang') {
          s.user.skin = 'nam';
        }
      }
    });
    return this.getState();
  }

  /**
   * Reset toàn bộ phòng thiền (Cả giải phóng bồ đoàn + Reset công đức)
   */
  resetAllState() {
    this.resetAllMerits();
    this.clearAllSeats();
    return this.getState();
  }

  setTheme(themeId) {
    const id = Number(themeId);
    if (TEMPLE_THEMES[id]) {
      this.currentThemeId = id;
    }
    return TEMPLE_THEMES[this.currentThemeId];
  }

  updateVoiceConfig(partial = {}) {
    let resolvedVoiceName = partial.voiceName;
    const pId = String(partial.presetId || partial.id || '').toLowerCase();
    if (!resolvedVoiceName && pId) {
      if (pId.includes('nu') || pId.includes('su_co') || pId.includes('hoaimy')) {
        resolvedVoiceName = 'vi-VN-HoaiMyNeural';
      } else {
        resolvedVoiceName = 'vi-VN-NamMinhNeural';
      }
    }
    if (pId.includes('nu') || pId.includes('su_co') || pId.includes('hoaimy')) {
      resolvedVoiceName = 'vi-VN-HoaiMyNeural';
    } else if (pId.includes('nam') || pId.includes('lao') || pId.includes('thay')) {
      resolvedVoiceName = 'vi-VN-NamMinhNeural';
    }

    if (partial.presetId && VOICE_PRESETS[partial.presetId]) {
      const preset = VOICE_PRESETS[partial.presetId];
      this.voiceConfig = {
        ...this.voiceConfig,
        ...preset,
        ...partial,
        voiceName: resolvedVoiceName || partial.voiceName || preset.voiceName || 'vi-VN-NamMinhNeural'
      };
    } else {
      this.voiceConfig = {
        ...this.voiceConfig,
        ...partial,
        voiceName: resolvedVoiceName || partial.voiceName || this.voiceConfig.voiceName || 'vi-VN-NamMinhNeural'
      };
    }

    // Tự động tính toán DSP & Tốc độ phát lại theo Pitch (Hz) & Rate (%)
    if (this.voiceConfig.ratePercent !== undefined) {
      const rateVal = Number(this.voiceConfig.ratePercent) || 0;
      this.voiceConfig.playbackRate = Number((1.0 + rateVal / 100.0).toFixed(2));
      this.voiceConfig.mciSpeed = Math.round(1000 * this.voiceConfig.playbackRate);
    }
    if (this.voiceConfig.pitchHz !== undefined) {
      const pitchVal = Number(this.voiceConfig.pitchHz) || 0;
      this.voiceConfig.warmthDb = Number(Math.min(2.0, Math.max(0, -pitchVal * 0.25)).toFixed(2));
    }
    if (Array.isArray(partial.giftThankTemplates) && partial.giftThankTemplates.length > 0) {
      this.voiceConfig.giftThankTemplates = partial.giftThankTemplates;
    }

    return this.voiceConfig;
  }

  updateHudConfig(partial = {}) {
    this.hudConfig = {
      ...this.hudConfig,
      ...partial
    };
    return this.hudConfig;
  }

  updateTextConfig(partial = {}) {
    this.textConfig = {
      ...this.textConfig,
      ...partial
    };
    return this.textConfig;
  }

  resetTextConfig() {
    this.textConfig = {
      bannerTitle: '',
      bannerSubtitle: '',
      monkLeft: 'Thầy Minh Đạo',
      monkCenter: 'Sư Trụ Trì',
      monkRight: 'Thầy Tâm Từ',
      guideTitle: 'HƯỚNG DẪN',
      guideLine1: 'Bình luận bất kỳ để vào thiền',
      guideLine2: 'Gõ adidaphat lên cắm nhang',
      guideLine3: 'Tặng quà được xướng tên',
      guideLine4: '✦ Hồi Hướng Công Đức ✦',
      meritTitle: '✦ Công Đức ✦'
    };
    return this.textConfig;
  }

  updateUiLayout(key, layout) {
    if (!this.uiLayout) this.uiLayout = JSON.parse(JSON.stringify(DEFAULT_UI_LAYOUT));
    if (key && layout) {
      this.uiLayout[key] = {
        ...(this.uiLayout[key] || {}),
        ...layout
      };
    }
    return this.uiLayout;
  }

  resetUiLayout() {
    this.uiLayout = JSON.parse(JSON.stringify(DEFAULT_UI_LAYOUT));
    return this.uiLayout;
  }

  getNextScriptureChant() {
    const text = SCRIPTURE_CHANTS[this.chantIndex % SCRIPTURE_CHANTS.length];
    this.chantIndex++;
    return text;
  }

  getState() {
    const occupiedCount = this.seats.filter(s => s.occupied).length;
    return {
      currentThemeId: this.currentThemeId,
      theme: TEMPLE_THEMES[this.currentThemeId],
      themes: TEMPLE_THEMES,
      skins: CHARACTER_SKINS,
      voicePresets: VOICE_PRESETS,
      bgMusicTracks: BG_MUSIC_TRACKS,
      voiceConfig: this.voiceConfig,
      hudConfig: this.hudConfig,
      textConfig: this.textConfig,
      uiLayout: this.uiLayout,
      sessionStartTime: this.sessionStartTime,
      slotMode: this.slotMode,
      gridCols: this.currentTier.cols,
      gridRows: this.currentTier.rows,
      occupiedCount,
      totalSeats: this.currentTier.total,
      seats: this.seats,
      meritList: this.meritList
    };
  }
}

module.exports = {
  SeatManager,
  CHARACTER_SKINS,
  TEMPLE_THEMES,
  VOICE_PRESETS,
  BG_MUSIC_TRACKS,
  SCRIPTURE_CHANTS
};
