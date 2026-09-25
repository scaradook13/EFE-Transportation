using System;
using DPUruNet;

public class TestLiveCapture {
    public static void Main() {
        ReaderCollection readers = ReaderCollection.GetReaders();
        if (readers.Count == 0) {
            Console.WriteLine("No readers found");
            return;
        }

        Reader r = readers[0];
        Constants.ResultCode openRes = r.Open(Constants.CapturePriority.DP_PRIORITY_COOPERATIVE);
        Console.WriteLine("Reader Open: " + openRes);

        Console.WriteLine("Testing Capture with 3-second timeout (do not touch yet)...");
        CaptureResult cr = r.Capture(Constants.Formats.Fid.ANSI, Constants.CaptureProcessing.DP_IMG_PROC_DEFAULT, 3000, 500);
        Console.WriteLine("Capture ResultCode: " + cr.ResultCode);
        Console.WriteLine("Capture Quality:    " + cr.Quality);
        Console.WriteLine("Capture Data null:  " + (cr.Data == null));

        r.Dispose();
        Console.WriteLine("Done.");
    }
}
