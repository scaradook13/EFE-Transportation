using System;
using DPUruNet;

public class TestDP {
    public static void Main() {
        try {
            Console.WriteLine("Querying readers with DPUruNet...");
            ReaderCollection readers = ReaderCollection.GetReaders();
            Console.WriteLine("Readers count: " + readers.Count);
            foreach (Reader r in readers) {
                Console.WriteLine("Reader Name: " + r.Description.Name);
                Console.WriteLine("Reader Serial: " + r.Description.SerialNumber);
                Console.WriteLine("Reader Modality: " + r.Description.Modality);
                Console.WriteLine("Reader Tech: " + r.Description.Technology);
                
                Constants.ResultCode openRes = r.Open(Constants.CapturePriority.DP_PRIORITY_COOPERATIVE);
                Console.WriteLine("Reader Open result: " + openRes);
                if (openRes == Constants.ResultCode.DP_SUCCESS) {
                    Console.WriteLine("Reader opened successfully!");
                    r.GetStatus();
                    Console.WriteLine("Status: " + r.Status.Status);
                    r.Dispose();
                    Console.WriteLine("Reader disposed cleanly.");
                }
            }
        } catch (Exception ex) {
            Console.WriteLine("Error: " + ex.ToString());
        }
    }
}
