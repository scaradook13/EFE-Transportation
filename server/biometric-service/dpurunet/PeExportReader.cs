using System;
using System.IO;
using System.Runtime.InteropServices;

public class PeExportReader {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"C:\Windows\System32\dpD00701x64.dll");
        int peOffset = BitConverter.ToInt32(bytes, 0x3C);
        int optHeaderOffset = peOffset + 4 + 20;
        // In PE32+, DataDirectory is at optHeaderOffset + 112
        int exportDirRva = BitConverter.ToInt32(bytes, optHeaderOffset + 112);
        int exportDirSize = BitConverter.ToInt32(bytes, optHeaderOffset + 116);
        Console.WriteLine("ExportDir RVA: 0x" + exportDirRva.ToString("X8") + ", Size: " + exportDirSize);

        // Find section containing exportDirRva
        int numSections = BitConverter.ToInt16(bytes, peOffset + 6);
        int secHeaderOffset = optHeaderOffset + BitConverter.ToInt16(bytes, peOffset + 20);
        int exportOffset = 0;
        for (int i = 0; i < numSections; i++) {
            int secOffset = secHeaderOffset + i * 40;
            int virtAddr = BitConverter.ToInt32(bytes, secOffset + 12);
            int virtSize = BitConverter.ToInt32(bytes, secOffset + 8);
            int rawOffset = BitConverter.ToInt32(bytes, secOffset + 20);
            if (exportDirRva >= virtAddr && exportDirRva < virtAddr + virtSize) {
                exportOffset = rawOffset + (exportDirRva - virtAddr);
                break;
            }
        }
        Console.WriteLine("ExportDir Raw Offset: 0x" + exportOffset.ToString("X8"));
        if (exportOffset == 0) return;

        int numNames = BitConverter.ToInt32(bytes, exportOffset + 24);
        int namesRva = BitConverter.ToInt32(bytes, exportOffset + 32);
        int namesOffset = exportOffset + (namesRva - exportDirRva);

        Console.WriteLine("Number of exported names: " + numNames);
        for (int i = 0; i < numNames; i++) {
            int nameRva = BitConverter.ToInt32(bytes, namesOffset + i * 4);
            int nameOffset = exportOffset + (nameRva - exportDirRva);
            string name = "";
            while (bytes[nameOffset] != 0) {
                name += (char)bytes[nameOffset++];
            }
            Console.WriteLine("Export: " + name);
        }
    }
}


