using System;
using System.IO;

public class FindCall2180 {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int targetRva = 0x2180;
        int textVirt = 0x1000, textRaw = 0x400, textSize = 0x1D000;
        for (int i = textRaw; i < textRaw + textSize - 5; i++) {
            if (bytes[i] == 0xE8) {
                int rel = BitConverter.ToInt32(bytes, i + 1);
                int ripRva = (i - textRaw + textVirt) + 5;
                if (ripRva + rel == targetRva) {
                    Console.WriteLine("Called at Raw 0x" + i.ToString("X") + " (RVA 0x" + (i - textRaw + textVirt).ToString("X") + ")");
                }
            }
        }
    }
}
