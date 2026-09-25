using System;
using System.Runtime.InteropServices;

public class NativeTest {
    [DllImport("dpfpdd.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int dpfpdd_init();

    [DllImport("dpfpdd.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int dpfpdd_exit();

    [StructLayout(LayoutKind.Sequential)]
    public struct DPFPDD_DEV_INFO {
        public uint size;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)]
        public string name;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)]
        public string serial_number;
        public uint modality;
        public uint technology;
    }

    [DllImport("dpfpdd.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int dpfpdd_query_devices(ref uint dev_cnt, IntPtr dev_infos);

    public static void Main() {
        int initRes = dpfpdd_init();
        Console.WriteLine("dpfpdd_init: 0x" + initRes.ToString("X8"));

        uint dev_cnt = 0;
        int qRes = dpfpdd_query_devices(ref dev_cnt, IntPtr.Zero);
        Console.WriteLine("dpfpdd_query_devices (cnt=0): 0x" + qRes.ToString("X8") + ", dev_cnt=" + dev_cnt);
        dpfpdd_exit();
    }
}
