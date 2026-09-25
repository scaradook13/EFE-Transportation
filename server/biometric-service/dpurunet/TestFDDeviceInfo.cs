using System;
using System.Runtime.InteropServices;
using System.Text;

public class TestFDDeviceInfo {
    public delegate int DeviceCallback(IntPtr context, int eventType, IntPtr eventData);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_OpenDeviceManager")]
    public static extern int FD_OpenDeviceManager(IntPtr callback, IntPtr context, out IntPtr hDevMgr);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_CloseDeviceManager")]
    public static extern int FD_CloseDeviceManager(IntPtr hDevMgr);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_EnumerateDevice")]
    public static extern int FD_EnumerateDevice(IntPtr hDevMgr, int flags, int index, IntPtr out1, IntPtr outCount);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_GetDeviceInfo")]
    public static extern int FD_GetDeviceInfo(IntPtr hDevMgr, IntPtr devName, IntPtr pInfo);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_OpenDevice")]
    public static extern int FD_OpenDevice(IntPtr hDevMgr, IntPtr devName, int flags, out IntPtr hDevice);

    [DllImport("dpdevctlx64.dll", EntryPoint = "FD_CloseDevice")]
    public static extern int FD_CloseDevice(IntPtr hDevice);

    static int Callback(IntPtr context, int eventType, IntPtr eventData) { return 0; }

    public static void Main() {
        try {
            DeviceCallback cb = new DeviceCallback(Callback);
            IntPtr pCb = Marshal.GetFunctionPointerForDelegate(cb);
            IntPtr hDevMgr = IntPtr.Zero;

            int res = FD_OpenDeviceManager(pCb, IntPtr.Zero, out hDevMgr);
            Console.WriteLine("FD_OpenDeviceManager: 0x" + res.ToString("X8") + ", hMgr=" + hDevMgr);

            IntPtr pOut1 = Marshal.AllocHGlobal(4096);
            IntPtr pCount = Marshal.AllocHGlobal(4096);
            Marshal.WriteInt32(pCount, 0);

            // Flag 0x10000000 to get count
            int enumRes = FD_EnumerateDevice(hDevMgr, 0x10000000, 0, pOut1, pCount);
            int count = Marshal.ReadInt32(pCount);
            Console.WriteLine("Count = " + count);

            // Now let's enumerate index 0 (or flag 1)
            // Let's allocate an array of pointers or buffers
            IntPtr devList = Marshal.AllocHGlobal(8 * 16);
            Marshal.WriteInt32(pCount, 16);
            int eRes2 = FD_EnumerateDevice(hDevMgr, 1, 0, devList, pCount);
            Console.WriteLine("FD_EnumerateDevice(1): 0x" + eRes2.ToString("X8") + ", count=" + Marshal.ReadInt32(pCount));

            // Let's read the pointer
            IntPtr pDevName = Marshal.ReadIntPtr(devList, 0);
            Console.WriteLine("pDevName ptr = " + pDevName);
            if (pDevName != IntPtr.Zero) {
                string nameA = Marshal.PtrToStringAnsi(pDevName);
                string nameU = Marshal.PtrToStringUni(pDevName);
                Console.WriteLine("Device Name (Ansi): " + nameA);
                Console.WriteLine("Device Name (Uni):  " + nameU);

                IntPtr hDevice = IntPtr.Zero;
                int openRes = FD_OpenDevice(hDevMgr, pDevName, 0, out hDevice);
                Console.WriteLine("FD_OpenDevice: 0x" + openRes.ToString("X8") + ", hDevice=" + hDevice);

                if (openRes == 0 && hDevice != IntPtr.Zero) {
                    Console.WriteLine("DEVICE OPENED SUCCESSFULLY!");
                    FD_CloseDevice(hDevice);
                    Console.WriteLine("Device closed cleanly.");
                }
            }

            Marshal.FreeHGlobal(devList);
            Marshal.FreeHGlobal(pOut1);
            Marshal.FreeHGlobal(pCount);
            FD_CloseDeviceManager(hDevMgr);
        } catch (Exception ex) {
            Console.WriteLine("Error: " + ex);
        }
    }
}
