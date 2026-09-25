using System;
using System.IO;

public class FindCaller {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int rdataVirt = 0x1E000;
        int rdataRaw = 0x1D400;
        int diff = rdataVirt - rdataRaw;

        // ImportDir is at 0x2B688 RVA -> raw = 0x2B688 - diff
        int impRaw = 0x2B688 - diff;
        
        // Loop import descriptors
        int iatThunkRva = 0;
        for (int i = 0; ; i++) {
            int descOff = impRaw + i * 20;
            int nameRva = BitConverter.ToInt32(bytes, descOff + 12);
            if (nameRva == 0) break;
            int firstThunkRva = BitConverter.ToInt32(bytes, descOff + 16);
            int origThunkRva = BitConverter.ToInt32(bytes, descOff + 0);
            if (origThunkRva == 0) origThunkRva = firstThunkRva;

            string modName = GetStr(bytes, nameRva - diff);
            // Console.WriteLine("Module: " + modName);
            if (modName.ToLower().Contains("dpdevctl")) {
                int thunkOff = origThunkRva - diff;
                int actualIatRva = firstThunkRva;
                for (int t = 0; ; t++) {
                    long fnData = BitConverter.ToInt64(bytes, thunkOff + t * 8);
                    if (fnData == 0) break;
                    if ((fnData & unchecked((long)0x8000000000000000L)) == 0) {
                        int hintNameOff = (int)fnData - diff;
                        string fnName = GetStr(bytes, hintNameOff + 2);
                        if (fnName == "FD_OpenDeviceManager") {
                            iatThunkRva = actualIatRva + t * 8;
                            Console.WriteLine("FD_OpenDeviceManager IAT entry at RVA 0x" + iatThunkRva.ToString("X"));
                        }
                    }
                }
            }
        }

        if (iatThunkRva != 0) {
            // Find references to iatThunkRva in .text section (Virt 0x1000, Raw 0x400, Size 0x1D400)
            int textVirt = 0x1000, textRaw = 0x400, textSize = 0x1D000;
            for (int off = textRaw; off < textRaw + textSize - 6; off++) {
                // In x64, call [rip + disp32] is FF 15 disp32
                // or jmp [rip + disp32] is FF 25 disp32
                if (bytes[off] == 0xFF && (bytes[off + 1] == 0x15 || bytes[off + 1] == 0x25)) {
                    int disp = BitConverter.ToInt32(bytes, off + 2);
                    int currentRipRva = (off - textRaw + textVirt) + 6;
                    int targetRva = currentRipRva + disp;
                    if (targetRva == iatThunkRva) {
                        Console.WriteLine("Call at Raw 0x" + off.ToString("X") + " (RVA 0x" + (off - textRaw + textVirt).ToString("X") + ")");
                        // Dump preceding 32 bytes and following 16 bytes
                        for (int k = off - 24; k < off + 16; k++) {
                            Console.Write(bytes[k].ToString("X2") + " ");
                        }
                        Console.WriteLine();
                    }
                }
            }
        }
    }

    static string GetStr(byte[] b, int off) {
        string s = "";
        while (b[off] != 0) s += (char)b[off++];
        return s;
    }
}

