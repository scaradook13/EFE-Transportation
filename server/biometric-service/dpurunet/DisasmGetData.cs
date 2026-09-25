using System;
using System.IO;

public class DisasmGetData {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"C:\Windows\System32\dpdevdatx64.dll");
        int peOffset = BitConverter.ToInt32(bytes, 0x3C);
        int optOffset = peOffset + 24;
        int exportDirRva = BitConverter.ToInt32(bytes, optOffset + 112);
        int numSec = BitConverter.ToInt16(bytes, peOffset + 6);
        int secTable = optOffset + BitConverter.ToInt16(bytes, peOffset + 20);
        int diff = 0, textDiff = 0;
        for (int i = 0; i < numSec; i++) {
            int sOff = secTable + i * 40;
            string sName = System.Text.Encoding.ASCII.GetString(bytes, sOff, 8).Trim('\0');
            int vAddr = BitConverter.ToInt32(bytes, sOff + 12);
            int vSize = BitConverter.ToInt32(bytes, sOff + 8);
            int rOff = BitConverter.ToInt32(bytes, sOff + 20);
            if (exportDirRva >= vAddr && exportDirRva < vAddr + vSize) diff = vAddr - rOff;
            if (sName == ".text") textDiff = vAddr - rOff;
        }

        int expRaw = exportDirRva - diff;
        int numNames = BitConverter.ToInt32(bytes, expRaw + 24);
        int funcRvaTable = BitConverter.ToInt32(bytes, expRaw + 28);
        int namesRva = BitConverter.ToInt32(bytes, expRaw + 32);
        int ordRva = BitConverter.ToInt32(bytes, expRaw + 36);

        for (int i = 0; i < numNames; i++) {
            int nRva = BitConverter.ToInt32(bytes, namesRva - diff + i * 4);
            string name = "";
            int nRaw = nRva - diff;
            while (bytes[nRaw] != 0) name += (char)bytes[nRaw++];
            short ord = BitConverter.ToInt16(bytes, ordRva - diff + i * 2);
            int fRva = BitConverter.ToInt32(bytes, funcRvaTable - diff + ord * 4);
            Console.WriteLine(name + " -> RVA 0x" + fRva.ToString("X"));

            if (name == "FD_GetData") {
                int fRaw = fRva - textDiff;
                Console.WriteLine("FD_GetData Raw: 0x" + fRaw.ToString("X"));
                for (int k = 0; k < 96; k++) {
                    Console.Write(bytes[fRaw + k].ToString("X2") + " ");
                    if ((k + 1) % 16 == 0) Console.WriteLine();
                }
                Console.WriteLine();
            }
        }
    }
}
