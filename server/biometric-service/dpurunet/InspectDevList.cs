using System;
using System.Runtime.InteropServices;

public class InspectDevList {
    public delegate int DeviceCallback(IntPtr context, int eventType, IntPtr eventData);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_OpenDeviceManager")]
    public static extern int FD_OpenDeviceManager(IntPtr callback, IntPtr context, out IntPtr hDevMgr);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_CloseDeviceManager")]
    public static extern int FD_CloseDeviceManager(IntPtr hDevMgr);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_EnumerateDevice")]
    public static extern int FD_EnumerateDevice(IntPtr hDevMgr, int flags, int index, IntPtr out1, IntPtr outCount);

    static int Callback(IntPtr context, int eventType, IntPtr eventData) { return 0; }

    public static void Main() {
        IntPtr hDevMgr = IntPtr.Zero;
        FD_OpenDeviceManager(Marshal.GetFunctionPointerForDelegate(new DeviceCallback(Callback)), IntPtr.Zero, out hDevMgr);
        IntPtr devList = Marshal.AllocHGlobal(4096);
        IntPtr pCount = Marshal.AllocHGlobal(4096);
        Marshal.WriteInt32(pCount, 16);
        int res = FD_EnumerateDevice(hDevMgr, 1, 0, devList, pCount);
        int cnt = Marshal.ReadInt32(pCount);
        Console.WriteLine("Enumerate res: 0x" + res.ToString("X8") + ", count: " + cnt);

        byte[] mem = new byte[512];
        Marshal.Copy(devList, mem, 0, 512);
        for (int i = 0; i < 512; i += 16) {
            Console.Write("0x" + i.ToString("X3") + ": ");
            for (int j = 0; j < 16; j++) Console.Write(mem[i+j].ToString("X2") + " ");
            Console.Write(" | ");
            for (int j = 0; j < 16; j++) {
                char c = (char)mem[i+j];
                Console.Write((c >= 32 && c <= 126) ? c : '.');
            }
            Console.WriteLine();
        }
        FD_CloseDeviceManager(hDevMgr);
    }
}