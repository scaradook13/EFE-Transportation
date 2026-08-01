
import mongoose from "mongoose";
import { connectDB } from "./server/utils/db";
import { DriverAssignment } from "./server/models/DriverAssignment";

async function run() {
  await connectDB();
  const activeAssignments = await DriverAssignment.find({ status: "Active" })
      .populate("driver", "fullName driverId operationalStatus")
      .populate("taxiUnit", "taxiNumber plateNumber status")
      .populate("issuedBy", "fullName username role")
      .sort({ assignedAt: -1 })
      .limit(5)
  console.log("Assignments:", activeAssignments);
  process.exit(0);
}
run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});

