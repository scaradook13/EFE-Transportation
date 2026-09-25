using System;
using System.IO;

public class Find11 {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"C:\Windows\System32\dpdevctlx64.dll");
        int targetRaw = 0x14200;
        // Search inside function 0x14200..0x14400 for 11 00 00 20
        for (int i = targetRaw; i < targetRaw + 500; i++) {
            if (bytes[i] == 0x11 && bytes[i+1] == 0x00 && bytes[i+2] == 0x00 && bytes[i+3] == 0x20) {
                Console.WriteLine("Found 0x20000011 at 0x" + i.ToString("X"));
            }
        }
    }
}
