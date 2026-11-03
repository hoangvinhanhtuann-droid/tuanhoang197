using System;
using System.IO;
using System.Windows.Forms;

namespace ThienDuongControl
{
    internal static class Program
    {
        [STAThread]
        static void Main()
        {
            try
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new MainForm());
            }
            catch (Exception ex)
            {
                File.WriteAllText("crash_log.txt", ex.ToString());
                MessageBox.Show(ex.Message, "Lỗi khởi động", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
