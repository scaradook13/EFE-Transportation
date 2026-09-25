using System;
using System.Runtime.InteropServices;

public class TestFDGetInfo2 {
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

        FD_EnumerateDevice(hDevMgr, 1, devList, pInCount, pOutCount);
        IntPtr devElem = Marshal.ReadIntPtr(devList, 0);

        IntPtr infoBuf = Marshal.AllocHGlobal(4096);
        for (int k = 0; k < 4096; k++) Marshal.WriteByte(infoBuf, k, 0);
        Marshal.WriteInt32(infoBuf, 0, 4096);

        FD_GetDeviceInfo(devElem, infoBuf);

        Console.WriteLine("=== infoBuf from offset 0x100 to 0x200 ===");
        byte[] b = new byte[256];
        Marshal.Copy(new IntPtr(infoBuf.ToInt64() + 0x100), b, 0, 256);
        for (int r = 0; r < 256; r += 16) {
            Console.Write("0x" + (0x100 + r).ToString("X2") + ": ");
            for (int c = 0; c < 16; c++) Console.Write(b[r+c].ToString("X2") + " ");
            Console.Write(" | ");
            for (int c = 0; c < 16; c++) {
                char ch = (char)b[r+c];
                Console.Write((ch >= 32 && ch <= 126) ? ch : '.');
            }
            Console.WriteLine();
        }

        // Print string at offset 0x128
        IntPtr pStr = new IntPtr(infoBuf.ToInt64() + 0x128);
        Console.WriteLine("String Uni at 0x128: '" + Marshal.PtrToStringUni(pStr) + "'");
        Console.WriteLine("String Ansi at 0x128: '" + Marshal.PtrToStringAnsi(pStr) + "'");

        FD_CloseDeviceManager(hDevMgr);
    }
}