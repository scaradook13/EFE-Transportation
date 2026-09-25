using System;
using System.Reflection;
using DPUruNet;

public class TestDbg {
    public static void Main() {
        Type nmType = typeof(ReaderCollection).Assembly.GetType("DPUruNet.NativeMethods");
        Type devInfoType = typeof(ReaderCollection).Assembly.GetType("DPUruNet.NativeMethods+DPFPDD_DEV_INFO");

        MethodInfo initMi = nmType.GetMethod("dpfpdd_init", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static);
        int initRes = (int)initMi.Invoke(null, null);
        Console.WriteLine("dpfpdd_init: 0x" + initRes.ToString("X8"));

        MethodInfo qMi = nmType.GetMethod("dpfpdd_query_devices", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static);
        
        object[] args1 = new object[] { 0, null };
        object res1 = qMi.Invoke(null, args1);
        int cnt1 = (int)args1[0];
        Console.WriteLine("dpfpdd_query_devices(0, null) result: 0x" + Convert.ToInt32(res1).ToString("X8") + ", count=" + cnt1);

        Array devArr = Array.CreateInstance(devInfoType, 5);
        for (int i = 0; i < 5; i++) {
            object elem = Activator.CreateInstance(devInfoType);
            devInfoType.GetField("size").SetValue(elem, System.Runtime.InteropServices.Marshal.SizeOf(devInfoType));
            devArr.SetValue(elem, i);
        }

        object[] args2 = new object[] { 5, devArr };
        object res2 = qMi.Invoke(null, args2);
        int cnt2 = (int)args2[0];
        Console.WriteLine("dpfpdd_query_devices(5, devArr) result: 0x" + Convert.ToInt32(res2).ToString("X8") + ", count=" + cnt2);

        if (cnt2 > 0) {
            for (int i = 0; i < cnt2; i++) {
                object d = devArr.GetValue(i);
                byte[] nameBytes = (byte[])devInfoType.GetField("name").GetValue(d);
                string name = System.Text.Encoding.ASCII.GetString(nameBytes).TrimEnd('\0');
                Console.WriteLine("Device " + i + ": " + name);
            }
        }
    }
}
