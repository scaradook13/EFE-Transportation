using System;
using System.Runtime.InteropServices;

public class InspectDevMgrMemory {
    [DllImport("kernel32.dll")]
    public static extern IntPtr LoadLibrary(string name);

    [DllImport("server/biometric-service/dpurunet/dpfpdd_4k.dll", EntryPoint = "dpfpdd_init")]
    public static extern int dpfpdd_init();

    [DllImport("server/biometric-service/dpurunet/dpfpdd_4k.dll", EntryPoint = "dpfpdd_query_devices")]
    public static extern int dpfpdd_query_devices(ref uint count, IntPtr devInfos);

    public static void Main() {
        IntPtr hMod = LoadLibrary("server/biometric-service/dpurunet/dpfpdd_4k.dll");
        dpfpdd_init();
        uint cnt = 0;
        dpfpdd_query_devices(ref cnt, IntPtr.Zero);

        IntPtr pMgrPtr = new IntPtr(hMod.ToInt64() + 0x2F038);
        IntPtr pMgr = Marshal.ReadIntPtr(pMgrPtr);
        Console.WriteLine("pMgr: 0x" + pMgr.ToString("X"));

        if (pMgr != IntPtr.Zero) {
            IntPtr tablePtr = Marshal.ReadIntPtr(pMgr, 0x28);
            int tableCount = Marshal.ReadInt32(pMgr, 0x30);
            Console.WriteLine("tablePtr: 0x" + tablePtr.ToString("X") + ", tableCount: " + tableCount);

            if (tablePtr != IntPtr.Zero && tableCount > 0) {
                for (int i = 0; i < tableCount; i++) {
                    IntPtr entry = new IntPtr(tablePtr.ToInt64() + i * 0x48);
                    long id = Marshal.ReadInt64(entry, 0);
                    long id8 = Marshal.ReadInt64(entry, 8);
                    Console.WriteLine("Entry " + i + ": [0]=0x" + id.ToString("X16") + ", [8]=0x" + id8.ToString("X16"));
                }
            }
        }
    }
}