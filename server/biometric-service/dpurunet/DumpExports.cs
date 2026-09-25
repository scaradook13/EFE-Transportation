using System;
using System.Runtime.InteropServices;

public class DumpExports {
    [DllImport("kernel32.dll")]
    public static extern IntPtr LoadLibrary(string name);
    [DllImport("kernel32.dll")]
    public static extern IntPtr GetProcAddress(IntPtr h, string proc);

    public static void Main() {
        IntPtr h = LoadLibrary("dpDevCtlx64.dll");
        string[] procs = new string[] {
            "dpDevCtl_Initialize", "dpDevCtl_Uninitialize", "dpDevCtl_EnumerateDevices",
            "dpDevCtl_OpenDevice", "dpDevCtl_CloseDevice", "dpDevCtl_GetDeviceInfo",
            "Init", "Exit", "EnumDevices", "OpenDevice", "CloseDevice"
        };
        foreach (string p in procs) {
            IntPtr addr = GetProcAddress(h, p);
            if (addr != IntPtr.Zero) Console.WriteLine(p + " -> " + addr);
        }
    }
}
