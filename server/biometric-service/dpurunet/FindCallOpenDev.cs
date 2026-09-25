using System;
using System.IO;

public class FindCallOpenDev {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int targetRaw = 0x4260;
        for (int i = targetRaw; i < targetRaw + 500; i++) {
            if (bytes[i] == 0xFF && (bytes[i+1] == 0x56 || bytes[i+1] == 0x55 || bytes[i+1] == 0x57 || bytes[i+1] == 0x50)) {
                Console.WriteLine("Indirect call at Raw 0x" + i.ToString("X") + ": " + bytes[i].ToString("X2") + " " + bytes[i+1].ToString("X2") + " " + bytes[i+2].ToString("X2"));
                for (int k = i - 20; k < i + 10; k++) Console.Write(bytes[k].ToString("X2") + " ");
                Console.WriteLine();
            }
        }
    }
}
