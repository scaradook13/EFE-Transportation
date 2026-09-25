using System;
using System.Runtime.InteropServices;

public class Test4kQuery2 {
    [DllImport("dpfpdd_4k.dll", EntryPoint = "dpfpdd_init")]
    public static extern int dpfpdd_init();

    [DllImport("dpfpdd_4k.dll", EntryPoint = "dpfpdd_query_devices")]
    public static extern int dpfpdd_query_devices(ref uint count, IntPtr dev_infos);

    [DllImport("dpfpdd_4k.dll", EntryPoint = "dpfpdd_exit")]
    public static extern int dpfpdd_exit();

    public static void Main() {
        dpfpdd_init();
        uint count = 1;
        IntPtr buf = Marshal.AllocHGlobal(1452);
        Marshal.WriteInt32(buf, 0, 1452);
        int q = dpfpdd_query_devices(ref count, buf);
        Console.WriteLine("dpfpdd_4k query (1452): 0x" + q.ToString("X8") + ", count=" + count);
        dpfpdd_exit();
    }
}
