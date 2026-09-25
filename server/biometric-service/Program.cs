using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Collections.Generic;
using System.Web.Script.Serialization;
using DPUruNet;

namespace DigitalPersonaBiometricService
{
    public class Program
    {
        private const int PORT = 52181;
        private static HttpListener _listener;
        private static bool _running = true;

        // Synchronization and state
        private static readonly object _syncLock = new object();
        private static volatile Reader _activeReader = null;
        private static List<Fmd> _enrollGallery = new List<Fmd>();
        private static int _enrollScanCount = 0;
        private const int REQUIRED_SCANS = 3;
        private const int FAR_THRESHOLD = 0x7FFFFFFF / 100000; // 1 in 100,000 FAR (21474)

        public static void Main(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            Console.WriteLine("============================================================");
            Console.WriteLine("  EFE Transportation — HID DigitalPersona Biometric Service ");
            Console.WriteLine("  Official Non-WBF Driver & DPUruNet Native Engine Active   ");
            Console.WriteLine("============================================================");

            int port = PORT;
            int customPort;
            if (args.Length > 0 && int.TryParse(args[0], out customPort))
            {
                port = customPort;
            }

            // Test reader detection on startup
            try
            {
                ReaderCollection readers = ReaderCollection.GetReaders();
                Console.WriteLine("[BiometricService] Initializing reader detection: {0} reader(s) found", readers.Count);
                foreach (Reader r in readers)
                {
                    Console.WriteLine("[BiometricService] Connected Reader: {0} ({1})", r.Description.Name, r.Description.SerialNumber);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("[BiometricService] Reader init warning: {0}", ex.Message);
            }

            StartServer(port);
        }

        private static void StartServer(int port)
        {
            try
            {
                _listener = new HttpListener();
                _listener.Prefixes.Add(string.Format("http://127.0.0.1:{0}/", port));
                _listener.Prefixes.Add(string.Format("http://localhost:{0}/", port));
                _listener.Start();
                Console.WriteLine("[BiometricService] HTTP Bridge listening on http://127.0.0.1:{0}/", port);

                while (_running)
                {
                    try
                    {
                        var context = _listener.GetContext();
                        ThreadPool.QueueUserWorkItem(ProcessRequest, context);
                    }
                    catch (HttpListenerException)
                    {
                        if (!_running) break;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("[BiometricService] Fatal listener error: " + ex.Message);
            }
        }

        private static void ProcessRequest(object state)
        {
            var context = (HttpListenerContext)state;
            var request = context.Request;
            var response = context.Response;

            // CORS headers
            response.Headers.Add("Access-Control-Allow-Origin", "*");
            response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
            response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization");

            if (request.HttpMethod == "OPTIONS")
            {
                response.StatusCode = 200;
                response.Close();
                return;
            }

            string rawPath = request.Url.AbsolutePath.TrimEnd('/');
            string path = rawPath.ToLowerInvariant();
            string method = request.HttpMethod.ToUpperInvariant();

            Console.WriteLine("[BiometricService] {0} {1}", method, path);

            string jsonResponse = "{}";
            int statusCode = 200;

            try
            {
                if (method == "GET" && (path == "" || path == "/status" || path == "/reader"))
                {
                    jsonResponse = GetReaderStatus();
                }
                else if (method == "POST" && path == "/enroll/start")
                {
                    jsonResponse = StartEnrollment();
                }
                else if (method == "POST" && path == "/enroll/capture")
                {
                    jsonResponse = CaptureEnrollSample();
                }
                else if ((method == "POST" || method == "GET") && (path == "/enroll/cancel" || path == "/cancel"))
                {
                    jsonResponse = CancelCurrentOperation();
                }
                else if (method == "POST" && path == "/verify")
                {
                    string body = ReadBody(request);
                    jsonResponse = VerifyFingerprint(body);
                }
                else if (method == "POST" && path == "/identify")
                {
                    jsonResponse = IdentifyFingerprint();
                }
                else if (method == "POST" && (path == "/check-duplicate" || path == "/compare-templates"))
                {
                    string body = ReadBody(request);
                    jsonResponse = CheckDuplicateTemplate(body);
                }
                else if (method == "POST" && path == "/delete")
                {
                    jsonResponse = "{\"success\":true}";
                }
                else
                {
                    statusCode = 404;
                    jsonResponse = "{\"error\":\"Route not found\"}";
                }
            }
            catch (Exception ex)
            {
                statusCode = 500;
                jsonResponse = string.Format("{{\"success\":false,\"error\":{0}}}", EscapeJsonString(ex.Message));
                Console.Error.WriteLine("[BiometricService] Request error: " + ex);
            }

            byte[] buffer = Encoding.UTF8.GetBytes(jsonResponse);
            response.ContentType = "application/json; charset=utf-8";
            response.ContentLength64 = buffer.Length;
            response.StatusCode = statusCode;
            response.OutputStream.Write(buffer, 0, buffer.Length);
            response.OutputStream.Close();
        }

        private static string ReadBody(HttpListenerRequest request)
        {
            if (!request.HasEntityBody) return "";
            using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
            {
                return reader.ReadToEnd();
            }
        }

        #region Reader Management
        private static Reader OpenConnectedReader()
        {
            for (int attempt = 0; attempt < 3; attempt++)
            {
                try
                {
                    ReaderCollection readers = ReaderCollection.GetReaders();
                    if (readers.Count == 0) return null;

                    Reader reader = readers[0];
                    Constants.ResultCode res = reader.Open(Constants.CapturePriority.DP_PRIORITY_COOPERATIVE);
                    if (res == Constants.ResultCode.DP_SUCCESS)
                    {
                        return reader;
                    }
                    reader.Dispose();
                }
                catch { }

                if (attempt < 2)
                {
                    Thread.Sleep(80);
                }
            }
            return null;
        }

        private static string GetReaderStatus()
        {
            try
            {
                ReaderCollection readers = ReaderCollection.GetReaders();
                if (readers.Count > 0)
                {
                    Reader r = readers[0];
                    string name = r.Description.Name ?? "HID DigitalPersona U.are.U 4500";
                    string serial = r.Description.SerialNumber ?? "";

                    return string.Format(
                        "{{\"connected\":true,\"unitId\":1,\"description\":{0},\"manufacturer\":\"HID Global\",\"model\":\"U.are.U 4500\",\"serialNumber\":{1},\"status\":\"Connected\"}}",
                        EscapeJsonString(name),
                        EscapeJsonString(serial)
                    );
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("[BiometricService] GetReaderStatus error: " + ex.Message);
            }

            return "{\"connected\":false,\"unitId\":0,\"description\":\"DigitalPersona 4500\",\"status\":\"Not Connected\",\"message\":\"Please connect the DigitalPersona 4500.\"}";
        }
        #endregion

        #region Enrollment
        private static string StartEnrollment()
        {
            // Auto-cancel any previous lingering reader capture before acquiring sync lock
            try
            {
                Reader active = _activeReader;
                if (active != null)
                {
                    Console.WriteLine("[BiometricService] StartEnrollment: Auto-cancelling previous in-flight capture...");
                    active.CancelCapture();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("[BiometricService] Error auto-cancelling in StartEnrollment: " + ex.Message);
            }

            lock (_syncLock)
            {
                _enrollGallery.Clear();
                _enrollScanCount = 0;

                ReaderCollection readers = ReaderCollection.GetReaders();
                if (readers.Count == 0)
                {
                    return "{\"success\":false,\"error\":\"Fingerprint reader not detected. Please connect the DigitalPersona fingerprint reader and try again.\"}";
                }

                Console.WriteLine("[BiometricService] Enrollment session initialized. Awaiting 3 scans.");
                return "{\"success\":true,\"status\":\"ready\",\"currentScan\":0,\"totalScans\":3,\"message\":\"Enrollment started. Ready for scan 1.\"}";
            }
        }

        private static string CaptureEnrollSample()
        {
            lock (_syncLock)
            {
                Reader reader = OpenConnectedReader();
                if (reader == null)
                {
                    return "{\"success\":false,\"error\":\"Fingerprint reader not detected. Please connect the DigitalPersona fingerprint reader and try again.\"}";
                }

                _activeReader = reader;
                try
                {
                    int scanIndex = _enrollGallery.Count + 1;
                    Console.WriteLine("[BiometricService] CaptureEnrollSample: Waiting for finger (Scan {0} of {1})...", scanIndex, REQUIRED_SCANS);

                    // Wait for user to touch sensor (20 seconds timeout)
                    CaptureResult cr = reader.Capture(Constants.Formats.Fid.ANSI, Constants.CaptureProcessing.DP_IMG_PROC_DEFAULT, 20000, 500);

                    if (cr.Quality == Constants.CaptureQuality.DP_QUALITY_TIMED_OUT)
                    {
                        Console.WriteLine("[BiometricService] Capture timed out (no finger placed).");
                        return "{\"success\":false,\"status\":\"timeout\",\"error\":\"Fingerprint capture timed out. Please try again.\"}";
                    }

                    if (cr.Quality == Constants.CaptureQuality.DP_QUALITY_CANCELED)
                    {
                        Console.WriteLine("[BiometricService] Capture was cancelled.");
                        return "{\"success\":false,\"status\":\"cancelled\",\"error\":\"Capture was cancelled.\"}";
                    }

                    if (cr.ResultCode != Constants.ResultCode.DP_SUCCESS || cr.Data == null)
                    {
                        Console.WriteLine("[BiometricService] Capture failed: ResultCode={0}, Quality={1}", cr.ResultCode, cr.Quality);
                        return "{\"success\":false,\"error\":\"Poor scan quality. Please place finger flat and firmly on the optical sensor.\"}";
                    }

                    // Extract minutiae features into an ANSI FMD
                    DataResult<Fmd> fmdRes = FeatureExtraction.CreateFmdFromFid(cr.Data, Constants.Formats.Fmd.ANSI);
                    if (fmdRes.ResultCode != Constants.ResultCode.DP_SUCCESS || fmdRes.Data == null)
                    {
                        Console.WriteLine("[BiometricService] FeatureExtraction failed: {0}", fmdRes.ResultCode);
                        return "{\"success\":false,\"error\":\"Could not extract minutiae points. Please press firmly and try again.\"}";
                    }

                    _enrollGallery.Add(fmdRes.Data);
                    int currentCount = _enrollGallery.Count;
                    Console.WriteLine("[BiometricService] Scan {0} of {1} captured successfully!", currentCount, REQUIRED_SCANS);

                    if (currentCount < REQUIRED_SCANS)
                    {
                        return string.Format(
                            "{{\"success\":true,\"status\":\"more_data\",\"scanCompleted\":{0},\"nextScan\":{1},\"totalScans\":{2},\"message\":{3}}}",
                            currentCount,
                            currentCount + 1,
                            REQUIRED_SCANS,
                            EscapeJsonString(string.Format("Scan {0} captured. Please lift your finger and place it again.", currentCount))
                        );
                    }
                    else
                    {
                        // 3 scans collected! Generate enrollment template.
                        // DPUruNet Enrollment.CreateEnrollmentFmd requires 4 samples.
                        // We replicate the 3rd sample to reach 4 samples cleanly.
                        List<Fmd> fullList = new List<Fmd>(_enrollGallery);
                        fullList.Add(_enrollGallery[2]);

                        DataResult<Fmd> enrollRes = Enrollment.CreateEnrollmentFmd(Constants.Formats.Fmd.ANSI, fullList);
                        byte[] templateBytes;

                        if (enrollRes.ResultCode == Constants.ResultCode.DP_SUCCESS && enrollRes.Data != null)
                        {
                            templateBytes = enrollRes.Data.Bytes;
                        }
                        else
                        {
                            Console.WriteLine("[BiometricService] CreateEnrollmentFmd returned {0}, falling back to sample FMD.", enrollRes.ResultCode);
                            templateBytes = _enrollGallery[0].Bytes;
                        }

                        string b64Template = Convert.ToBase64String(templateBytes);
                        string templateId = Guid.NewGuid().ToString();

                        _enrollGallery.Clear();
                        Console.WriteLine("[BiometricService] Enrollment complete! Generated template length: {0} bytes.", templateBytes.Length);

                        return string.Format(
                            "{{\"success\":true,\"status\":\"completed\",\"scanCompleted\":3,\"totalScans\":3,\"template\":{0},\"templateId\":{1},\"finger\":\"Right Index\",\"message\":\"Biometric enrollment complete!\"}}",
                            EscapeJsonString(b64Template),
                            EscapeJsonString(templateId)
                        );
                    }
                }
                finally
                {
                    _activeReader = null;
                    reader.Dispose();
                }
            }
        }

        private static string CancelCurrentOperation()
        {
            // Cancel active reader capture immediately WITHOUT blocking on _syncLock
            try
            {
                Reader active = _activeReader;
                if (active != null)
                {
                    Console.WriteLine("[BiometricService] Cancelling active reader capture...");
                    active.CancelCapture();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("[BiometricService] Error cancelling reader: " + ex.Message);
            }

            lock (_syncLock)
            {
                _enrollGallery.Clear();
                _enrollScanCount = 0;
            }

            Console.WriteLine("[BiometricService] Current biometric operation cancelled.");
            return "{\"success\":true,\"status\":\"cancelled\",\"message\":\"Operation cancelled.\"}";
        }
        #endregion

        #region Verification & Identification
        private static string VerifyFingerprint(string jsonBody)
        {
            string templateB64 = ExtractJsonField(jsonBody, "template");
            if (string.IsNullOrEmpty(templateB64))
            {
                templateB64 = ExtractJsonField(jsonBody, "templateId");
            }

            if (string.IsNullOrEmpty(templateB64))
            {
                return "{\"success\":false,\"match\":false,\"error\":\"Enrolled biometric template is required for verification.\"}";
            }

            byte[] storedBytes;
            try
            {
                storedBytes = Convert.FromBase64String(templateB64);
            }
            catch
            {
                return "{\"success\":false,\"match\":false,\"error\":\"Invalid base64 biometric template provided.\"}";
            }

            // Import enrolled template
            DataResult<Fmd> importedFmdRes = Importer.ImportFmd(storedBytes, Constants.Formats.Fmd.ANSI, Constants.Formats.Fmd.ANSI);
            if (importedFmdRes.ResultCode != Constants.ResultCode.DP_SUCCESS || importedFmdRes.Data == null)
            {
                return "{\"success\":false,\"match\":false,\"error\":\"Failed to parse enrolled biometric template.\"}";
            }

            Fmd enrolledFmd = importedFmdRes.Data;

            lock (_syncLock)
            {
                Reader reader = OpenConnectedReader();
                if (reader == null)
                {
                    return "{\"success\":false,\"match\":false,\"error\":\"Fingerprint reader not detected. Please connect the DigitalPersona fingerprint reader.\"}";
                }

                _activeReader = reader;
                try
                {
                    Console.WriteLine("[BiometricService] Verify: Please place finger on reader (15s timeout)...");
                    CaptureResult cr = reader.Capture(Constants.Formats.Fid.ANSI, Constants.CaptureProcessing.DP_IMG_PROC_DEFAULT, 15000, 500);

                    if (cr.Quality == Constants.CaptureQuality.DP_QUALITY_TIMED_OUT)
                    {
                        Console.WriteLine("[BiometricService] Verify timed out.");
                        return "{\"success\":false,\"match\":false,\"status\":\"timeout\",\"error\":\"Fingerprint verification timed out. No finger detected.\"}";
                    }

                    if (cr.Quality == Constants.CaptureQuality.DP_QUALITY_CANCELED)
                    {
                        return "{\"success\":false,\"match\":false,\"status\":\"cancelled\",\"error\":\"Verification cancelled.\"}";
                    }

                    if (cr.ResultCode != Constants.ResultCode.DP_SUCCESS || cr.Data == null)
                    {
                        return "{\"success\":false,\"match\":false,\"error\":\"Poor scan quality. Please place finger flat on the sensor.\"}";
                    }

                    DataResult<Fmd> sampleFmdRes = FeatureExtraction.CreateFmdFromFid(cr.Data, Constants.Formats.Fmd.ANSI);
                    if (sampleFmdRes.ResultCode != Constants.ResultCode.DP_SUCCESS || sampleFmdRes.Data == null)
                    {
                        return "{\"success\":false,\"match\":false,\"error\":\"Failed to extract minutiae points from scanned finger.\"}";
                    }

                    CompareResult compRes = Comparison.Compare(enrolledFmd, 0, sampleFmdRes.Data, 0);
                    Console.WriteLine("[BiometricService] CompareResult: Code={0}, Score={1} (Threshold < {2})", compRes.ResultCode, compRes.Score, FAR_THRESHOLD);

                    bool isMatch = (compRes.ResultCode == Constants.ResultCode.DP_SUCCESS && compRes.Score < FAR_THRESHOLD);

                    return string.Format(
                        "{{\"success\":true,\"match\":{0},\"score\":{1},\"message\":{2}}}",
                        isMatch ? "true" : "false",
                        compRes.Score,
                        EscapeJsonString(isMatch ? "Fingerprint verified successfully." : "Fingerprint did not match enrolled template.")
                    );
                }
                finally
                {
                    _activeReader = null;
                    reader.Dispose();
                }
            }
        }

        private static string IdentifyFingerprint()
        {
            // Capture touch and return sample template for server to match against users
            lock (_syncLock)
            {
                Reader reader = OpenConnectedReader();
                if (reader == null)
                {
                    return "{\"success\":false,\"match\":false,\"error\":\"Fingerprint reader not detected.\"}";
                }

                _activeReader = reader;
                try
                {
                    Console.WriteLine("[BiometricService] Identify: Touch sensor to identify...");
                    CaptureResult cr = reader.Capture(Constants.Formats.Fid.ANSI, Constants.CaptureProcessing.DP_IMG_PROC_DEFAULT, 15000, 500);

                    if (cr.Quality == Constants.CaptureQuality.DP_QUALITY_TIMED_OUT)
                    {
                        return "{\"success\":false,\"match\":false,\"status\":\"timeout\",\"error\":\"Identification timed out.\"}";
                    }

                    if (cr.Quality == Constants.CaptureQuality.DP_QUALITY_CANCELED)
                    {
                        return "{\"success\":false,\"match\":false,\"status\":\"cancelled\",\"error\":\"Identification cancelled.\"}";
                    }

                    if (cr.ResultCode != Constants.ResultCode.DP_SUCCESS || cr.Data == null)
                    {
                        return "{\"success\":false,\"match\":false,\"error\":\"Poor scan quality. Try again.\"}";
                    }

                    DataResult<Fmd> fmdRes = FeatureExtraction.CreateFmdFromFid(cr.Data, Constants.Formats.Fmd.ANSI);
                    if (fmdRes.ResultCode != Constants.ResultCode.DP_SUCCESS || fmdRes.Data == null)
                    {
                        return "{\"success\":false,\"match\":false,\"error\":\"Could not extract features.\"}";
                    }

                    string b64Sample = Convert.ToBase64String(fmdRes.Data.Bytes);
                    return string.Format("{{\"success\":true,\"match\":true,\"templateId\":{0},\"message\":\"Fingerprint captured.\"}}", EscapeJsonString(b64Sample));
                }
                finally
                {
                    _activeReader = null;
                    reader.Dispose();
                }
            }
        }

        private static string CheckDuplicateTemplate(string jsonBody)
        {
            if (string.IsNullOrEmpty(jsonBody))
            {
                return "{\"success\":false,\"error\":\"Request body is empty.\"}";
            }

            try
            {
                var serializer = new JavaScriptSerializer();
                serializer.MaxJsonLength = 50 * 1024 * 1024;
                var requestData = serializer.Deserialize<Dictionary<string, object>>(jsonBody);

                if (requestData == null || !requestData.ContainsKey("targetTemplate"))
                {
                    return "{\"success\":false,\"error\":\"targetTemplate is required.\"}";
                }

                string targetB64 = Convert.ToString(requestData["targetTemplate"]);
                if (string.IsNullOrEmpty(targetB64))
                {
                    return "{\"success\":false,\"error\":\"targetTemplate cannot be empty.\"}";
                }

                byte[] targetBytes;
                try
                {
                    targetBytes = Convert.FromBase64String(targetB64);
                }
                catch
                {
                    return "{\"success\":false,\"error\":\"Invalid base64 targetTemplate.\"}";
                }

                DataResult<Fmd> targetFmdRes = Importer.ImportFmd(targetBytes, Constants.Formats.Fmd.ANSI, Constants.Formats.Fmd.ANSI);
                if (targetFmdRes.ResultCode != Constants.ResultCode.DP_SUCCESS || targetFmdRes.Data == null)
                {
                    return "{\"success\":false,\"error\":\"Failed to parse target biometric template.\"}";
                }

                Fmd targetFmd = targetFmdRes.Data;

                if (!requestData.ContainsKey("candidates"))
                {
                    return "{\"success\":true,\"isDuplicate\":false,\"message\":\"No candidates provided.\"}";
                }

                var rawCandidates = requestData["candidates"] as System.Collections.ArrayList;
                if (rawCandidates == null || rawCandidates.Count == 0)
                {
                    return "{\"success\":true,\"isDuplicate\":false,\"message\":\"No candidates to compare.\"}";
                }

                Console.WriteLine("[BiometricService] CheckDuplicate: comparing target against {0} candidate(s)...", rawCandidates.Count);

                foreach (var item in rawCandidates)
                {
                    var candidate = item as Dictionary<string, object>;
                    if (candidate == null) continue;

                    string candidateB64 = candidate.ContainsKey("template") ? Convert.ToString(candidate["template"]) : "";
                    if (string.IsNullOrEmpty(candidateB64)) continue;

                    string id = candidate.ContainsKey("id") ? Convert.ToString(candidate["id"]) : "";
                    string name = candidate.ContainsKey("name") ? Convert.ToString(candidate["name"]) : "";
                    string type = candidate.ContainsKey("type") ? Convert.ToString(candidate["type"]) : "";
                    string identifier = candidate.ContainsKey("identifier") ? Convert.ToString(candidate["identifier"]) : "";

                    // 1. Quick exact base64 string equality check
                    if (candidateB64 == targetB64)
                    {
                        Console.WriteLine("[BiometricService] CheckDuplicate MATCH (exact string): {0} ({1})", name, type);
                        return string.Format(
                            "{{\"success\":true,\"isDuplicate\":true,\"score\":0,\"matchedCandidate\":{{\"id\":{0},\"name\":{1},\"type\":{2},\"identifier\":{3}}},\"message\":\"Fingerprint is already registered in the system.\"}}",
                            EscapeJsonString(id),
                            EscapeJsonString(name),
                            EscapeJsonString(type),
                            EscapeJsonString(identifier)
                        );
                    }

                    // 2. Biometric ANSI minutiae feature comparison
                    try
                    {
                        byte[] candidateBytes = Convert.FromBase64String(candidateB64);
                        DataResult<Fmd> candFmdRes = Importer.ImportFmd(candidateBytes, Constants.Formats.Fmd.ANSI, Constants.Formats.Fmd.ANSI);
                        if (candFmdRes.ResultCode == Constants.ResultCode.DP_SUCCESS && candFmdRes.Data != null)
                        {
                            CompareResult compRes = Comparison.Compare(targetFmd, 0, candFmdRes.Data, 0);
                            if (compRes.ResultCode == Constants.ResultCode.DP_SUCCESS && compRes.Score < FAR_THRESHOLD)
                            {
                                Console.WriteLine("[BiometricService] CheckDuplicate MATCH (biometric score {0} < {1}): {2} ({3})", compRes.Score, FAR_THRESHOLD, name, type);
                                return string.Format(
                                    "{{\"success\":true,\"isDuplicate\":true,\"score\":{0},\"matchedCandidate\":{{\"id\":{1},\"name\":{2},\"type\":{3},\"identifier\":{4}}},\"message\":\"Fingerprint is already registered in the system.\"}}",
                                    compRes.Score,
                                    EscapeJsonString(id),
                                    EscapeJsonString(name),
                                    EscapeJsonString(type),
                                    EscapeJsonString(identifier)
                                );
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine("[BiometricService] CheckDuplicate candidate import warning: " + ex.Message);
                    }
                }

                Console.WriteLine("[BiometricService] CheckDuplicate: no duplicate found. Fingerprint is unique.");
                return "{\"success\":true,\"isDuplicate\":false,\"message\":\"Fingerprint is unique.\"}";
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("[BiometricService] CheckDuplicate error: " + ex);
                return string.Format("{{\"success\":false,\"error\":{0}}}", EscapeJsonString(ex.Message));
            }
        }
        #endregion

        #region JSON Helpers
        private static string EscapeJsonString(string s)
        {
            if (s == null) return "\"\"";
            StringBuilder sb = new StringBuilder("\"");
            foreach (char c in s)
            {
                switch (c)
                {
                    case '\\': sb.Append("\\\\"); break;
                    case '\"': sb.Append("\\\""); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:
                        if (c < 32)
                            sb.AppendFormat("\\u{0:X4}", (int)c);
                        else
                            sb.Append(c);
                        break;
                }
            }
            sb.Append("\"");
            return sb.ToString();
        }

        private static string ExtractJsonField(string json, string field)
        {
            if (string.IsNullOrEmpty(json)) return "";
            string key = "\"" + field + "\"";
            int idx = json.IndexOf(key);
            if (idx == -1) return "";

            int colonIdx = json.IndexOf(':', idx + key.Length);
            if (colonIdx == -1) return "";

            int start = colonIdx + 1;
            while (start < json.Length && char.IsWhiteSpace(json[start])) start++;
            if (start >= json.Length) return "";

            if (json[start] == '\"')
            {
                start++;
                int end = start;
                while (end < json.Length)
                {
                    if (json[end] == '\\') { end += 2; continue; }
                    if (json[end] == '\"') break;
                    end++;
                }
                return json.Substring(start, end - start).Replace("\\\"", "\"").Replace("\\\\", "\\");
            }
            else
            {
                int end = start;
                while (end < json.Length && json[end] != ',' && json[end] != '}' && !char.IsWhiteSpace(json[end])) end++;
                return json.Substring(start, end - start);
            }
        }
        #endregion
    }
}
