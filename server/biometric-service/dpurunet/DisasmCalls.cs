using System;
using System.IO;

public class DisasmCalls {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        // Find import for FD_OpenDeviceManager
        // In ASCII, search for "FD_OpenDeviceManager"
        string str = System.Text.Encoding.ASCII.GetString(bytes);
        int idx = str.IndexOf("FD_OpenDeviceManager");
        Console.WriteLine("String index: 0x" + idx.ToString("X"));

        // Let's find PE import address table (IAT)
        int peOffset = BitConverter.ToInt32(bytes, 0x3C);
        int optOffset = peOffset + 24;
        int importDirRva = BitConverter.ToInt32(bytes, optOffset + 120);
        int importDirSize = BitConverter.ToInt32(bytes, optOffset + 124);
        int iatRva = BitConverter.ToInt32(bytes, optOffset + 216);
        Console.WriteLine("ImportDir RVA: 0x" + importDirRva.ToString("X") + ", IAT RVA: 0x" + iatRva.ToString("X"));

        // Let's find sections
        int numSec = BitConverter.ToInt16(bytes, peOffset + 6);
        int secTable = optOffset + BitConverter.ToInt16(bytes, peOffset + 20);
        int textVirt = 0, textRaw = 0, textSize = 0;
        for (int i = 0; i < numSec; i++) {
            int sOff = secTable + i * 40;
            string sName = System.Text.Encoding.ASCII.GetString(bytes, sOff, 8).Trim('\0');
            int vAddr = BitConverter.ToInt32(bytes, sOff + 12);
            int vSize = BitConverter.ToInt32(bytes, sOff + 8);
            int rOff = BitConverter.ToInt32(bytes, sOff + 20);
            int rSize = BitConverter.ToInt32(bytes, sOff + 16);
            Console.WriteLine("Section " + sName + ": Virt 0x" + vAddr.ToString("X") + ", Raw 0x" + rOff.ToString("X"));
            if (sName == ".text") {
                textVirt = vAddr; textRaw = rOff; textSize = rSize;
            }
        }
    }
}
