using System;
using System.Runtime.InteropServices;

public class Test4k {
    [DllImport("kernel32.dll")]
    public static extern IntPtr LoadLibrary(string name);
    [DllImport("kernel32.dll")]
    public static extern IntPtr GetProcAddress(IntPtr h, string proc);

    public static void Main() {
        IntPtr h = LoadLibrary("dpfpdd_4k.dll");
        string[] procs = new string[] {
            "dpfpdd_init", "dpfpdd_exit", "dpfpdd_query_devices", "dpfpdd_open", "dpfpdd_close", "dpfpdd_version"
        };
        foreach (string p in procs) {
            IntPtr addr = GetProcAddress(h, p);
            Console.WriteLine(p + " -> " + addr);
        }
    }
}
