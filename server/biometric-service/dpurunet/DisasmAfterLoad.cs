using System;
using System.IO;

public class DisasmAfterLoad {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int rawStart = 0x1500;
        int rawEnd = 0x1800;
        for (int i = rawStart; i < rawEnd; i++) {
            if (bytes[i] == 0xFF && (bytes[i+1] == 0x15 || (bytes[i+1] >= 0xD0 && bytes[i+1] <= 0xD7))) {
                Console.WriteLine("Call at Raw 0x" + i.ToString("X") + ": " + bytes[i].ToString("X2") + " " + bytes[i+1].ToString("X2"));
            }
        }
    }
}
