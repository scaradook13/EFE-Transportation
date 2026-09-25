using System;
using System.IO;

public class DisasmOpenDev2 {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"C:\Windows\System32\dpdevctlx64.dll");
        int targetRaw = 0x14220;
        for (int k = 0; k < 80; k++) {
            Console.Write(bytes[targetRaw + k].ToString("X2") + " ");
            if ((k + 1) % 16 == 0) Console.WriteLine();
        }
        Console.WriteLine();
    }
}
