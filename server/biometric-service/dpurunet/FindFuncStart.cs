using System;
using System.IO;

public class FindFuncStart {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int target = 0x1C70;
        // Search backwards for typical function prologues: 48 89 or 40 55 or 48 83 ec or 48 81 ec
        for (int i = target; i > 0x1500; i--) {
            if ((bytes[i] == 0x48 && bytes[i+1] == 0x89 && bytes[i+2] == 0x5C && bytes[i+3] == 0x24) ||
                (bytes[i] == 0x40 && (bytes[i+1] == 0x53 || bytes[i+1] == 0x55 || bytes[i+1] == 0x56 || bytes[i+1] == 0x57)) ||
                (bytes[i] == 0x48 && bytes[i+1] == 0x83 && bytes[i+2] == 0xEC) ||
                (bytes[i] == 0x48 && bytes[i+1] == 0x81 && bytes[i+2] == 0xEC)) {
                // Check if preceded by CC or C3
                if (bytes[i-1] == 0xCC || bytes[i-1] == 0xC3 || bytes[i-1] == 0x90) {
                    Console.WriteLine("Function start at Raw 0x" + i.ToString("X") + " (RVA 0x" + (i + 0xC00).ToString("X") + ")");
                    // Print first 48 bytes
                    for (int k = 0; k < 48; k++) Console.Write(bytes[i + k].ToString("X2") + " ");
                    Console.WriteLine();
                    break;
                }
            }
        }
    }
}
