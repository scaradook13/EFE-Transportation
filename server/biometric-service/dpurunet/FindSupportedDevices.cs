using System;
using System.IO;

public class FindSupportedDevices {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        // Search .data and .rdata for 0x05BA (BA 05)
        for (int i = 0; i < bytes.Length - 8; i++) {
            if (bytes[i] == 0xBA && bytes[i+1] == 0x05) {
                // Print 32 bytes around here
                Console.WriteLine("0x05BA found at 0x" + i.ToString("X"));
                int start = Math.Max(0, i - 4);
                for (int k = start; k < start + 24; k++) Console.Write(bytes[k].ToString("X2") + " ");
                Console.WriteLine();
            }
        }
    }
}
