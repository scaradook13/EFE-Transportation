using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

public class TestModules {
    [DllImport("dpfpdd.dll", EntryPoint = "dpfpdd_init")]
    public static extern int dpfpdd_init();

    [DllImport("dpfpdd.dll", EntryPoint = "dpfpdd_query_devices")]
    public static extern int dpfpdd_query_devices(ref uint count, IntPtr devInfos);

    [DllImport("dpfpdd.dll", EntryPoint = "dpfpdd_exit")]
    public static extern int dpfpdd_exit();

    public static void Main() {
        dpfpdd_init();
        uint count = 0;
        dpfpdd_query_devices(ref count, IntPtr.Zero);

        Process p = Process.GetCurrentProcess();
        Console.WriteLine("Loaded modules containing 'dp':");
        foreach (ProcessModule m in p.Modules) {
            if (m.ModuleName.ToLower().Contains("dp")) {
                Console.WriteLine("  " + m.ModuleName + " -> " + m.FileName);
            }
        }
        dpfpdd_exit();
    }
}