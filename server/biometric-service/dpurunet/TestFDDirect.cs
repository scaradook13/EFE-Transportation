using System;
using System.Runtime.InteropServices;

public class TestFDDirect {
    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_OpenDeviceManager")]
    public static extern int FD_OpenDeviceManager(out IntPtr hDevMgr);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_CloseDeviceManager")]
    public static extern int FD_CloseDeviceManager(IntPtr hDevMgr);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_EnumerateDevice")]
    public static extern int FD_EnumerateDevice(IntPtr hDevMgr, int index, IntPtr devInfo);

    public static void Main() {
        IntPtr hMgr = IntPtr.Zero;
        try {
            int res = FD_OpenDeviceManager(out hMgr);
            Console.WriteLine("FD_OpenDeviceManager: 0x" + res.ToString("X8") + ", hMgr=" + hMgr);

            if (hMgr != IntPtr.Zero) {
                IntPtr buf = Marshal.AllocHGlobal(2048);
                for (int i = 0; i < 5; i++) {
                    int eRes = FD_EnumerateDevice(hMgr, i, buf);
                    Console.WriteLine("FD_EnumerateDevice(" + i + "): 0x" + eRes.ToString("X8"));
                }
                Marshal.FreeHGlobal(buf);
                FD_CloseDeviceManager(hMgr);
            }
        } catch (Exception ex) {
            Console.WriteLine("Ex: " + ex);
        }
    }
}
