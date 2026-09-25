using System;
using System.IO;

public class DisasmBlock {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int rawStart = 0x1BC8;
        int rawEnd = 0x1C60;
        for (int i = rawStart; i < rawEnd; i++) {
            Console.Write(bytes[i].ToString("X2") + " ");
            if ((i - rawStart + 1) % 16 == 0) Console.WriteLine();
        }
        Console.WriteLine();
    }
}
