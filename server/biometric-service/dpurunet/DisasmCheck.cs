using System;
using System.IO;

public class DisasmCheck {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int start = 0x12D0;
        int len = 120;
        for (int i = 0; i < len; i++) {
            Console.Write(bytes[start + i].ToString("X2") + " ");
            if ((i + 1) % 16 == 0) Console.WriteLine();
        }
        Console.WriteLine();
    }
}
