using System;
using System.Runtime.InteropServices;

public class TestCount {
    [DllImport("dpfpdd.dll", EntryPoint = "dpfpdd_init")]
    public static extern int dpfpdd_init();

    [DllImport("dpfpdd.dll", EntryPoint = "dpfpdd_query_devices")]
    public static extern int dpfpdd_query_devices(ref uint count, IntPtr devInfos);

    [DllImport("dpfpdd.dll", EntryPoint = "dpfpdd_exit")]
    public static extern int dpfpdd_exit();

    public static void Main() {
        int initRes = dpfpdd_init();
        Console.WriteLine("dpfpdd_init: 0x" + initRes.ToString("X8"));

        uint count = 0;
        int res1 = dpfpdd_query_devices(ref count, IntPtr.Zero);
        Console.WriteLine("dpfpdd_query_devices(count=0, null) res: 0x" + res1.ToString("X8") + ", count: " + count);

        uint count2 = 10;
        IntPtr buf = Marshal.AllocHGlobal(1452 * 10);
        for (int i = 0; i < 10; i++) {
            Marshal.WriteInt32(new IntPtr(buf.ToInt64() + i * 1452), 0, 1452); // size field
        }
        int res2 = dpfpdd_query_devices(ref count2, buf);
        Console.WriteLine("dpfpdd_query_devices(count=10, buf) res: 0x" + res2.ToString("X8") + ", count: " + count2);

        if (count2 > 0) {
            byte[] nameBytes = new byte[260];
            // Name is at offset 4
            Marshal.Copy(new IntPtr(buf.ToInt64() + 4), nameBytes, 0, 260);
            string devName = System.Text.Encoding.ASCII.GetString(nameBytes).TrimEnd('\0');
            Console.WriteLine("FOUND DEVICE NAME: " + devName);
        }

        dpfpdd_exit();
    }
}