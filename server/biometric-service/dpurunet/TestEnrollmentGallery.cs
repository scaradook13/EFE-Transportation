using System;
using System.Collections.Generic;
using DPUruNet;

public class TestEnrollmentGallery {
    public static void Main() {
        // Test with empty or dummy
        List<Fmd> list = new List<Fmd>();
        var res = Enrollment.CreateEnrollmentFmd(Constants.Formats.Fmd.ANSI, list);
        Console.WriteLine("Empty gallery res: " + res.ResultCode);
    }
}
