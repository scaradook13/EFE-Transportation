using System;
using System.IO;

public class DisasmLoadFunc {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        // Print RVA 0x1E00 to 0x2100 (Raw 0x1200 to 0x1500)
        int rawStart = 0x1200;
        int rawEnd = 0x1500;
        Console.WriteLine("Bytes from 0x" + rawStart.ToString("X") + " to 0x" + rawEnd.ToString("X") + ":");
        // Scan for call [m_pfn...]
        for (int i = rawStart; i < rawEnd; i++) {
            // Find any call rax or call [rip+...] or call reg
            if (bytes[i] == 0xFF && (bytes[i+1] == 0x15 || bytes[i+1] == 0xD0 || bytes[i+1] == 0xD1 || bytes[i+1] == 0xD2 || bytes[i+1] == 0xD3)) {
                Console.WriteLine("Call at Raw 0x" + i.ToString("X") + ": " + bytes[i].ToString("X2") + " " + bytes[i+1].ToString("X2"));
            }
        }
    }
}
