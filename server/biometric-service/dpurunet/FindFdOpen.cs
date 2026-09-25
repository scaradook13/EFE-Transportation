using System;
using System.IO;

public class FindFdOpen {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int strVirt = 0x265A0; // RVA of "FD_OpenDeviceManager"
        int textVirt = 0x1000, textRaw = 0x400, textSize = 0x1D000;
        for (int i = textRaw; i < textRaw + textSize - 7; i++) {
            for (int opLen = 5; opLen <= 7; opLen++) {
                int disp = BitConverter.ToInt32(bytes, i + opLen - 4);
                int ripRva = (i - textRaw + textVirt) + opLen;
                if (ripRva + disp == strVirt) {
                    Console.WriteLine("String referenced at Raw 0x" + i.ToString("X") + " (RVA 0x" + (i - textRaw + textVirt).ToString("X") + ")");
                    // Print surrounding 64 bytes
                    for (int k = i; k < i + 64; k++) {
                        Console.Write(bytes[k].ToString("X2") + " ");
                    }
                    Console.WriteLine();
                }
            }
        }
    }
}
