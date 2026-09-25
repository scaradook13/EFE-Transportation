using System;
using System.IO;

public class DisasmOpenDevFull {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"C:\Windows\System32\dpdevctlx64.dll");
        int targetRaw = 0x14200;
        // Dump 200 bytes
        for (int k = 0; k < 200; k++) {
            Console.Write(bytes[targetRaw + k].ToString("X2") + " ");
            if ((k + 1) % 16 == 0) Console.WriteLine();
        }
        Console.WriteLine();
    }
}
