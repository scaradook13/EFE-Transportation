using System;
using System.IO;

public class DisasmGetDataTarget {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"C:\Windows\System32\dpdevdatx64.dll");
        int targetRaw = 0x9B40 - 0xC00;
        Console.WriteLine("Target at Raw 0x" + targetRaw.ToString("X"));
        for (int k = 0; k < 128; k++) {
            Console.Write(bytes[targetRaw + k].ToString("X2") + " ");
            if ((k + 1) % 16 == 0) Console.WriteLine();
        }
        Console.WriteLine();
    }
}
