/**
 * Dịch vụ tạo Giọng Nam Trầm Ấm Đọc Kinh & Giọng Sư Cô Thanh Tịnh
 * (Microsoft Edge Neural TTS: vi-VN-NamMinhNeural & vi-VN-HoaiMyNeural + Fallback)
 */

const https = require('https');

let MsEdgeTTS = null;
let OUTPUT_FORMAT = null;
try {
  const edgePkg = require('msedge-tts');
  MsEdgeTTS = edgePkg.MsEdgeTTS;
  OUTPUT_FORMAT = edgePkg.OUTPUT_FORMAT;
} catch (err) {
  console.warn('[TTS] msedge-tts chưa được nạp, sẽ sử dụng bộ đọc dự phòng:', err.message);
}

/**
 * Chuẩn hóa văn bản đọc kinh:
 * 1. Làm sạch emoji, ký tự đặc biệt gây lỗi SSML XML.
 * 2. Phân đoạn thông minh: chuyển các dấu ngắt (, ; : —) thành dấu chấm.
 * 3. Đảm bảo mỗi mệnh đề không quá 9-10 từ để không tràn single-breath buffer
 *    của Microsoft Azure Neural Voice (nguyên nhân gây "no turn.end received").
 */
function sanitizeTextForSsml(rawText) {
  let s = String(rawText || '')
    .normalize('NFC')
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, ' ')
    .replace(/[&<>'"`*~^|\\/{}[\]()@#$%+=_]/g, ' ')
    .replace(/[;:,—–\-]+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();

  const parts = s.split(/[.!?]+/).map(p => p.trim()).filter(Boolean);
  const safeChunks = [];
  for (const part of parts) {
    const words = part.split(/\s+/).filter(Boolean);
    if (words.length <= 10) {
      safeChunks.push(words.join(' '));
    } else {
      for (let i = 0; i < words.length; i += 8) {
        safeChunks.push(words.slice(i, i + 8).join(' '));
      }
    }
  }

  return safeChunks.length > 0 ? safeChunks.join('. ') + '.' : '';
}

/**
 * Tạo buffer MP3 từ văn bản với cấu hình giọng đọc kinh chuẩn Neural:
 * - Nam: vi-VN-NamMinhNeural (Trầm ấm, uy nghiêm)
 * - Nữ: vi-VN-HoaiMyNeural (Thanh tịnh, dịu dàng)
 */
async function synthesizeChantSpeech(text, voiceConfig = {}) {
  const cleanText = sanitizeTextForSsml(text);
  if (!cleanText) return null;

  const pId = String(voiceConfig.presetId || voiceConfig.id || '').toLowerCase();
  let voiceName = voiceConfig.voiceName;

  if (pId.includes('nu') || pId.includes('su_co') || pId.includes('hoaimy')) {
    voiceName = 'vi-VN-HoaiMyNeural';
  } else if (
    pId.includes('nam') ||
    pId.includes('lao') ||
    pId.includes('thay') ||
    pId.includes('namminh')
  ) {
    voiceName = 'vi-VN-NamMinhNeural';
  }

  if (!voiceName || (!voiceName.includes('HoaiMy') && !voiceName.includes('NamMinh'))) {
    voiceName = 'vi-VN-NamMinhNeural';
  }

  // 1. Thử Microsoft Edge Neural TTS (Thời gian chờ tối đa 2.2s để tránh đơ/lag khi mạng chậm)
  if (MsEdgeTTS && OUTPUT_FORMAT) {
    let ttsInstance = null;
    try {
      ttsInstance = new MsEdgeTTS();
      await ttsInstance.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

      const buffer = await new Promise((resolve, reject) => {
        const { audioStream } = ttsInstance.toStream(cleanText);
        const chunks = [];
        let receivedFirstChunk = false;

        // Chờ tối đa 4.5 giây để Edge Neural kịp phản hồi đường truyền
        const timeout = setTimeout(() => {
          if (audioStream && !audioStream.destroyed) audioStream.destroy();
          reject(new Error('Edge TTS timeout'));
        }, 4500);

        audioStream.on('data', chunk => {
          receivedFirstChunk = true;
          if (Buffer.isBuffer(chunk)) chunks.push(chunk);
          else chunks.push(Buffer.from(chunk));
        });
        audioStream.on('end', () => {
          clearTimeout(timeout);
          resolve(Buffer.concat(chunks));
        });
        audioStream.on('error', err => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      try { ttsInstance.close(); } catch (_) {}

      if (buffer && buffer.length > 256) {
        return {
          buffer,
          engine: 'edge-neural',
          voiceName
        };
      }
    } catch (edgeErr) {
      if (ttsInstance) {
        try { ttsInstance.close(); } catch (_) {}
      }
      console.warn(`[TTS] Edge Neural (${voiceName}) không kịp phản hồi (<2.2s), chuyển tức thì sang Google TTS:`, edgeErr.message);
    }
  }

  // 2. Dự phòng: Google TTS Tiếng Việt
  try {
    const truncated = cleanText.slice(0, 195);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(truncated)}&tl=vi&client=tw-ob`;
    const buffer = await new Promise((resolve, reject) => {
      https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      }, res => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', d => chunks.push(d));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });

    if (buffer && buffer.length > 128) {
      return {
        buffer,
        engine: 'google-fallback',
        voiceName: 'vi-VN-Fallback'
      };
    }
  } catch (fallbackErr) {
    console.error('[TTS] Fallback error:', fallbackErr.message);
  }

  return null;
}

module.exports = {
  sanitizeTextForSsml,
  synthesizeChantSpeech
};
