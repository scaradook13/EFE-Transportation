using System;
using System.IO;

public class DisasmExport {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"C:\Windows\System32\dpdevctlx64.dll");
        int peOffset = BitConverter.ToInt32(bytes, 0x3C);
        int optHeaderOffset = peOffset + 4 + 20;
        int exportDirRva = BitConverter.ToInt32(bytes, optHeaderOffset + 112);
        int numSections = BitConverter.ToInt16(bytes, peOffset + 6);
        int secHeaderOffset = optHeaderOffset + BitConverter.ToInt16(bytes, peOffset + 20);
        int exportOffset = 0;
        int virtDiff = 0;
        for (int i = 0; i < numSections; i++) {
            int secOffset = secHeaderOffset + i * 40;
            int virtAddr = BitConverter.ToInt32(bytes, secOffset + 12);
            int virtSize = BitConverter.ToInt32(bytes, secOffset + 8);
            int rawOffset = BitConverter.ToInt32(bytes, secOffset + 20);
            if (exportDirRva >= virtAddr && exportDirRva < virtAddr + virtSize) {
                exportOffset = rawOffset + (exportDirRva - virtAddr);
                virtDiff = virtAddr - rawOffset;
                break;
            }
        }
        int numNames = BitConverter.ToInt32(bytes, exportOffset + 24);
        int funcRvaTable = BitConverter.ToInt32(bytes, exportOffset + 28);
        int namesRva = BitConverter.ToInt32(bytes, exportOffset + 32);
        int ordRva = BitConverter.ToInt32(bytes, exportOffset + 36);

        int namesOffset = namesRva - virtDiff;
        int ordOffset = ordRva - virtDiff;
        int funcOffset = funcRvaTable - virtDiff;

        for (int i = 0; i < numNames; i++) {
            int nRva = BitConverter.ToInt32(bytes, namesOffset + i * 4);
            int nOff = nRva - virtDiff;
            string name = "";
            while (bytes[nOff] != 0) name += (char)bytes[nOff++];
            
            short ord = BitConverter.ToInt16(bytes, ordOffset + i * 2);
            int fRva = BitConverter.ToInt32(bytes, funcOffset + ord * 4);
            int fOff = fRva - virtDiff;
            Console.WriteLine(name + " -> RVA: 0x" + fRva.ToString("X8") + ", Raw: 0x" + fOff.ToString("X8"));
            
            // Print first 32 bytes of function
            Console.Write("    Bytes: ");
            for (int b = 0; b < 24; b++) Console.Write(bytes[fOff + b].ToString("X2") + " ");
            Console.WriteLine();
        }
    }
}
