using System;
using System.Runtime.InteropServices;

public class TestFDGetInfo {
    public delegate int DeviceCallback(IntPtr context, int eventType, IntPtr eventData);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_OpenDeviceManager")]
    public static extern int FD_OpenDeviceManager(IntPtr callback, IntPtr context, out IntPtr hDevMgr);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_CloseDeviceManager")]
    public static extern int FD_CloseDeviceManager(IntPtr hDevMgr);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_EnumerateDevice")]
    public static extern int FD_EnumerateDevice(IntPtr hDevMgr, int flags, IntPtr devList, IntPtr inCount, IntPtr outCount);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_GetDeviceInfo")]
    public static extern int FD_GetDeviceInfo(IntPtr devElem, IntPtr infoBuf);

    static int Callback(IntPtr context, int eventType, IntPtr eventData) { return 0; }

    public static void Main() {
        IntPtr hDevMgr = IntPtr.Zero;
        FD_OpenDeviceManager(Marshal.GetFunctionPointerForDelegate(new DeviceCallback(Callback)), IntPtr.Zero, out hDevMgr);
        
        IntPtr devList = Marshal.AllocHGlobal(8 * 16);
        IntPtr pInCount = Marshal.AllocHGlobal(4);
        IntPtr pOutCount = Marshal.AllocHGlobal(4);
        Marshal.WriteInt32(pInCount, 16);
        Marshal.WriteInt32(pOutCount, 0);

        int res = FD_EnumerateDevice(hDevMgr, 1, devList, pInCount, pOutCount);
        int cnt = Marshal.ReadInt32(pOutCount);
        Console.WriteLine("Enumerate res: 0x" + res.ToString("X8") + ", count: " + cnt);

        for (int i = 0; i < cnt; i++) {
            IntPtr devElem = Marshal.ReadIntPtr(devList, i * 8);
            Console.WriteLine("devElem[" + i + "] = 0x" + devElem.ToString("X"));

            IntPtr infoBuf = Marshal.AllocHGlobal(4096);
            for (int k = 0; k < 4096; k++) Marshal.WriteByte(infoBuf, k, 0);
            Marshal.WriteInt32(infoBuf, 0, 4096); // size

            int gRes = FD_GetDeviceInfo(devElem, infoBuf);
            Console.WriteLine("FD_GetDeviceInfo: 0x" + gRes.ToString("X8"));

            byte[] b = new byte[256];
            Marshal.Copy(infoBuf, b, 0, 256);
            for (int r = 0; r < 256; r += 16) {
                Console.Write("0x" + r.ToString("X2") + ": ");
                for (int c = 0; c < 16; c++) Console.Write(b[r+c].ToString("X2") + " ");
                Console.Write(" | ");
                for (int c = 0; c < 16; c++) {
                    char ch = (char)b[r+c];
                    Console.Write((ch >= 32 && ch <= 126) ? ch : '.');
                }
                Console.WriteLine();
            }
            Marshal.FreeHGlobal(infoBuf);
        }

        FD_CloseDeviceManager(hDevMgr);
    }
}