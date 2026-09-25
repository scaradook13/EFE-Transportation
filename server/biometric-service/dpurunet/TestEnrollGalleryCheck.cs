using System;
using System.Collections.Generic;
using DPUruNet;

public class TestEnrollGalleryCheck {
    public static void Main() {
        // Let's create dummy ANSI Fmd using FeatureExtraction or raw bytes
        // Or check method signature
        Type t = typeof(Enrollment);
        foreach (var m in t.GetMethods()) {
            Console.WriteLine(m.Name + ": " + m.ReturnType);
        }
    }
}
