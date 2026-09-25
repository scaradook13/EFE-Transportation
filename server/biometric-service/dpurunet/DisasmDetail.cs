using System;
using System.IO;

public class DisasmDetail {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"C:\Windows\System32\dpdevctlx64.dll");
        // Function RVAs: FD_OpenDeviceManager (0x347C -> Raw 0x227C), FD_EnumerateDevice (0x3C83 -> Raw 0x2A83)
        // Note: The jump table stub at 0x227C jumps: E9 7E C0 00 00 -> offset = 0x227C + 5 + 0xC07E = 0xE2FF
        DumpFunc("FD_OpenDeviceManager", bytes, 0x227C);
        DumpFunc("FD_EnumerateDevice", bytes, 0x2A83);
    }

    static void DumpFunc(string name, byte[] bytes, int rawOffset) {
        Console.WriteLine("=== " + name + " (stub at 0x" + rawOffset.ToString("X") + ") ===");
        if (bytes[rawOffset] == 0xE9) {
            int jmpRel = BitConverter.ToInt32(bytes, rawOffset + 1);
            int target = rawOffset + 5 + jmpRel;
            Console.WriteLine("Jumps to target: 0x" + target.ToString("X"));
            for (int i = 0; i < 48; i++) {
                Console.Write(bytes[target + i].ToString("X2") + " ");
                if ((i + 1) % 16 == 0) Console.WriteLine();
            }
            Console.WriteLine();
        }
    }
}
