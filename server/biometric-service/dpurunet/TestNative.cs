using System;
using DPUruNet;

class Program {
    static void Main() {
        try {
            Console.WriteLine("Getting readers from DPUruNet...");
            ReaderCollection readers = ReaderCollection.GetReaders();
            Console.WriteLine("Count = " + readers.Count);
            foreach (Reader r in readers) {
                Console.WriteLine("Found reader: " + r.Description.Name);
                Console.WriteLine("Serial: " + r.Description.SerialNumber);
                Constants.ResultCode openRes = r.Open(Constants.CapturePriority.DP_PRIORITY_COOPERATIVE);
                Console.WriteLine("Open result: " + openRes);
                if (openRes == Constants.ResultCode.DP_SUCCESS) {
                    Console.WriteLine("SUCCESSFULLY OPENED READER!");
                    r.Dispose();
                }
            }
        } catch (Exception ex) {
            Console.WriteLine("Exception: " + ex);
        }
    }
}
