using System;
using System.IO;

public class FindWritesTo60 {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int textDiff = 0xC00;
        int textVirt = 0x1000, textRaw = 0x400, textSize = 0x1D000;
        for (int i = textRaw; i < textRaw + textSize - 4; i++) {
            // mov [reg + 60h], ... (48 89 ... 60 or 89 ... 60)
            if ((bytes[i] == 0x48 && bytes[i + 1] == 0x89 && bytes[i + 3] == 0x60) ||
                (bytes[i] == 0x89 && bytes[i + 2] == 0x60) ||
                (bytes[i] == 0x4C && bytes[i + 1] == 0x89 && bytes[i + 3] == 0x60)) {
                Console.WriteLine("Write at Raw 0x" + i.ToString("X") + " (RVA 0x" + (i - textRaw + textVirt).ToString("X") + ")");
                int start = Math.Max(textRaw, i - 16);
                for (int k = start; k < i + 32; k++) Console.Write(bytes[k].ToString("X2") + " ");
                Console.WriteLine();
            }
        }
    }
}
