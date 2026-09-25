using System;
using System.Runtime.InteropServices;

public class Test4kQuery {
    [DllImport("dpfpdd_4k.dll", EntryPoint = "dpfpdd_init")]
    public static extern int dpfpdd_init();

    [DllImport("dpfpdd_4k.dll", EntryPoint = "dpfpdd_query_devices")]
    public static extern int dpfpdd_query_devices(ref uint count, IntPtr dev_infos);

    [DllImport("dpfpdd_4k.dll", EntryPoint = "dpfpdd_exit")]
    public static extern int dpfpdd_exit();

    public static void Main() {
        int init = dpfpdd_init();
        Console.WriteLine("dpfpdd_4k init: 0x" + init.ToString("X8"));

        uint count = 0;
        int q = dpfpdd_query_devices(ref count, IntPtr.Zero);
        Console.WriteLine("dpfpdd_4k query (count=0): 0x" + q.ToString("X8") + ", count=" + count);

        count = 10;
        int bufSize = 10 * 1024;
        IntPtr buf = Marshal.AllocHGlobal(bufSize);
        Marshal.WriteInt32(buf, 0, 1024);
        int q2 = dpfpdd_query_devices(ref count, buf);
        Console.WriteLine("dpfpdd_4k query (buf): 0x" + q2.ToString("X8") + ", count=" + count);

        dpfpdd_exit();
    }
}
