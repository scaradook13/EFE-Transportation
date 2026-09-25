using System;
using System.IO;

public class DisasmHelperEnd {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int targetRaw = 0x2180 - 0xC00 + 0xB0;
        Console.WriteLine("HelperFunction tail at Raw 0x" + targetRaw.ToString("X"));
        for (int k = 0; k < 128; k++) {
            Console.Write(bytes[targetRaw + k].ToString("X2") + " ");
            if ((k + 1) % 16 == 0) Console.WriteLine();
        }
        Console.WriteLine();
    }
}
