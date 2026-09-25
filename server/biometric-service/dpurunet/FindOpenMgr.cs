using System;
using System.IO;

public class FindOpenMgr {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int textVirt = 0x1000, textRaw = 0x400, textSize = 0x1D000;
        for (int i = textRaw; i < textRaw + textSize - 4; i++) {
            // Looking for call [reg + 50h] -> 41 FF 56 50 or FF 50 50 or 41 FF 5...
            if (bytes[i] == 0xFF && bytes[i+2] == 0x50) {
                Console.WriteLine("Possible call at Raw 0x" + i.ToString("X") + " (RVA 0x" + (i - textRaw + textVirt).ToString("X") + "): " + bytes[i].ToString("X2") + " " + bytes[i+1].ToString("X2") + " " + bytes[i+2].ToString("X2"));
                for (int k = i - 24; k < i + 16; k++) Console.Write(bytes[k].ToString("X2") + " ");
                Console.WriteLine();
            }
        }
    }
}
