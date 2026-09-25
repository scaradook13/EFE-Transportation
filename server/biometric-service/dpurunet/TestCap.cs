using System;
using DPUruNet;

public class TestCap {
    public static void Main() {
        ReaderCollection readers = ReaderCollection.GetReaders();
        Reader r = readers[0];
        r.Open(Constants.CapturePriority.DP_PRIORITY_COOPERATIVE);
        Console.WriteLine("Reader: " + r.Description.Name);
        Console.WriteLine("Can Capture: " + r.Capabilities.CanCapture);
        Console.WriteLine("Can Stream: " + r.Capabilities.CanStream);
        Console.WriteLine("Resolutions count: " + r.Capabilities.Resolutions.Length);
        foreach (int res in r.Capabilities.Resolutions) {
            Console.WriteLine("Resolution: " + res + " dpi");
        }
        r.Dispose();
    }
}
