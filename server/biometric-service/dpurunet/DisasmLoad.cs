using System;
using System.IO;

public class DisasmLoad {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int strRva = 0x25900; // in .rdata (virt 0x1E000, raw 0x1D400 -> RVA = 0x25900 - 0x1D400 + 0x1E000 = 0x26500)
        // Wait, what is string raw offset? In previous output it was at 0x25928 in file.
        int strRaw = 0x25928;
        int strVirt = strRaw - 0x1D400 + 0x1E000;
        Console.WriteLine("String 'dpDevCtlx64.dll' Raw: 0x" + strRaw.ToString("X") + ", RVA: 0x" + strVirt.ToString("X"));

        // Scan .text for lea rdx, [rip + disp32] or similar referencing strVirt
        int textVirt = 0x1000, textRaw = 0x400, textSize = 0x1D000;
        for (int i = textRaw; i < textRaw + textSize - 7; i++) {
            // Check 4-byte displacement
            for (int opLen = 5; opLen <= 7; opLen++) {
                int disp = BitConverter.ToInt32(bytes, i + opLen - 4);
                int ripRva = (i - textRaw + textVirt) + opLen;
                if (ripRva + disp == strVirt) {
                    Console.WriteLine("Referenced at Raw 0x" + i.ToString("X") + " (RVA 0x" + (i - textRaw + textVirt).ToString("X") + ")");
                    // Print surrounding instructions
                    for (int k = i - 16; k < i + 64; k++) {
                        Console.Write(bytes[k].ToString("X2") + " ");
                    }
                    Console.WriteLine();
                }
            }
        }
    }
}
