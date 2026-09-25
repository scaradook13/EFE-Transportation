using System;
using System.IO;

public class Disasm2750 {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int rawStart = 0x1B50;
        int rawEnd = 0x1C60;
        for (int i = rawStart; i < rawEnd; i++) {
            // Find calls: FF 15 or FF D0..D7 or E8
            if (bytes[i] == 0xFF && (bytes[i+1] == 0x15 || (bytes[i+1] >= 0xD0 && bytes[i+1] <= 0xD7))) {
                Console.WriteLine("Call at Raw 0x" + i.ToString("X") + " (RVA 0x" + (i + 0xC00).ToString("X") + "): " + bytes[i].ToString("X2") + " " + bytes[i+1].ToString("X2"));
                for (int k = i - 20; k < i + 10; k++) Console.Write(bytes[k].ToString("X2") + " ");
                Console.WriteLine();
            }
        }
    }
}
