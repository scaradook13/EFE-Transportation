using System;
using System.IO;

public class DisasmHelper2180 {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int targetRaw = 0x2180 - 0xC00;
        Console.WriteLine("HelperFunction at Raw 0x" + targetRaw.ToString("X"));
        for (int k = 0; k < 256; k++) {
            Console.Write(bytes[targetRaw + k].ToString("X2") + " ");
            if ((k + 1) % 16 == 0) Console.WriteLine();
        }
        Console.WriteLine();
    }
}
