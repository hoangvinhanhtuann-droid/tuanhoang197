/**
 * Dịch vụ tạo Giọng Nam Trầm Ấm Đọc Kinh / Xướng Tên Hồi Hướng (Edge Neural TTS + Fallback)
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

function sanitizeTextForSsml(rawText) {
  return String(rawText || '')
    .normalize('NFC')
    // Loại bỏ Emoji, ký tự điều khiển và ký tự đặc biệt làm lỗi XML SSML của Edge TTS
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, ' ')
    .replace(/[&<>"'`*~^|\\/{}[\]()@#$%=+_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tạo buffer MP3 từ văn bản với cấu hình giọng đọc kinh (Pitch trầm + Rate chậm)
 */
async function synthesizeChantSpeech(text, voiceConfig = {}) {
  const cleanText = sanitizeTextForSsml(text);
  if (!cleanText) return null;

  const voiceName = voiceConfig.voiceName || 'vi-VN-NamMinhNeural';
  const pitchHz = Number.isFinite(Number(voiceConfig.pitchHz)) ? Number(voiceConfig.pitchHz) : -8;
  const ratePercent = Number.isFinite(Number(voiceConfig.ratePercent)) ? Number(voiceConfig.ratePercent) : -20;

  const pitchStr = `${pitchHz >= 0 ? '+' : ''}${pitchHz}Hz`;
  const rateStr = `${ratePercent >= 0 ? '+' : ''}${ratePercent}%`;

  // 1. Ưu tiên Microsoft Edge Neural TTS (vi-VN-NamMinhNeural với prosody trầm ấm)
  if (MsEdgeTTS && OUTPUT_FORMAT) {
    let tts = null;
    try {
      tts = new MsEdgeTTS();
      await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

      const { audioStream } = tts.toStream(cleanText, {
        pitch: pitchStr,
        rate: rateStr
      });

      const buffer = await new Promise((resolve, reject) => {
        const chunks = [];
        const timeout = setTimeout(() => reject(new Error('Edge TTS timeout')), 9000);
        audioStream.on('data', chunk => {
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

      if (tts && typeof tts.close === 'function') {
        try { tts.close(); } catch (_) {}
      }

      if (buffer && buffer.length > 256) {
        return {
          buffer,
          engine: 'edge-neural',
          voiceName,
          pitchStr,
          rateStr
        };
      }
    } catch (edgeErr) {
      if (tts && typeof tts.close === 'function') {
        try { tts.close(); } catch (_) {}
      }
      console.warn('[TTS] Edge Neural TTS fallback:', edgeErr.message);
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
        voiceName: 'vi-VN-Fallback',
        pitchStr,
        rateStr
      };
    }
  } catch (fallbackErr) {
    console.error('[TTS] Fallback error:', fallbackErr.message);
  }

  return null;
}

module.exports = {
  synthesizeChantSpeech
};
