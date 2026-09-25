using System;
using System.IO;

public class DisasmBefore15A0 {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int rawStart = 0x1500;
        int rawEnd = 0x15A0;
        for (int i = rawStart; i < rawEnd; i++) {
            Console.Write(bytes[i].ToString("X2") + " ");
            if ((i - rawStart + 1) % 16 == 0) Console.WriteLine();
        }
        Console.WriteLine();
    }
}
