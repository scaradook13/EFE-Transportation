using System;
using System.IO;

public class DisasmTarget {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"C:\Windows\System32\dpdevctlx64.dll");
        // In dpDevCtlx64.dll, what are the section offsets?
        int peOffset = BitConverter.ToInt32(bytes, 0x3C);
        int optOffset = peOffset + 24;
        int numSec = BitConverter.ToInt16(bytes, peOffset + 6);
        int secTable = optOffset + BitConverter.ToInt16(bytes, peOffset + 20);
        int textVirt = 0, textRaw = 0, diff = 0;
        for (int i = 0; i < numSec; i++) {
            int sOff = secTable + i * 40;
            string sName = System.Text.Encoding.ASCII.GetString(bytes, sOff, 8).Trim('\0');
            int vAddr = BitConverter.ToInt32(bytes, sOff + 12);
            int rOff = BitConverter.ToInt32(bytes, sOff + 20);
            if (sName == ".text") {
                textVirt = vAddr; textRaw = rOff; diff = vAddr - rOff;
            }
        }
        Console.WriteLine(".text Virt: 0x" + textVirt.ToString("X") + ", Raw: 0x" + textRaw.ToString("X") + ", Diff: 0x" + diff.ToString("X"));

        // RVA of FD_OpenDeviceManager is 0x347C
        int stubRaw = 0x347C - diff;
        Console.WriteLine("FD_OpenDeviceManager stub Raw: 0x" + stubRaw.ToString("X"));
        // Print 32 bytes from stub
        for (int k = 0; k < 32; k++) Console.Write(bytes[stubRaw + k].ToString("X2") + " ");
        Console.WriteLine();

        if (bytes[stubRaw] == 0xE9) {
            int rel = BitConverter.ToInt32(bytes, stubRaw + 1);
            int targetRva = 0x347C + 5 + rel;
            int targetRaw = targetRva - diff;
            Console.WriteLine("Target RVA: 0x" + targetRva.ToString("X") + ", Target Raw: 0x" + targetRaw.ToString("X"));
            for (int k = 0; k < 80; k++) {
                Console.Write(bytes[targetRaw + k].ToString("X2") + " ");
                if ((k + 1) % 16 == 0) Console.WriteLine();
            }
            Console.WriteLine();
        }
    }
}
