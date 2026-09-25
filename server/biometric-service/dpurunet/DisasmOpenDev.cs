using System;
using System.IO;

public class DisasmOpenDev {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"C:\Windows\System32\dpdevctlx64.dll");
        int textDiff = 0xC00;
        // FD_OpenDevice -> RVA: 0x00001A37
        int stubRaw = 0x1A37 - textDiff;
        Console.WriteLine("Stub Raw: 0x" + stubRaw.ToString("X"));
        for (int k = 0; k < 16; k++) Console.Write(bytes[stubRaw + k].ToString("X2") + " ");
        Console.WriteLine();

        if (bytes[stubRaw] == 0xE9) {
            int rel = BitConverter.ToInt32(bytes, stubRaw + 1);
            int targetRva = 0x1A37 + 5 + rel;
            int targetRaw = targetRva - textDiff;
            Console.WriteLine("Target RVA: 0x" + targetRva.ToString("X") + ", Raw: 0x" + targetRaw.ToString("X"));
            for (int k = 0; k < 64; k++) {
                Console.Write(bytes[targetRaw + k].ToString("X2") + " ");
                if ((k + 1) % 16 == 0) Console.WriteLine();
            }
            Console.WriteLine();
        }
    }
}
