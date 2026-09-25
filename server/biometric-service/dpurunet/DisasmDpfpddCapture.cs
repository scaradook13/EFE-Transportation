using System;
using System.IO;

public class DisasmDpfpddCapture {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int targetRaw = 0x17C0 - 0xC00;
        Console.WriteLine("dpfpdd_capture at Raw 0x" + targetRaw.ToString("X"));
        for (int k = 0; k < 128; k++) {
            Console.Write(bytes[targetRaw + k].ToString("X2") + " ");
            if ((k + 1) % 16 == 0) Console.WriteLine();
        }
        Console.WriteLine();
    }
}
