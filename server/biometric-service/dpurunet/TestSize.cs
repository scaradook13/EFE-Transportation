using System;
using System.Reflection;
using System.Runtime.InteropServices;
using DPUruNet;

public class TestSize {
    public static void Main() {
        Type t = typeof(ReaderCollection).Assembly.GetType("DPUruNet.NativeMethods+DPFPDD_DEV_INFO");
        Console.WriteLine("DPFPDD_DEV_INFO size: " + Marshal.SizeOf(t));
    }
}
