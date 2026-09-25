using System;
using System.Runtime.InteropServices;

public class TestLoad {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr LoadLibrary(string lpFileName);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr GetProcAddress(IntPtr hModule, string procName);

    public static void Main() {
        IntPtr h4k = LoadLibrary("dpfpdd_4k.dll");
        Console.WriteLine("Load dpfpdd_4k.dll: " + h4k + ", LastError=" + Marshal.GetLastWin32Error());

        IntPtr hCtl = LoadLibrary("dpDevCtlx64.dll");
        Console.WriteLine("Load dpDevCtlx64.dll: " + hCtl + ", LastError=" + Marshal.GetLastWin32Error());

        IntPtr hDat = LoadLibrary("dpDevDatx64.dll");
        Console.WriteLine("Load dpDevDatx64.dll: " + hDat + ", LastError=" + Marshal.GetLastWin32Error());
    }
}
