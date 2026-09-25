using System;
using System.IO;

public class FindAnyRef {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int targetRva = 0x2D990;
        int textVirt = 0x1000, textRaw = 0x400, textSize = 0x1D000;
        for (int i = textRaw; i < textRaw + textSize - 4; i++) {
            int val = BitConverter.ToInt32(bytes, i);
            int ripRva = (i - textRaw + textVirt) + 4;
            if (ripRva + val == targetRva) {
                Console.WriteLine("Ref at Raw 0x" + i.ToString("X") + " (RVA 0x" + (i - textRaw + textVirt).ToString("X") + ")");
                int start = Math.Max(textRaw, i - 16);
                for (int k = start; k < i + 32; k++) Console.Write(bytes[k].ToString("X2") + " ");
                Console.WriteLine();
            }
        }
    }
}
