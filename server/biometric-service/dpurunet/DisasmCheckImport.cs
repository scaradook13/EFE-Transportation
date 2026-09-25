using System;
using System.IO;

public class DisasmCheckImport {
    public static void Main() {
        byte[] bytes = File.ReadAllBytes(@"server\biometric-service\dpurunet\dpfpdd_4k.dll");
        int rdataVirt = 0x1E000;
        int rdataRaw = 0x1D400;
        int diff = rdataVirt - rdataRaw;
        int impRaw = 0x2B688 - diff;
        
        for (int i = 0; ; i++) {
            int descOff = impRaw + i * 20;
            int nameRva = BitConverter.ToInt32(bytes, descOff + 12);
            if (nameRva == 0) break;
            int firstThunkRva = BitConverter.ToInt32(bytes, descOff + 16);
            int origThunkRva = BitConverter.ToInt32(bytes, descOff + 0);
            if (origThunkRva == 0) origThunkRva = firstThunkRva;

            string modName = GetStr(bytes, nameRva - diff);
            int thunkOff = origThunkRva - diff;
            for (int t = 0; ; t++) {
                long fnData = BitConverter.ToInt64(bytes, thunkOff + t * 8);
                if (fnData == 0) break;
                int curThunkRva = firstThunkRva + t * 8;
                if ((fnData & unchecked((long)0x8000000000000000L)) == 0) {
                    int hintNameOff = (int)fnData - diff;
                    string fnName = GetStr(bytes, hintNameOff + 2);
                    if (curThunkRva == 0x1E388 || curThunkRva == 0x2D788 || Math.Abs(curThunkRva - 0x1E388) < 64) {
                        Console.WriteLine("Import at RVA 0x" + curThunkRva.ToString("X") + " in " + modName + ": " + fnName);
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
