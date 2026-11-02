/**
 * Dịch vụ lấy tự động Danh Sách Quà Tặng từ TikTok Webcast API chính thức
 * (https://webcast.tiktok.com/webcast/gift/list/?aid=1988)
 * Kèm bộ từ điển Việt hóa tên quà phổ biến để giọng đọc kinh xướng tên tự nhiên.
 */

const https = require('https');

// Từ điển Việt hóa các quà tặng TikTok phổ biến để hiển thị & đọc kinh trang trọng
const VN_GIFT_NAMES = {
  5655: 'Hoa Hồng (Rose)',
  56560: 'Hoa Hồng Đầu Tiên (My First Rose)',
  5269: 'Logo TikTok',
  7934: 'Tim Cam (Heart Me)',
  5487: 'Bắn Tim (Finger Heart)',
  13300: 'Ánh Mắt Trái Tim (Heart Gaze)',
  5879: 'Bánh Vòng (Doughnut)',
  5780: 'Bó Hoa Tươi (Bouquet Flower)',
  5658: 'Nước Hoa (Perfume)',
  5659: 'Hạc Giấy Cầu An (Paper Crane)',
  11046: 'Dải Ngân Hà (Galaxy)',
  6369: 'Sư Tử Vàng (Lion)',
  7823: 'Sư Tử Leon (Leon and Lion)',
  9101: 'Vũ Trụ TikTok (TikTok Universe)',
  9072: 'Vũ Trụ TikTok (TikTok Universe)',
  8582: 'Vì Sao TikTok (TikTok Stars)',
  6751: 'Phi Thuyền TikTok (TikTok Shuttle)',
  17712: 'Trái Tim Cộng Đồng (Community Heart)'
};

// Danh sách quà mặc định phòng khi máy mất mạng lúc khởi động
const FALLBACK_GIFTS = [
  { id: 5655, name: 'Hoa Hồng (Rose)', rawName: 'Rose', diamondCount: 1, iconUrl: '' },
  { id: 5269, name: 'Logo TikTok', rawName: 'TikTok', diamondCount: 1, iconUrl: '' },
  { id: 7934, name: 'Tim Cam (Heart Me)', rawName: 'Heart Me', diamondCount: 1, iconUrl: '' },
  { id: 5487, name: 'Bắn Tim (Finger Heart)', rawName: 'Finger Heart', diamondCount: 5, iconUrl: '' },
  { id: 13300, name: 'Ánh Mắt Trái Tim (Heart Gaze)', rawName: 'Heart Gaze', diamondCount: 10, iconUrl: '' },
  { id: 5658, name: 'Nước Hoa (Perfume)', rawName: 'Perfume', diamondCount: 20, iconUrl: '' },
  { id: 5879, name: 'Bánh Vòng (Doughnut)', rawName: 'Doughnut', diamondCount: 30, iconUrl: '' },
  { id: 5780, name: 'Bó Hoa Tươi (Bouquet Flower)', rawName: 'Bouquet Flower', diamondCount: 30, iconUrl: '' },
  { id: 5659, name: 'Hạc Giấy Cầu An (Paper Crane)', rawName: 'Paper Crane', diamondCount: 99, iconUrl: '' },
  { id: 11046, name: 'Dải Ngân Hà (Galaxy)', rawName: 'Galaxy', diamondCount: 1000, iconUrl: '' },
  { id: 6369, name: 'Sư Tử Vàng (Lion)', rawName: 'Lion', diamondCount: 29999, iconUrl: '' },
  { id: 9101, name: 'Vũ Trụ TikTok (TikTok Universe)', rawName: 'TikTok Universe', diamondCount: 44999, iconUrl: '' }
];

const PRIORITY_GIFT_IDS = new Set([
  5655, 5269, 7934, 5487, 13300, 5658, 5879, 5780, 5659, 11046, 6369, 9101
]);

class TikTokGiftService {
  constructor() {
    this.giftMap = new Map();
    this.giftList = [];
    this.lastRoomId = '7702737442965162772';
    this.seedFallback();
  }

  seedFallback() {
    FALLBACK_GIFTS.forEach(g => {
      this.giftMap.set(Number(g.id), g);
    });
    this.rebuildSortedList();
  }

  rebuildSortedList() {
    const all = Array.from(this.giftMap.values());
    all.sort((a, b) => {
      const aPri = PRIORITY_GIFT_IDS.has(a.id) ? 0 : 1;
      const bPri = PRIORITY_GIFT_IDS.has(b.id) ? 0 : 1;
      if (aPri !== bPri) return aPri - bPri;
      if (a.diamondCount !== b.diamondCount) return a.diamondCount - b.diamondCount;
      return String(a.name).localeCompare(String(b.name));
    });
    this.giftList = all;
  }

  /**
   * Gọi trực tiếp TikTok Webcast API để lấy toàn bộ ~727 quà tặng hiện có
   */
  async fetchLiveGiftCatalog(roomId = '') {
    const targetRoom = roomId || this.lastRoomId || '7702737442965162772';
    if (roomId) this.lastRoomId = roomId;

    const url = `https://webcast.tiktok.com/webcast/gift/list/?aid=1988&app_language=vi-VN&language=vi&room_id=${encodeURIComponent(targetRoom)}`;

    try {
      const rawJson = await new Promise((resolve, reject) => {
        const req = https.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8'
          },
          timeout: 8000
        }, res => {
          let body = '';
          res.on('data', chunk => { body += chunk; });
          res.on('end', () => resolve(body));
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
      });

      const parsed = JSON.parse(rawJson);
      const gifts = (parsed && parsed.data && parsed.data.gifts) || [];
      if (gifts.length > 0) {
        gifts.forEach(g => {
          const id = Number(g.id);
          if (!id) return;
          const rawName = String(g.name || `Gift #${id}`).trim();
          const vnName = VN_GIFT_NAMES[id] || rawName;
          const diamondCount = Math.max(1, Number(g.diamond_count || 1));
          const iconUrl = (g.image && Array.isArray(g.image.url_list) && g.image.url_list[0]) || '';

          this.giftMap.set(id, {
            id,
            name: vnName,
            rawName,
            diamondCount,
            iconUrl
          });
        });
        this.rebuildSortedList();
        console.log(`[TikTokGiftAPI] ✅ Đã đồng bộ tự động ${this.giftList.length} quà tặng từ TikTok Webcast API!`);
      }
    } catch (err) {
      console.warn('[TikTokGiftAPI] Sử dụng bộ nhớ đệm quà tặng:', err.message);
    }

    return this.giftList;
  }

  /**
   * Tra cứu thông tin quà từ sự kiện Gift trên Live (theo giftId hoặc tên quà)
   */
  resolveGift(data = {}) {
    const giftId = Number(
      data.giftId ||
      (data.giftDetails && data.giftDetails.giftId) ||
      (data.gift && data.gift.giftId) ||
      0
    );

    if (giftId && this.giftMap.has(giftId)) {
      const found = this.giftMap.get(giftId);
      // Khi đọc kinh xướng tên, bỏ phần tiếng Anh trong ngoặc để câu đọc tự nhiên
      const cleanChantName = found.name.replace(/\s*\([^)]*\)\s*/g, '').trim();
      return {
        giftId: found.id,
        giftName: cleanChantName || found.name,
        displayGiftName: found.name,
        diamondCount: found.diamondCount,
        iconUrl: found.iconUrl
      };
    }

    const rawName =
      data.giftName ||
      (data.giftDetails && data.giftDetails.giftName) ||
      'Hoa Sen Công Đức';
    const diamondCount = Math.max(
      1,
      Number(
        data.diamondCount ||
        (data.giftDetails && data.giftDetails.diamondCount) ||
        1
      )
    );
    const iconUrl =
      data.giftPictureUrl ||
      (data.giftDetails && data.giftDetails.giftImage && data.giftDetails.giftImage.giftPictureUrl) ||
      '';

    return {
      giftId,
      giftName: String(rawName).replace(/\s*\([^)]*\)\s*/g, '').trim(),
      displayGiftName: rawName,
      diamondCount,
      iconUrl
    };
  }

  getGifts() {
    return this.giftList;
  }
}

module.exports = {
  TikTokGiftService
};
