using System;
using System.IO;

public class DisasmLoadStores {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int rawStart = 0x13A0;
        int rawEnd = 0x1550;
        for (int i = rawStart; i < rawEnd; i++) {
            // Find mov [reg + disp], rax: 48 89 8... or 48 89 4... or 48 89 05
            if (bytes[i] == 0x48 && bytes[i+1] == 0x89) {
                Console.WriteLine("Store at Raw 0x" + i.ToString("X") + ": " + bytes[i+2].ToString("X2") + " " + bytes[i+3].ToString("X2") + " " + bytes[i+4].ToString("X2"));
            }
        }
    }
}
