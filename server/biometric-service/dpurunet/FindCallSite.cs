using System;
using System.IO;

public class FindCallSite {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int targetVarRva = 0x2D990;
        Console.WriteLine("Variable RVA: 0x" + targetVarRva.ToString("X"));

        int textVirt = 0x1000, textRaw = 0x400, textSize = 0x1D000;
        for (int i = textRaw; i < textRaw + textSize - 7; i++) {
            // Looking for call qword ptr [rip + disp] (FF 15) or mov rax, [rip + disp] (48 8B 05)
            if (bytes[i] == 0x48 && bytes[i + 1] == 0x8B && bytes[i + 2] == 0x05) {
                int disp = BitConverter.ToInt32(bytes, i + 3);
                int ripRva = (i - textRaw + textVirt) + 7;
                if (ripRva + disp == targetVarRva) {
                    Console.WriteLine("Loaded at Raw 0x" + i.ToString("X") + " (RVA 0x" + (i - textRaw + textVirt).ToString("X") + ")");
                    for (int k = i - 16; k < i + 48; k++) Console.Write(bytes[k].ToString("X2") + " ");
                    Console.WriteLine();
                }
            } else if (bytes[i] == 0xFF && bytes[i + 1] == 0x15) {
                int disp = BitConverter.ToInt32(bytes, i + 2);
                int ripRva = (i - textRaw + textVirt) + 6;
                if (ripRva + disp == targetVarRva) {
                    Console.WriteLine("Called directly at Raw 0x" + i.ToString("X") + " (RVA 0x" + (i - textRaw + textVirt).ToString("X") + ")");
                    for (int k = i - 16; k < i + 48; k++) Console.Write(bytes[k].ToString("X2") + " ");
                    Console.WriteLine();
                }
            }
        }
    }
}

