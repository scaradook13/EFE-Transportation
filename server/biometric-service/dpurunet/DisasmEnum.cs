using System;
using System.IO;

public class DisasmEnum {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int textDiff = 0xC00;
        int targetRva = 0x4BD0;
        int targetRaw = targetRva - textDiff;
        Console.WriteLine("Target Raw: 0x" + targetRaw.ToString("X"));
        for (int k = 0; k < 128; k++) {
            Console.Write(bytes[targetRaw + k].ToString("X2") + " ");
            if ((k + 1) % 16 == 0) Console.WriteLine();
        }
        Console.WriteLine();
    }
}
