using System;
using System.Runtime.InteropServices;

public class TestFDFull {
    public delegate int DeviceCallback(IntPtr context, int eventType, IntPtr eventData);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_OpenDeviceManager")]
    public static extern int FD_OpenDeviceManager(IntPtr callback, IntPtr context, out IntPtr hDevMgr);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_CloseDeviceManager")]
    public static extern int FD_CloseDeviceManager(IntPtr hDevMgr);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_EnumerateDevice")]
    public static extern int FD_EnumerateDevice(IntPtr hDevMgr, int flags, int index, IntPtr out1, IntPtr outCount);

    static int Callback(IntPtr context, int eventType, IntPtr eventData) {
        Console.WriteLine("Device callback: event=" + eventType);
        return 0;
    }

    public static void Main() {
        try {
            DeviceCallback cb = new DeviceCallback(Callback);
            IntPtr pCb = Marshal.GetFunctionPointerForDelegate(cb);
            IntPtr hDevMgr = IntPtr.Zero;

            int res = FD_OpenDeviceManager(pCb, IntPtr.Zero, out hDevMgr);
            Console.WriteLine("FD_OpenDeviceManager result: 0x" + res.ToString("X8") + ", hMgr=" + hDevMgr);

            if (res == 0 && hDevMgr != IntPtr.Zero) {
                IntPtr pOut1 = Marshal.AllocHGlobal(4096);
                IntPtr pCount = Marshal.AllocHGlobal(4096);
                Marshal.WriteInt32(pCount, 0);

                int enumRes = FD_EnumerateDevice(hDevMgr, 0x10000000, 0, pOut1, pCount);
                int count = Marshal.ReadInt32(pCount);
                Console.WriteLine("FD_EnumerateDevice(flags=0x10000000): 0x" + enumRes.ToString("X8") + ", count=" + count);

                if (count > 0) {
                    Console.WriteLine("DEVICES FOUND: " + count);
                }

                Marshal.FreeHGlobal(pOut1);
                Marshal.FreeHGlobal(pCount);
                FD_CloseDeviceManager(hDevMgr);
            }
        } catch (Exception ex) {
            Console.WriteLine("Error: " + ex);
        }
    }
}
