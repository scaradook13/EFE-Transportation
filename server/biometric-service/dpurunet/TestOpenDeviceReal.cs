using System;
using System.Runtime.InteropServices;

public class TestOpenDeviceReal {
    public delegate int DeviceCallback(IntPtr context, int eventType, IntPtr eventData);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_OpenDeviceManager")]
    public static extern int FD_OpenDeviceManager(IntPtr callback, IntPtr context, out IntPtr hDevMgr);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_CloseDeviceManager")]
    public static extern int FD_CloseDeviceManager(IntPtr hDevMgr);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_EnumerateDevice")]
    public static extern int FD_EnumerateDevice(IntPtr hDevMgr, int flags, IntPtr devList, IntPtr inCount, IntPtr outCount);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_OpenDevice")]
    public static extern int FD_OpenDevice(IntPtr hDevMgr, IntPtr devElem, int flags, out IntPtr hDevice);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_CloseDevice")]
    public static extern int FD_CloseDevice(IntPtr hDevice);

    static int Callback(IntPtr context, int eventType, IntPtr eventData) { return 0; }

    public static void Main() {
        IntPtr hDevMgr = IntPtr.Zero;
        FD_OpenDeviceManager(Marshal.GetFunctionPointerForDelegate(new DeviceCallback(Callback)), IntPtr.Zero, out hDevMgr);
        Console.WriteLine("hDevMgr = 0x" + hDevMgr.ToString("X"));

        IntPtr devList = Marshal.AllocHGlobal(8 * 16);
        IntPtr pInCount = Marshal.AllocHGlobal(4);
        IntPtr pOutCount = Marshal.AllocHGlobal(4);
        Marshal.WriteInt32(pInCount, 16);
        Marshal.WriteInt32(pOutCount, 0);

        FD_EnumerateDevice(hDevMgr, 1, devList, pInCount, pOutCount);
        int cnt = Marshal.ReadInt32(pOutCount);
        Console.WriteLine("Count: " + cnt);

        if (cnt > 0) {
            IntPtr devElem = Marshal.ReadIntPtr(devList, 0);
            Console.WriteLine("devElem = 0x" + devElem.ToString("X"));

            IntPtr hDevice = IntPtr.Zero;
            int openRes = FD_OpenDevice(hDevMgr, devElem, 0, out hDevice);
            Console.WriteLine("FD_OpenDevice result: 0x" + openRes.ToString("X8") + ", hDevice = 0x" + hDevice.ToString("X"));

            if (openRes == 0 && hDevice != IntPtr.Zero) {
                Console.WriteLine("SUCCESS! THE FINGERPRINT READER IS OPEN AND ACCESSIBLE!");
                FD_CloseDevice(hDevice);
                Console.WriteLine("Device closed successfully.");
            }
        }

        FD_CloseDeviceManager(hDevMgr);
    }
}