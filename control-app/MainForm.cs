using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Media;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace ThienDuongControl
{
    public class MainForm : Form
    {
        [DllImport("winmm.dll", CharSet = CharSet.Auto)]
        private static extern int mciSendString(string command, StringBuilder buffer, int bufferSize, IntPtr hwndCallback);

        private Process _nodeProcess;
        private readonly string _baseDir;
        private readonly string _serverUrl = "http://localhost:3000";
        private string _tempMp3Path;
        private bool _suppressPresetEvent = false;

        // UI Controls
        private Label _lblServerStatus;
        private Button _btnStartServer;
        private Button _btnOpenWebAdmin;
        private Button _btnOpenOverlay;
        private PictureBox _picPreview;
        private Label _lblActiveTheme;

        // 5 Theme Buttons
        private Button[] _themeButtons = new Button[5];

        // Voice & Music Controls
        private ComboBox _cboVoicePreset;
        private ComboBox _cboBgMusic;
        private CheckBox _chkBgMusic;
        private NumericUpDown _numPitch;
        private NumericUpDown _numRate;
        private NumericUpDown _numReverb;
        private NumericUpDown _numWoodenFishBpm;
        private CheckBox _chkWoodenFish;
        private CheckBox _chkAutoChant;
        private CheckBox _chkPlayOnApp;
        private TextBox _txtChantText;
        private Button _btnPreviewVoice;
        private Button _btnStopVoice;

        // Simulator & Slot Controls
        private ComboBox _cboSlotMode;
        private TextBox _txtViewerName;
        private ComboBox _cboSkin;
        private TextBox _txtComment;
        private ComboBox _cboGiftList;
        private Label _lblGiftCatalogStatus;
        private NumericUpDown _numGiftPoints;
        private TextBox _txtLog;
        private readonly List<string> _giftNames = new List<string>();
        private readonly List<int> _giftDiamonds = new List<int>();

        private readonly string[] _themeNames = new string[]
        {
            "Mẫu 1: Chánh Điện Cổ Tự Truyền Thống",
            "Mẫu 2: Liên Hoa Tiên Cảnh Đêm Trăng",
            "Mẫu 3: Tây Phương Cực Lạc Lưu Ly",
            "Mẫu 4: Thiền Viện Trúc Lâm Thanh Tịnh",
            "Mẫu 5: Phong Cách 3D Chibi Trang Nghiêm"
        };

        private readonly string[,] _skinOptions = new string[,]
        {
            { "nam", "nam - Cư Sĩ Nam (Áo Tràng Xám)" },
            { "nu", "nữ - Cư Sĩ Nữ (Áo Lam Trắng)" },
            { "su", "sư - Sư Thầy (Y Cà Sa Vàng)" },
            { "tieu", "tiểu - Chú Tiểu (Áo Nâu Lam)" },
            { "ni", "ni - Sư Cô / Ni Cô (Áo Lam Vàng)" },
            { "cao tang", "cao tăng - Cao Tăng (Cà Sa Đỏ Tổ)" },
            { "sen", "sen - Phật Tử Áo Sen Hồng" },
            { "vang", "vàng - Thí Chủ Hoàng Kim (VIP)" },
            { "canh sat", "👮 cảnh sát - Cảnh Sát / Công An" },
            { "bac si", "👨‍⚕️ bác sĩ - Bác Sĩ Lương Y (Áo Blouse)" },
            { "trom", "🥷 trộm - Đạo Chích Hoàn Lương" },
            { "heo", "🐷 heo - Heo Hồng (Trư Bát Giới)" },
            { "bo", "🐮 bò - Bò Sữa Ngồi Thiền" },
            { "ga", "🐔 gà - Gà Vàng Chăm Chỉ" },
            { "hoc sinh", "🎒 học sinh - Học Sinh (Khăn Quàng Đỏ, Balo)" },
            { "duc cha", "✝️ đức cha - Đức Cha / Linh Mục (Áo Chùng Đen)" },
            { "than tai", "💰 thần tài - Thần Tài Triệu Phú (Cầu May Mắn)" },
            { "ninja", "🥷 ninja - Ninja Nhẫn Giả (Tĩnh Tâm)" },
            { "cong chua", "👑 công chúa - Tiểu Công Chúa (Váy Dạ Hội)" }
        };

        // PresetId, DisplayName, EdgeVoiceName, MCI Speed (1000 = 1.0x)
        private readonly string[,] _voicePresetOptions = new string[,]
        {
            { "nam_tram_doc_kinh", "1. Giọng Nam Trầm Ấm Đọc Kinh (Khuyên dùng: Nam)", "vi-VN-NamMinhNeural", "920" },
            { "lao_hoa_thuong", "2. Giọng Lão Hòa Thượng Uy Nghiêm (Trầm Sâu: Nam)", "vi-VN-NamMinhNeural", "850" },
            { "thay_phap_thoai", "3. Giọng Thầy Trẻ Ấm Áp Pháp Thoại (Tự Nhiên: Nam)", "vi-VN-NamMinhNeural", "980" },
            { "su_co_thanh_tinh", "4. Giọng Sư Cô Thanh Tịnh Dịu Hiền (Truyền Cảm: Nữ)", "vi-VN-HoaiMyNeural", "950" }
        };

        private readonly string[,] _bgMusicOptions = new string[,]
        {
            { "zen_pentatonic_432", "1. Nhạc Thiền Tĩnh Tâm 432Hz (Chuông Xoay & Ngũ Cung)" },
            { "omitofo_chant_pad", "2. Giai Điệu Niệm Phật A Di Đà (Đàn Tranh & Pháp Khí)" },
            { "guzheng_lotus_pond", "3. Cổ Tranh Liên Hoa Đêm Trăng (Đàn Tranh & Tiêu Trúc)" },
            { "singing_bowl_meditation", "4. Chuông Xoay Tây Tạng & Suối Thiền Rừng Trúc" },
            { "temple_night_ambience", "5. Tĩnh Lặng Chùa Đêm & Chuông Gió Hiên Chùa" },
            { "custom_mp3", "6. Nhạc MP3 Tự Chọn Từ Máy Tính (Custom MP3)" }
        };

        private readonly string[,] _slotModeOptions = new string[,]
        {
            { "auto", "Tự động mở rộng theo số người (Auto: 24 ➔ 36 ➔ 48 ➔ 64 ➔ 100 chỗ)" },
            { "24", "Cố định 24 Bồ Đoàn (4 cột × 6 hàng)" },
            { "36", "Mở rộng 36 Bồ Đoàn (6 cột × 6 hàng)" },
            { "48", "Mở rộng 48 Bồ Đoàn (6 cột × 8 hàng)" },
            { "64", "Đại Lễ 64 Bồ Đoàn (8 cột × 8 hàng)" },
            { "100", "Đại Đàn 100 Bồ Đoàn (10 cột × 10 hàng)" }
        };

        public MainForm()
        {
            _baseDir = AppDomain.CurrentDomain.BaseDirectory;
            if (!Directory.Exists(Path.Combine(_baseDir, "server")))
            {
                string parent = Path.GetFullPath(Path.Combine(_baseDir, ".."));
                if (Directory.Exists(Path.Combine(parent, "server")))
                    _baseDir = parent;
            }

            _tempMp3Path = Path.Combine(Path.GetTempPath(), "thien_duong_preview_tts.mp3");

            InitializeUI();
            LoadPreviewImage(1);
            EnsureServerStarted();
            var _ = LoadTikTokGiftCatalogAsync(false);
        }

        private void InitializeUI()
        {
            this.Text = "Thiền Đường Tịnh Tâm - Bảng Điều Khiển LIVE (WinForms + Node + Three.js Overlay)";
            this.Size = new Size(1065, 765);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(28, 17, 10);
            this.ForeColor = Color.FromArgb(248, 233, 200);
            this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            this.FormClosing += MainForm_FormClosing;

            // Header Banner
            Panel pnlHeader = new Panel
            {
                Dock = DockStyle.Top,
                Height = 66,
                BackColor = Color.FromArgb(52, 28, 12),
                Padding = new Padding(16, 10, 16, 10)
            };

            Label lblTitle = new Label
            {
                Text = "❁ BẢNG ĐIỀU KHIỂN LIVE STREAM ĐI CHÙA BÁI PHẬT (THIỀN ĐƯỜNG TỊNH TÂM)",
                Font = new Font("Segoe UI", 13.0f, FontStyle.Bold),
                ForeColor = Color.FromArgb(246, 204, 102),
                AutoSize = true,
                Location = new Point(16, 10)
            };

            _lblServerStatus = new Label
            {
                Text = "● Trạng thái Server: Đang kiểm tra...",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                ForeColor = Color.FromArgb(120, 230, 140),
                AutoSize = true,
                Location = new Point(18, 38)
            };

            _btnOpenWebAdmin = CreateStyledButton("🌐 Mở Web Admin", new Point(480, 14), new Size(130, 38), Color.FromArgb(30, 105, 175));
            _btnOpenWebAdmin.Click += (s, e) =>
            {
                EnsureServerStarted();
                try
                {
                    Process.Start(_serverUrl + "/admin");
                    AppendLog("🌐 Đã mở Web Admin Dashboard tại http://localhost:3000/admin");
                }
                catch (Exception ex)
                {
                    AppendLog("Lỗi mở Web Admin: " + ex.Message);
                }
            };

            _btnStartServer = CreateStyledButton("▶ Khởi Động Server", new Point(618, 14), new Size(165, 38), Color.FromArgb(180, 110, 20));
            _btnStartServer.Click += (s, e) => EnsureServerStarted();

            _btnOpenOverlay = CreateStyledButton("📱 Mở Overlay 9:16", new Point(790, 14), new Size(170, 38), Color.FromArgb(175, 42, 35));
            _btnOpenOverlay.Click += BtnOpenOverlay_Click;

            pnlHeader.Controls.Add(lblTitle);
            pnlHeader.Controls.Add(_lblServerStatus);
            pnlHeader.Controls.Add(_btnOpenWebAdmin);
            pnlHeader.Controls.Add(_btnStartServer);
            pnlHeader.Controls.Add(_btnOpenOverlay);
            this.Controls.Add(pnlHeader);

            // Cột Trái: Chọn 5 Mẫu Thiết Kế + Cấu Hình Giọng Nam Ấm Đọc Kinh
            GroupBox grpThemes = CreateGroupBox("1. CHỌN 5 MẪU KHÔNG GIAN CHÙA (ĐỔI TRỰC TIẾP TRÊN LIVE)", new Point(14, 76), new Size(410, 240));
            for (int i = 0; i < 5; i++)
            {
                int themeId = i + 1;
                Button btn = CreateStyledButton(_themeNames[i], new Point(14, 26 + i * 40), new Size(382, 34),
                    i == 0 ? Color.FromArgb(204, 138, 30) : Color.FromArgb(68, 40, 20));
                btn.TextAlign = ContentAlignment.MiddleLeft;
                btn.Padding = new Padding(10, 0, 0, 0);
                btn.Click += (s, e) => SwitchTheme(themeId);
                _themeButtons[i] = btn;
                grpThemes.Controls.Add(btn);
            }
            this.Controls.Add(grpThemes);

            // Nhóm 2: Cấu Hình Giọng Nam Ấm Đọc Kinh, Nhạc Nền & Tiếng Chuông Mõ
            GroupBox grpVoice = CreateGroupBox("2. GIỌNG NAM ẤM ĐỌC KINH · NHẠC NỀN · CHUÔNG MÕ", new Point(14, 322), new Size(410, 386));

            grpVoice.Controls.Add(CreateLabel("Chọn chất giọng đọc kinh (Áp dụng cho cả Tặng Quà):", new Point(14, 22)));
            _cboVoicePreset = new ComboBox
            {
                Location = new Point(14, 41),
                Size = new Size(382, 26),
                DropDownStyle = ComboBoxStyle.DropDownList,
                BackColor = Color.FromArgb(45, 27, 14),
                ForeColor = Color.FromArgb(255, 240, 200)
            };
            for (int i = 0; i < _voicePresetOptions.GetLength(0); i++)
            {
                _cboVoicePreset.Items.Add(_voicePresetOptions[i, 1]);
            }
            _cboVoicePreset.SelectedIndex = 0;
            _cboVoicePreset.SelectedIndexChanged += CboVoicePreset_SelectedIndexChanged;
            grpVoice.Controls.Add(_cboVoicePreset);

            grpVoice.Controls.Add(CreateLabel("🎵 Chọn Nhạc Nền Thiền Đường:", new Point(14, 71)));
            _cboBgMusic = new ComboBox
            {
                Location = new Point(14, 90),
                Size = new Size(292, 26),
                DropDownStyle = ComboBoxStyle.DropDownList,
                BackColor = Color.FromArgb(45, 27, 14),
                ForeColor = Color.FromArgb(180, 245, 210)
            };
            for (int i = 0; i < _bgMusicOptions.GetLength(0); i++)
            {
                _cboBgMusic.Items.Add(_bgMusicOptions[i, 1]);
            }
            _cboBgMusic.SelectedIndex = 0;
            _cboBgMusic.SelectedIndexChanged += (s, e) =>
            {
                SaveVoiceConfigToServer();
                AppendLog("🎵 Đã đổi nhạc nền: " + _bgMusicOptions[Math.Max(0, _cboBgMusic.SelectedIndex), 1]);
            };
            grpVoice.Controls.Add(_cboBgMusic);

            Button btnBrowseMp3 = CreateStyledButton("📂 MP3...", new Point(312, 89), new Size(84, 27), Color.FromArgb(90, 62, 28));
            btnBrowseMp3.Click += BtnBrowseMp3_Click;
            grpVoice.Controls.Add(btnBrowseMp3);

            grpVoice.Controls.Add(CreateLabel("Độ trầm (Pitch Hz):", new Point(14, 122)));
            _numPitch = CreateNumeric(-50, 20, -18, new Point(145, 120));
            _numPitch.ValueChanged += (s, e) => { if (!_suppressPresetEvent) SaveVoiceConfigToServer(); };
            grpVoice.Controls.Add(_numPitch);

            grpVoice.Controls.Add(CreateLabel("Tốc độ (%):", new Point(225, 122)));
            _numRate = CreateNumeric(-50, 30, -20, new Point(315, 120));
            _numRate.ValueChanged += (s, e) => { if (!_suppressPresetEvent) SaveVoiceConfigToServer(); };
            grpVoice.Controls.Add(_numRate);

            grpVoice.Controls.Add(CreateLabel("Độ vang Chánh Điện (%):", new Point(14, 150)));
            _numReverb = CreateNumeric(0, 60, 28, new Point(175, 148));
            _numReverb.ValueChanged += (s, e) => { if (!_suppressPresetEvent) SaveVoiceConfigToServer(); };
            grpVoice.Controls.Add(_numReverb);

            grpVoice.Controls.Add(CreateLabel("Nhịp Mõ (BPM):", new Point(245, 150)));
            _numWoodenFishBpm = CreateNumeric(24, 85, 46, new Point(340, 148), 55);
            _numWoodenFishBpm.ValueChanged += (s, e) => { if (!_suppressPresetEvent) SaveVoiceConfigToServer(); };
            grpVoice.Controls.Add(_numWoodenFishBpm);

            _chkBgMusic = new CheckBox
            {
                Text = "Nhạc nền",
                Checked = true,
                AutoSize = true,
                Location = new Point(16, 178)
            };
            _chkBgMusic.CheckedChanged += (s, e) => SaveVoiceConfigToServer();

            _chkWoodenFish = new CheckBox
            {
                Text = "Tiếng Mõ",
                Checked = true,
                AutoSize = true,
                Location = new Point(108, 178)
            };
            _chkWoodenFish.CheckedChanged += (s, e) => SaveVoiceConfigToServer();

            _chkAutoChant = new CheckBox
            {
                Text = "Đọc kinh tự động (2p/lần)",
                Checked = false,
                AutoSize = true,
                Location = new Point(198, 178)
            };
            _chkAutoChant.CheckedChanged += (s, e) => SaveVoiceConfigToServer();

            _chkPlayOnApp = new CheckBox
            {
                Text = "🔊 Phát trực tiếp giọng đọc & chuông mõ ngay trên WinForms",
                Checked = true,
                AutoSize = true,
                ForeColor = Color.FromArgb(130, 245, 160),
                Location = new Point(16, 200)
            };
            grpVoice.Controls.Add(_chkBgMusic);
            grpVoice.Controls.Add(_chkWoodenFish);
            grpVoice.Controls.Add(_chkAutoChant);
            grpVoice.Controls.Add(_chkPlayOnApp);

            _txtChantText = new TextBox
            {
                Location = new Point(14, 224),
                Size = new Size(382, 46),
                Multiline = true,
                BackColor = Color.FromArgb(42, 24, 12),
                ForeColor = Color.FromArgb(255, 242, 210),
                Text = "Nam Mô Bổn Sư Thích Ca Mâu Ni Phật. Nguyện cầu cho toàn thể chư vị Phật tử thân tâm thường an lạc, vạn sự cát tường như ý."
            };
            grpVoice.Controls.Add(_txtChantText);

            _btnPreviewVoice = CreateStyledButton("🔊 Nghe Thử Giọng Đọc Ngay (Trên App)", new Point(14, 274), new Size(288, 38), Color.FromArgb(38, 132, 62));
            _btnPreviewVoice.Click += BtnPreviewVoice_Click;

            _btnStopVoice = CreateStyledButton("⏹ Dừng", new Point(308, 274), new Size(88, 38), Color.FromArgb(145, 42, 42));
            _btnStopVoice.Click += (s, e) => StopLocalMp3();

            grpVoice.Controls.Add(_btnPreviewVoice);
            grpVoice.Controls.Add(_btnStopVoice);

            Button btnChantLive = CreateStyledButton("📿 Phát Đọc Kinh Lên Live", new Point(14, 320), new Size(172, 36), Color.FromArgb(186, 112, 18));
            btnChantLive.Click += BtnChantNow_Click;

            Button btnBellNow = CreateStyledButton("🔔 Thỉnh Chuông", new Point(192, 320), new Size(106, 36), Color.FromArgb(95, 58, 24));
            btnBellNow.Click += (s, e) =>
            {
                PlayLocalTempleBellWav();
                SendJsonPost("/api/sound/trigger", "{\"soundType\":\"bell\"}");
                AppendLog("🔔 Đã thỉnh chuông Đại Hồng Chung (432Hz).");
            };

            Button btnMoNow = CreateStyledButton("🪵 Gõ Mõ", new Point(304, 320), new Size(92, 36), Color.FromArgb(95, 58, 24));
            btnMoNow.Click += (s, e) =>
            {
                PlayLocalWoodenFishWav();
                SendJsonPost("/api/sound/trigger", "{\"soundType\":\"wooden_fish\"}");
                AppendLog("🪵 Đã gõ tiếng Mõ gỗ tĩnh tâm.");
            };

            grpVoice.Controls.Add(btnChantLive);
            grpVoice.Controls.Add(btnBellNow);
            grpVoice.Controls.Add(btnMoNow);
            this.Controls.Add(grpVoice);

            // Cột Giữa: Mở Rộng Slot (24 -> 100 chỗ) + Skin Nhân Vật + Tặng Quà
            GroupBox grpSim = CreateGroupBox("3. MỞ RỘNG SLOT (24➔100 CHỖ) · SKIN · TẶNG QUÀ", new Point(436, 76), new Size(340, 632));

            grpSim.Controls.Add(CreateLabel("Quy mô số chỗ ngồi (Slot Bồ Đoàn):", new Point(14, 24)));
            _cboSlotMode = new ComboBox
            {
                Location = new Point(14, 44),
                Size = new Size(312, 28),
                DropDownStyle = ComboBoxStyle.DropDownList,
                BackColor = Color.FromArgb(45, 27, 14),
                ForeColor = Color.FromArgb(255, 235, 160)
            };
            for (int i = 0; i < _slotModeOptions.GetLength(0); i++)
            {
                _cboSlotMode.Items.Add(_slotModeOptions[i, 1]);
            }
            _cboSlotMode.SelectedIndex = 0;
            _cboSlotMode.SelectedIndexChanged += CboSlotMode_SelectedIndexChanged;
            grpSim.Controls.Add(_cboSlotMode);

            grpSim.Controls.Add(CreateLabel("Tên người xem TikTok:", new Point(14, 78)));
            _txtViewerName = new TextBox
            {
                Location = new Point(14, 98),
                Size = new Size(312, 25),
                BackColor = Color.FromArgb(42, 24, 12),
                ForeColor = Color.White,
                Text = "Thiện Nhân"
            };
            grpSim.Controls.Add(_txtViewerName);

            grpSim.Controls.Add(CreateLabel("Chọn Skin nhân vật (Gõ lệnh tương ứng trên Live):", new Point(14, 128)));
            _cboSkin = new ComboBox
            {
                Location = new Point(14, 148),
                Size = new Size(312, 28),
                DropDownStyle = ComboBoxStyle.DropDownList,
                BackColor = Color.FromArgb(45, 27, 14),
                ForeColor = Color.FromArgb(255, 240, 200)
            };
            for (int i = 0; i < _skinOptions.GetLength(0); i++)
            {
                _cboSkin.Items.Add(_skinOptions[i, 1]);
            }
            _cboSkin.SelectedIndex = 2; // Mặc định Sư Thầy
            grpSim.Controls.Add(_cboSkin);

            grpSim.Controls.Add(CreateLabel("Nội dung bình luận / Lời cầu nguyện:", new Point(14, 180)));
            _txtComment = new TextBox
            {
                Location = new Point(14, 200),
                Size = new Size(312, 25),
                BackColor = Color.FromArgb(42, 24, 12),
                ForeColor = Color.White,
                Text = "Nam Mô A Di Đà Phật, cầu gia đình bình an"
            };
            grpSim.Controls.Add(_txtComment);

            Button btnAddMeditator = CreateStyledButton("🙏 Vào Thiền / Đổi Skin", new Point(14, 232), new Size(160, 36), Color.FromArgb(46, 125, 50));
            btnAddMeditator.Click += BtnAddMeditator_Click;
            grpSim.Controls.Add(btnAddMeditator);

            Button btnOfferIncense = CreateStyledButton("🪔 Lên Cắm Nhang", new Point(178, 232), new Size(148, 36), Color.FromArgb(175, 110, 20));
            btnOfferIncense.Click += (s, e) =>
            {
                string name = EscapeJson(_txtViewerName.Text.Trim());
                int skinIdx = Math.Max(0, _cboSkin.SelectedIndex);
                string skinCode = _skinOptions[skinIdx, 0];
                string comment = EscapeJson(skinCode + " adidaphat con xin dâng hương cúng Phật 🙏");
                PlayLocalTempleBellWav();
                string json = string.Format("{{\"uniqueId\":\"{0}\",\"nickname\":\"{0}\",\"comment\":\"{1}\"}}", name, comment);
                SendJsonPost("/api/comment", json);
                AppendLog(string.Format("🪔 [{0}] đứng dậy đi lên cắm nhang dâng hương lễ Phật!", name));
            };
            grpSim.Controls.Add(btnOfferIncense);

            // Khối giả lập Tặng Quà Xướng Tên Hồi Hướng (Tự động lấy danh sách quà từ TikTok Webcast API)
            _lblGiftCatalogStatus = CreateLabel("Quà TikTok (Đang tải từ API TikTok...):", new Point(14, 276));
            grpSim.Controls.Add(_lblGiftCatalogStatus);

            Button btnRefreshGifts = CreateStyledButton("🔄 API", new Point(268, 271), new Size(58, 23), Color.FromArgb(72, 52, 24));
            btnRefreshGifts.Font = new Font("Segoe UI", 8.0f, FontStyle.Bold);
            btnRefreshGifts.Click += async (s, e) => await LoadTikTokGiftCatalogAsync(true);
            grpSim.Controls.Add(btnRefreshGifts);

            _cboGiftList = new ComboBox
            {
                Location = new Point(14, 296),
                Size = new Size(216, 26),
                DropDownStyle = ComboBoxStyle.DropDown,
                DropDownWidth = 340,
                MaxDropDownItems = 18,
                BackColor = Color.FromArgb(42, 24, 12),
                ForeColor = Color.FromArgb(255, 230, 130)
            };
            _cboGiftList.SelectedIndexChanged += (s, e) =>
            {
                int gIdx = _cboGiftList.SelectedIndex;
                if (gIdx >= 0 && gIdx < _giftDiamonds.Count)
                {
                    int d = _giftDiamonds[gIdx];
                    _numGiftPoints.Value = Math.Max(_numGiftPoints.Minimum, Math.Min(_numGiftPoints.Maximum, d));
                }
            };
            grpSim.Controls.Add(_cboGiftList);

            _numGiftPoints = CreateNumeric(1, 99999, 1, new Point(236, 296), 90);
            grpSim.Controls.Add(_numGiftPoints);

            SeedFallbackGiftCombo();

            Button btnSendGift = CreateStyledButton("🎁 Tặng Quà & Xướng Tên Hồi Hướng Công Đức", new Point(14, 328), new Size(312, 38), Color.FromArgb(190, 55, 35));
            btnSendGift.Click += BtnSendGift_Click;
            grpSim.Controls.Add(btnSendGift);

            // Bộ 4 nút điền mẫu nhanh theo số lượng Slot: 15, 36, 64, 100 người
            grpSim.Controls.Add(CreateLabel("Điền nhanh Phật tử mẫu để test độ đông:", new Point(14, 372)));
            int[] sampleCounts = new int[] { 15, 36, 64, 100 };
            for (int i = 0; i < sampleCounts.Length; i++)
            {
                int cnt = sampleCounts[i];
                Button btnSample = CreateStyledButton(cnt + " Người", new Point(14 + i * 79, 392), new Size(75, 30), Color.FromArgb(110, 72, 25));
                btnSample.Click += (s, e) =>
                {
                    PlayLocalTempleBellWav();
                    SendJsonPost("/api/seats/sample", "{\"count\":" + cnt + "}");
                    AppendLog("✨ Đã điền mẫu " + cnt + " thiền sinh lên chiếu thiền.");
                };
                grpSim.Controls.Add(btnSample);
            }

            Button btnResetMerit = CreateStyledButton("✨ Reset Công Đức", new Point(14, 426), new Size(152, 32), Color.FromArgb(178, 112, 24));
            btnResetMerit.Click += (s, e) =>
            {
                PlayLocalTempleBellWav();
                SendJsonPost("/api/merit/reset", "{}");
                AppendLog("✨ Đã reset Bảng Công Đức và đưa toàn bộ điểm công đức về ban đầu (0 điểm)!");
            };
            grpSim.Controls.Add(btnResetMerit);

            Button btnClearSeats = CreateStyledButton("🧹 Làm Trống Ghế", new Point(174, 426), new Size(152, 32), Color.FromArgb(125, 42, 42));
            btnClearSeats.Click += (s, e) =>
            {
                SendJsonPost("/api/seats/clear", "{}");
                AppendLog("🧹 Đã làm trống toàn bộ bồ đoàn.");
            };
            grpSim.Controls.Add(btnClearSeats);

            // Kết nối trực tiếp kênh TikTok đang Live (@username) hoặc bật Giả Lập Live Tự Động
            grpSim.Controls.Add(CreateLabel("🔴 Nhập @ID Kênh TikTok đang Live (Hoặc bật Giả Lập):", new Point(14, 462)));
            TextBox txtTikTokUser = new TextBox
            {
                Location = new Point(14, 482),
                Size = new Size(135, 25),
                BackColor = Color.FromArgb(42, 24, 12),
                ForeColor = Color.FromArgb(130, 245, 160),
                Text = "@review.nghip.v"
            };
            Button btnConnectTikTok = CreateStyledButton("🔗 Kết Nối", new Point(153, 480), new Size(84, 27), Color.FromArgb(185, 38, 38));
            btnConnectTikTok.Click += async (s, e) =>
            {
                string u = EscapeJson(txtTikTokUser.Text.Trim());
                btnConnectTikTok.Enabled = false;
                AppendLog("⏳ Đang kết nối tới phòng Live TikTok của [" + u + "]...");
                string resp = await Task.Run(() => SendJsonPostWithResponse("/api/tiktok/connect", "{\"username\":\"" + u + "\"}"));
                btnConnectTikTok.Enabled = true;

                if (resp != null && resp.Contains("\"ok\":true"))
                {
                    AppendLog("✅ Đã kết nối trực tiếp phòng Live TikTok của " + u + "!");
                    await LoadTikTokGiftCatalogAsync(false);
                }
                else
                {
                    AppendLog("⚠️ Chưa kết nối được: Kênh [" + u + "] hiện chưa phát LIVE trên TikTok (hoặc bạn đang để tên mẫu). Bạn có thể bấm nút [🤖 Auto Demo] bên cạnh để test luồng người vào tự động!");
                }
            };

            bool autoDemoRunning = false;
            Button btnAutoDemo = CreateStyledButton("🤖 Auto Demo", new Point(241, 480), new Size(85, 27), Color.FromArgb(42, 110, 155));
            btnAutoDemo.Click += (s, e) =>
            {
                autoDemoRunning = !autoDemoRunning;
                SendJsonPost("/api/tiktok/autodemo", "{\"enable\":" + (autoDemoRunning ? "true" : "false") + "}");
                btnAutoDemo.BackColor = autoDemoRunning ? Color.FromArgb(35, 145, 65) : Color.FromArgb(42, 110, 155);
                btnAutoDemo.Text = autoDemoRunning ? "⏹ Dừng Demo" : "🤖 Auto Demo";
                AppendLog(autoDemoRunning
                    ? "🤖 Đã BẬT giả lập người xem bình luận & tặng quà tự động (mỗi 3.5 giây)!"
                    : "⏹ Đã TẮT chế độ giả lập tự động.");
            };

            grpSim.Controls.Add(txtTikTokUser);
            grpSim.Controls.Add(btnConnectTikTok);
            grpSim.Controls.Add(btnAutoDemo);

            _txtLog = new TextBox
            {
                Location = new Point(14, 514),
                Size = new Size(312, 104),
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                BackColor = Color.FromArgb(20, 12, 6),
                ForeColor = Color.FromArgb(210, 195, 165),
                Font = new Font("Consolas", 8.5f)
            };
            grpSim.Controls.Add(_txtLog);
            this.Controls.Add(grpSim);

            // Cột Phải: Xem Trước Mẫu Thiết Kế (9:16 Preview)
            GroupBox grpPreview = CreateGroupBox("4. XEM TRƯỚC MẪU THIẾT KẾ (9:16)", new Point(786, 76), new Size(246, 632));
            _lblActiveTheme = new Label
            {
                Text = "Mẫu 1: Chánh Điện Cổ Tự",
                Location = new Point(12, 26),
                Size = new Size(222, 22),
                ForeColor = Color.FromArgb(255, 215, 100),
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleCenter
            };
            _picPreview = new PictureBox
            {
                Location = new Point(15, 52),
                Size = new Size(216, 384),
                SizeMode = PictureBoxSizeMode.Zoom,
                BorderStyle = BorderStyle.FixedSingle,
                BackColor = Color.Black
            };

            Label lblGuideTools = new Label
            {
                Location = new Point(12, 446),
                Size = new Size(222, 176),
                ForeColor = Color.FromArgb(230, 210, 175),
                Font = new Font("Segoe UI", 8.5f),
                Text = "📌 HƯỚNG DẪN NHANH:\r\n" +
                       "• Chọn giọng ở mục [2] sẽ tự động áp dụng ngay cho cả [Nghe Thử] và [Tặng Quà].\r\n" +
                       "• Chọn quy mô 24➔100 chỗ ở mục [3] hoặc bấm [36 Người], [64 Người], [100 Người] để xem đại chúng ngồi kín chiếu.\r\n" +
                       "• Mở ManyCam -> App Window -> Cửa sổ Overlay 9:16."
            };

            grpPreview.Controls.Add(_lblActiveTheme);
            grpPreview.Controls.Add(_picPreview);
            grpPreview.Controls.Add(lblGuideTools);
            this.Controls.Add(grpPreview);
        }

        // ====================================================================
        // PHÁT TRỰC TIẾP GIỌNG ĐỌC KINH, CHUÔNG CHÙA & TIẾNG MÕ NGAY TRÊN WINFORMS
        // ====================================================================

        private async void BtnPreviewVoice_Click(object sender, EventArgs e)
        {
            string text = _txtChantText.Text.Trim();
            if (string.IsNullOrEmpty(text))
            {
                text = "Nam Mô A Di Đà Phật. Nguyện cầu bình an, thân tâm thường an lạc.";
            }

            await PreviewVoiceDirectlyAsync(text);
        }

        private async Task PreviewVoiceDirectlyAsync(string text)
        {
            EnsureServerStarted();

            int idx = Math.Max(0, _cboVoicePreset.SelectedIndex);
            string presetId = _voicePresetOptions[idx, 0];
            string voiceName = _voicePresetOptions[idx, 2];
            int baseMciSpeed = int.Parse(_voicePresetOptions[idx, 3]);
            int pitchHz = (int)_numPitch.Value;
            int ratePct = (int)_numRate.Value;

            // Tính tốc độ MCI để tạo độ trầm ấm rõ rệt ngay trên WinForms
            int mciSpeed = Math.Max(750, Math.Min(1100, baseMciSpeed + (pitchHz + 14) * 4));

            _btnPreviewVoice.Enabled = false;
            _btnPreviewVoice.Text = "⏳ Đang phát giọng đọc...";
            AppendLog(string.Format("🔊 Đang tạo giọng [{0}] ({1}, Pitch: {2}Hz, Rate: {3}%)...", presetId, voiceName, pitchHz, ratePct));

            // 1. Thỉnh 1 tiếng chuông mở đầu
            PlayLocalTempleBellWav();

            try
            {
                string url = string.Format(
                    "{0}/api/tts?text={1}&presetId={2}&voiceName={3}&pitchHz={4}&ratePercent={5}",
                    _serverUrl,
                    Uri.EscapeDataString(text),
                    Uri.EscapeDataString(presetId),
                    Uri.EscapeDataString(voiceName),
                    pitchHz,
                    ratePct
                );

                // Tải MP3 song song trong lúc tiếng chuông ngân nhịp đầu (650ms)
                Task<byte[]> downloadTask = Task.Run(() =>
                {
                    using (WebClient wc = new WebClient())
                    {
                        return wc.DownloadData(url);
                    }
                });

                await Task.WhenAll(downloadTask, Task.Delay(650));
                byte[] mp3Bytes = downloadTask.Result;

                if (mp3Bytes != null && mp3Bytes.Length > 256)
                {
                    PlayLocalMp3Bytes(mp3Bytes, mciSpeed);
                    AppendLog(string.Format("✅ Đang phát giọng [{0}] trực tiếp trên App (Tốc độ âm trầm: {1}‰).", _voicePresetOptions[idx, 1].Split('(')[0].Trim(), mciSpeed));
                }
                else
                {
                    AppendLog("⚠️ Không nhận được dữ liệu âm thanh từ Server.");
                }
            }
            catch (Exception ex)
            {
                AppendLog("❌ Lỗi phát giọng đọc: " + ex.Message);
            }
            finally
            {
                _btnPreviewVoice.Enabled = true;
                _btnPreviewVoice.Text = "🔊 Nghe Thử Giọng Đọc Ngay (Trên App)";
            }
        }

        private void PlayLocalMp3Bytes(byte[] mp3Bytes, int mciSpeed = 930)
        {
            try
            {
                StopLocalMp3();
                _tempMp3Path = Path.Combine(Path.GetTempPath(), "thien_duong_tts_" + DateTime.Now.Ticks + ".mp3");
                File.WriteAllBytes(_tempMp3Path, mp3Bytes);

                mciSendString("open \"" + _tempMp3Path + "\" type mpegvideo alias thienDuongTts", null, 0, IntPtr.Zero);
                mciSendString("set thienDuongTts speed " + mciSpeed, null, 0, IntPtr.Zero);
                mciSendString("play thienDuongTts", null, 0, IntPtr.Zero);
            }
            catch (Exception ex)
            {
                AppendLog("Lỗi MCI Audio: " + ex.Message);
            }
        }

        private void StopLocalMp3()
        {
            try
            {
                mciSendString("stop thienDuongTts", null, 0, IntPtr.Zero);
                mciSendString("close thienDuongTts", null, 0, IntPtr.Zero);
            }
            catch { }
        }

        private void PlayLocalTempleBellWav()
        {
            Task.Run(() =>
            {
                try
                {
                    int sampleRate = 24000;
                    double durationSec = 2.4;
                    int samples = (int)(sampleRate * durationSec);
                    using (MemoryStream ms = new MemoryStream())
                    using (BinaryWriter bw = new BinaryWriter(ms))
                    {
                        WriteWavHeader(bw, sampleRate, samples);
                        for (int i = 0; i < samples; i++)
                        {
                            double t = (double)i / sampleRate;
                            double env1 = Math.Exp(-t * 1.5);
                            double env2 = Math.Exp(-t * 2.3);
                            double env3 = Math.Exp(-t * 3.6);
                            double wave =
                                0.45 * Math.Sin(2 * Math.PI * 216.0 * t) * env1 +
                                0.32 * Math.Sin(2 * Math.PI * 432.0 * t) * env2 +
                                0.16 * Math.Sin(2 * Math.PI * 654.0 * t) * env3;
                            short pcm = (short)Math.Max(-32767, Math.Min(32767, wave * 21000));
                            bw.Write(pcm);
                        }
                        ms.Position = 0;
                        using (SoundPlayer sp = new SoundPlayer(ms))
                        {
                            sp.Play();
                        }
                    }
                }
                catch { }
            });
        }

        private void PlayLocalWoodenFishWav()
        {
            Task.Run(() =>
            {
                try
                {
                    int sampleRate = 24000;
                    double durationSec = 0.18;
                    int samples = (int)(sampleRate * durationSec);
                    using (MemoryStream ms = new MemoryStream())
                    using (BinaryWriter bw = new BinaryWriter(ms))
                    {
                        WriteWavHeader(bw, sampleRate, samples);
                        for (int i = 0; i < samples; i++)
                        {
                            double t = (double)i / sampleRate;
                            double freq = 510.0 - 110.0 * (t / durationSec);
                            double env = Math.Exp(-t * 28.0);
                            double wave = (Math.Sin(2 * Math.PI * freq * t) + 0.35 * Math.Sin(2 * Math.PI * freq * 1.5 * t)) * env;
                            short pcm = (short)Math.Max(-32767, Math.Min(32767, wave * 24000));
                            bw.Write(pcm);
                        }
                        ms.Position = 0;
                        using (SoundPlayer sp = new SoundPlayer(ms))
                        {
                            sp.Play();
                        }
                    }
                }
                catch { }
            });
        }

        private static void WriteWavHeader(BinaryWriter bw, int sampleRate, int numSamples)
        {
            int byteRate = sampleRate * 2;
            int dataSize = numSamples * 2;
            bw.Write(Encoding.ASCII.GetBytes("RIFF"));
            bw.Write(36 + dataSize);
            bw.Write(Encoding.ASCII.GetBytes("WAVEfmt "));
            bw.Write(16);
            bw.Write((short)1);
            bw.Write((short)1);
            bw.Write(sampleRate);
            bw.Write(byteRate);
            bw.Write((short)2);
            bw.Write((short)16);
            bw.Write(Encoding.ASCII.GetBytes("data"));
            bw.Write(dataSize);
        }

        // ====================================================================
        // XỬ LÝ SỰ KIỆN GIAO DIỆN & ĐỒNG BỘ TỨC THÌ LÊN SERVER
        // ====================================================================

        private void CboSlotMode_SelectedIndexChanged(object sender, EventArgs e)
        {
            int idx = Math.Max(0, _cboSlotMode.SelectedIndex);
            string slotMode = _slotModeOptions[idx, 0];
            SendJsonPost("/api/seats/mode", "{\"slotMode\":\"" + slotMode + "\"}");
            AppendLog("Đã đổi quy mô phòng thiền sang: " + _slotModeOptions[idx, 1]);
        }

        private void SwitchTheme(int themeId)
        {
            for (int i = 0; i < 5; i++)
            {
                _themeButtons[i].BackColor = (i + 1 == themeId)
                    ? Color.FromArgb(204, 138, 30)
                    : Color.FromArgb(68, 40, 20);
            }
            _lblActiveTheme.Text = _themeNames[themeId - 1];
            LoadPreviewImage(themeId);
            SendJsonPost("/api/theme", "{\"themeId\":" + themeId + "}");
            AppendLog("Đã chuyển sang " + _themeNames[themeId - 1]);
        }

        private void LoadPreviewImage(int themeId)
        {
            try
            {
                string mockupPath = Path.Combine(_baseDir, "overlay", "assets", "mockups", "mockup_" + themeId + ".jpg");
                if (!File.Exists(mockupPath))
                    mockupPath = Path.Combine(_baseDir, "overlay", "assets", "themes", "theme_" + themeId + "_bg.jpg");

                if (File.Exists(mockupPath))
                {
                    using (FileStream fs = new FileStream(mockupPath, FileMode.Open, FileAccess.Read))
                    {
                        _picPreview.Image = Image.FromStream(fs);
                    }
                }
            }
            catch (Exception ex)
            {
                AppendLog("Lỗi tải ảnh xem trước: " + ex.Message);
            }
        }

        private void CboVoicePreset_SelectedIndexChanged(object sender, EventArgs e)
        {
            _suppressPresetEvent = true;
            int idx = _cboVoicePreset.SelectedIndex;
            if (idx == 0) { _numPitch.Value = -14; _numRate.Value = -12; _numReverb.Value = 28; }
            else if (idx == 1) { _numPitch.Value = -18; _numRate.Value = -20; _numReverb.Value = 38; }
            else if (idx == 2) { _numPitch.Value = -4; _numRate.Value = -5; _numReverb.Value = 18; }
            else if (idx == 3) { _numPitch.Value = 0; _numRate.Value = -8; _numReverb.Value = 26; }
            _suppressPresetEvent = false;

            // Tự động đồng bộ ngay giọng vừa chọn sang Server để Tặng Quà & Đọc Kinh phát đúng 100%
            SaveVoiceConfigToServer();
            AppendLog("🎵 Đã chọn giọng: " + _voicePresetOptions[Math.Max(0, idx), 1]);
        }

        private void BtnBrowseMp3_Click(object sender, EventArgs e)
        {
            using (OpenFileDialog ofd = new OpenFileDialog())
            {
                ofd.Title = "Chọn file nhạc nền Thiền / Niệm Phật (.mp3)";
                ofd.Filter = "Audio Files (*.mp3;*.wav)|*.mp3;*.wav|All Files (*.*)|*.*";
                if (ofd.ShowDialog() == DialogResult.OK)
                {
                    string path = EscapeJson(ofd.FileName);
                    SendJsonPost("/api/music/custom", "{\"filePath\":\"" + path + "\"}");
                    _cboBgMusic.SelectedIndex = 5; // Custom MP3
                    AppendLog("🎵 Đã chọn file nhạc nền MP3: " + Path.GetFileName(ofd.FileName));
                }
            }
        }

        private void SaveVoiceConfigToServer()
        {
            if (_cboVoicePreset == null || _numPitch == null || _numRate == null || _numReverb == null || _numWoodenFishBpm == null)
                return;

            int idx = Math.Max(0, _cboVoicePreset.SelectedIndex);
            string presetId = _voicePresetOptions[idx, 0];
            string voiceName = _voicePresetOptions[idx, 2];
            int musicIdx = _cboBgMusic != null ? Math.Max(0, _cboBgMusic.SelectedIndex) : 0;
            string musicTrack = _bgMusicOptions[musicIdx, 0];
            string reverbVal = ((double)_numReverb.Value / 100.0).ToString(System.Globalization.CultureInfo.InvariantCulture);

            string json = string.Format(
                "{{\"presetId\":\"{0}\",\"voiceName\":\"{1}\",\"pitchHz\":{2},\"ratePercent\":{3},\"reverbLevel\":{4},\"woodenFishBpm\":{5},\"woodenFishEnabled\":{6},\"autoChantEnabled\":{7},\"bgMusicEnabled\":{8},\"bgMusicTrack\":\"{9}\"}}",
                presetId,
                voiceName,
                (int)_numPitch.Value,
                (int)_numRate.Value,
                reverbVal,
                (int)_numWoodenFishBpm.Value,
                _chkWoodenFish != null && _chkWoodenFish.Checked ? "true" : "false",
                _chkAutoChant != null && _chkAutoChant.Checked ? "true" : "false",
                _chkBgMusic != null && _chkBgMusic.Checked ? "true" : "false",
                musicTrack
            );

            SendJsonPost("/api/voice/config", json);
        }

        private async void BtnChantNow_Click(object sender, EventArgs e)
        {
            SaveVoiceConfigToServer();
            string rawText = _txtChantText.Text.Trim();
            string clean = EscapeJson(rawText);
            string resp = SendJsonPostWithResponse("/api/chant", "{\"text\":\"" + clean + "\"}");
            AppendLog("📿 Đã phát lệnh đọc kinh sang Overlay Live.");

            if (_chkPlayOnApp != null && _chkPlayOnApp.Checked && (resp == null || resp.Contains("\"overlayClientsCount\":0")))
            {
                await PreviewVoiceDirectlyAsync(rawText);
            }
        }

        private void BtnAddMeditator_Click(object sender, EventArgs e)
        {
            string name = EscapeJson(_txtViewerName.Text.Trim());
            int skinIdx = Math.Max(0, _cboSkin.SelectedIndex);
            string skinCode = _skinOptions[skinIdx, 0];
            string comment = EscapeJson(skinCode + " " + _txtComment.Text.Trim());

            if (_chkPlayOnApp != null && _chkPlayOnApp.Checked)
            {
                PlayLocalWoodenFishWav();
            }

            string json = string.Format(
                "{{\"uniqueId\":\"{0}\",\"nickname\":\"{0}\",\"comment\":\"{1}\"}}",
                name, comment
            );
            SendJsonPost("/api/comment", json);
            AppendLog(string.Format("🙏 [{0}] vào thiền với skin [{1}]", name, skinCode));
        }

        private void SeedFallbackGiftCombo()
        {
            string[] defaultNames = new string[]
            {
                "Hoa Hồng (Rose)",
                "Logo TikTok",
                "Tim Cam (Heart Me)",
                "Bắn Tim (Finger Heart)",
                "Ánh Mắt Trái Tim (Heart Gaze)",
                "Nước Hoa (Perfume)",
                "Bánh Vòng (Doughnut)",
                "Bó Hoa Tươi (Bouquet Flower)",
                "Hạc Giấy Cầu An (Paper Crane)",
                "Dải Ngân Hà (Galaxy)",
                "Sư Tử Vàng (Lion)",
                "Vũ Trụ TikTok (TikTok Universe)"
            };
            int[] defaultDiamonds = new int[] { 1, 1, 1, 5, 10, 20, 30, 30, 99, 1000, 29999, 44999 };

            _giftNames.Clear();
            _giftDiamonds.Clear();
            _cboGiftList.Items.Clear();

            for (int i = 0; i < defaultNames.Length; i++)
            {
                _giftNames.Add(defaultNames[i]);
                _giftDiamonds.Add(defaultDiamonds[i]);
                _cboGiftList.Items.Add(string.Format("{0} [{1} xu]", defaultNames[i], defaultDiamonds[i]));
            }
            if (_cboGiftList.Items.Count > 0)
            {
                _cboGiftList.SelectedIndex = 0;
            }
        }

        private async Task LoadTikTokGiftCatalogAsync(bool forceRefresh)
        {
            try
            {
                string json = await Task.Run(() =>
                {
                    // Đợi nhẹ nếu Node server vừa được khởi động
                    for (int retry = 0; retry < 4; retry++)
                    {
                        try
                        {
                            if (forceRefresh)
                            {
                                return SendJsonPostWithResponse("/api/tiktok/gifts/refresh", "{}");
                            }
                            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(_serverUrl + "/api/tiktok/gifts");
                            req.Method = "GET";
                            req.Timeout = 9000;
                            using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                            using (StreamReader sr = new StreamReader(res.GetResponseStream(), Encoding.UTF8))
                            {
                                return sr.ReadToEnd();
                            }
                        }
                        catch
                        {
                            System.Threading.Thread.Sleep(500);
                        }
                    }
                    return null;
                });

                if (string.IsNullOrEmpty(json)) return;

                Regex rx = new Regex("\\{\"id\":(\\d+),\"name\":\"((?:\\\\.|[^\"])*)\",\"rawName\":\"((?:\\\\.|[^\"])*)\",\"diamondCount\":(\\d+)");
                MatchCollection matches = rx.Matches(json);
                if (matches.Count > 0)
                {
                    _giftNames.Clear();
                    _giftDiamonds.Clear();
                    _cboGiftList.BeginUpdate();
                    _cboGiftList.Items.Clear();

                    foreach (Match m in matches)
                    {
                        string gName = m.Groups[2].Value.Replace("\\\"", "\"").Replace("\\\\", "\\");
                        int gCoins = 1;
                        int.TryParse(m.Groups[4].Value, out gCoins);
                        _giftNames.Add(gName);
                        _giftDiamonds.Add(gCoins);
                        _cboGiftList.Items.Add(string.Format("{0} [{1} xu]", gName, gCoins));
                    }

                    if (_cboGiftList.Items.Count > 0)
                    {
                        _cboGiftList.SelectedIndex = 0;
                    }
                    _cboGiftList.EndUpdate();

                    if (_lblGiftCatalogStatus != null)
                    {
                        _lblGiftCatalogStatus.Text = string.Format("Quà TikTok ({0} quà từ API TikTok):", matches.Count);
                    }
                    AppendLog(string.Format("🎁 Đã tự động nạp {0} quà tặng từ TikTok Webcast API!", matches.Count));
                }
            }
            catch (Exception ex)
            {
                AppendLog("⚠️ Chưa tải danh sách quà API: " + ex.Message);
            }
        }

        private string ExtractCleanGiftName()
        {
            int gIdx = _cboGiftList.SelectedIndex;
            string raw = (gIdx >= 0 && gIdx < _giftNames.Count)
                ? _giftNames[gIdx]
                : _cboGiftList.Text.Trim();

            // Loại bỏ phần "[... xu]" và tên tiếng Anh trong ngoặc đơn để giọng đọc kinh tự nhiên
            raw = Regex.Replace(raw, "\\s*\\[\\d+\\s*xu\\]\\s*$", "");
            string cleanVn = Regex.Replace(raw, "\\s*\\([^)]*\\)\\s*", " ").Trim();
            return string.IsNullOrEmpty(cleanVn) ? raw.Trim() : cleanVn;
        }

        private async void BtnSendGift_Click(object sender, EventArgs e)
        {
            // BƯỚC QUAN TRỌNG: Đồng bộ giọng đang chọn trước khi gửi sự kiện Tặng Quà!
            SaveVoiceConfigToServer();

            int idx = Math.Max(0, _cboVoicePreset.SelectedIndex);
            string presetId = _voicePresetOptions[idx, 0];
            string voiceName = _voicePresetOptions[idx, 2];
            int pitchHz = (int)_numPitch.Value;
            int ratePct = (int)_numRate.Value;
            string reverbVal = ((double)_numReverb.Value / 100.0).ToString(System.Globalization.CultureInfo.InvariantCulture);

            string rawName = _txtViewerName.Text.Trim();
            string rawGift = ExtractCleanGiftName();
            string name = EscapeJson(rawName);
            string gift = EscapeJson(rawGift);
            int pts = (int)_numGiftPoints.Value;

            // Gửi kèm toàn bộ thông số giọng đọc đã chọn trong body /api/gift
            string json = string.Format(
                "{{\"uniqueId\":\"{0}\",\"nickname\":\"{0}\",\"giftName\":\"{1}\",\"diamondCount\":{2},\"presetId\":\"{3}\",\"voiceName\":\"{4}\",\"pitchHz\":{5},\"ratePercent\":{6},\"reverbLevel\":{7}}}",
                name, gift, pts, presetId, voiceName, pitchHz, ratePct, reverbVal
            );

            string resp = SendJsonPostWithResponse("/api/gift", json);
            AppendLog(string.Format("🎁 [{0}] cúng dường [{1}] (+{2} Công Đức) -> Xướng tên bằng [{3}]!", rawName, rawGift, pts, presetId));

            // Phát trực tiếp trên WinForms bằng đúng giọng đã chọn
            if (_chkPlayOnApp != null && _chkPlayOnApp.Checked)
            {
                string dedicationText = string.Format(
                    "Nam Mô A Di Đà Phật. Xin thành tâm hồi hướng công đức cho thí chủ {0} đã phát tâm cúng dường {1}. Nguyện cầu cho thí chủ cùng gia quyến thân tâm an lạc, sở cầu như ý.",
                    rawName, rawGift
                );
                await PreviewVoiceDirectlyAsync(dedicationText);
            }
        }

        private void EnsureServerStarted()
        {
            if (IsServerRunning())
            {
                _lblServerStatus.Text = "● Trạng thái Server: Đang chạy tại http://localhost:3000";
                _lblServerStatus.ForeColor = Color.FromArgb(90, 240, 120);
                return;
            }

            try
            {
                string serverJs = Path.Combine(_baseDir, "server", "server.js");
                if (!File.Exists(serverJs))
                {
                    AppendLog("Không tìm thấy file: " + serverJs);
                    return;
                }

                string nodeExe = "node";
                string programFilesNode = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe");
                if (File.Exists(programFilesNode))
                {
                    nodeExe = programFilesNode;
                }

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = nodeExe,
                    Arguments = "\"" + serverJs + "\"",
                    WorkingDirectory = Path.Combine(_baseDir, "server"),
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                _nodeProcess = Process.Start(psi);
                _lblServerStatus.Text = "● Trạng thái Server: Đang chạy tại http://localhost:3000";
                _lblServerStatus.ForeColor = Color.FromArgb(90, 240, 120);
                AppendLog("Đã khởi động Node.js Server thành công.");
            }
            catch (Exception ex)
            {
                _lblServerStatus.Text = "● Trạng thái Server: Lỗi khởi động (" + ex.Message + ")";
                _lblServerStatus.ForeColor = Color.Salmon;
                AppendLog("Lỗi bật Node Server: " + ex.Message);
            }
        }

        private bool IsServerRunning()
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(_serverUrl + "/api/state");
                req.Timeout = 900;
                using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                {
                    return res.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }

        private void BtnOpenOverlay_Click(object sender, EventArgs e)
        {
            EnsureServerStarted();
            try
            {
                string[] browsers = new string[]
                {
                    @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                    @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                    @"C:\Program Files\Google\Chrome\Application\chrome.exe"
                };

                foreach (string b in browsers)
                {
                    if (File.Exists(b))
                    {
                        Process.Start(b, "--app=" + _serverUrl + " --window-size=540,960");
                        AppendLog("Đã mở cửa sổ Overlay 9:16 (540x960) chuẩn ManyCam.");
                        return;
                    }
                }

                Process.Start(_serverUrl);
                AppendLog("Đã mở Overlay trên trình duyệt mặc định.");
            }
            catch (Exception ex)
            {
                AppendLog("Lỗi mở trình duyệt: " + ex.Message);
            }
        }

        private void SendJsonPost(string path, string jsonBody)
        {
            SendJsonPostWithResponse(path, jsonBody);
        }

        private string SendJsonPostWithResponse(string path, string jsonBody)
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(_serverUrl + path);
                req.Method = "POST";
                req.ContentType = "application/json; charset=utf-8";
                req.Headers.Add("X-Admin-Token", "Datvip@33");
                req.Timeout = 10000;
                byte[] bytes = Encoding.UTF8.GetBytes(jsonBody);
                req.ContentLength = bytes.Length;
                using (Stream st = req.GetRequestStream())
                {
                    st.Write(bytes, 0, bytes.Length);
                }
                using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                using (StreamReader sr = new StreamReader(res.GetResponseStream(), Encoding.UTF8))
                {
                    return sr.ReadToEnd();
                }
            }
            catch (WebException wex)
            {
                if (wex.Response != null)
                {
                    using (StreamReader sr = new StreamReader(wex.Response.GetResponseStream(), Encoding.UTF8))
                    {
                        return sr.ReadToEnd();
                    }
                }
                AppendLog("API Error (" + path + "): " + wex.Message);
                return null;
            }
            catch (Exception ex)
            {
                AppendLog("API Error (" + path + "): " + ex.Message);
                return null;
            }
        }

        private void AppendLog(string msg)
        {
            if (_txtLog == null) return;
            string line = "[" + DateTime.Now.ToString("HH:mm:ss") + "] " + msg + "\r\n";
            _txtLog.AppendText(line);
        }

        private static string EscapeJson(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", " ").Replace("\n", " ");
        }

        private static GroupBox CreateGroupBox(string title, Point loc, Size size)
        {
            return new GroupBox
            {
                Text = title,
                Location = loc,
                Size = size,
                ForeColor = Color.FromArgb(246, 204, 102),
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold)
            };
        }

        private static Label CreateLabel(string text, Point loc)
        {
            return new Label
            {
                Text = text,
                Location = loc,
                AutoSize = true,
                ForeColor = Color.FromArgb(238, 222, 190),
                Font = new Font("Segoe UI", 9.0f, FontStyle.Regular)
            };
        }

        private static NumericUpDown CreateNumeric(int min, int max, int val, Point loc, int width = 68)
        {
            return new NumericUpDown
            {
                Minimum = min,
                Maximum = max,
                Value = val,
                Location = loc,
                Size = new Size(width, 25),
                BackColor = Color.FromArgb(45, 27, 14),
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 9.0f, FontStyle.Regular)
            };
        }

        private static Button CreateStyledButton(string text, Point loc, Size size, Color backColor)
        {
            Button btn = new Button
            {
                Text = text,
                Location = loc,
                Size = size,
                BackColor = backColor,
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand,
                Font = new Font("Segoe UI", 9.2f, FontStyle.Bold)
            };
            btn.FlatAppearance.BorderColor = Color.FromArgb(228, 184, 88);
            btn.FlatAppearance.BorderSize = 1;
            return btn;
        }

        private void MainForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            StopLocalMp3();
            try
            {
                if (_nodeProcess != null && !_nodeProcess.HasExited)
                {
                    _nodeProcess.Kill();
                }
            }
            catch { }
        }
    }
}
