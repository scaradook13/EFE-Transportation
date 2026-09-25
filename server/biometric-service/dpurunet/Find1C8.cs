using System;
using System.IO;

public class Find1C8 {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int targetRaw = 0x2750 - 0xC00;
        // Search inside function 0x1B50..0x1D00 for C8 01 00 00
        for (int i = targetRaw; i < targetRaw + 500; i++) {
            if (bytes[i] == 0xC8 && bytes[i+1] == 0x01 && bytes[i+2] == 0x00 && bytes[i+3] == 0x00) {
                Console.WriteLine("Found 1C8 at 0x" + i.ToString("X"));
                for (int k = i - 16; k < i + 16; k++) Console.Write(bytes[k].ToString("X2") + " ");
                Console.WriteLine();
            }
        }
    }
}
