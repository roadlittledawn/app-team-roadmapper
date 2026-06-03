import { config } from "dotenv";
import mongoose from "mongoose";

config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/team-roadmapper";

async function migrate() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Failed to connect to database");

  const projects = db.collection("projects");

  const count = await projects.countDocuments({});
  console.log(`Found ${count} projects to migrate`);

  const result = await projects.updateMany(
    { roadmapIds: { $exists: false } },
    [
      {
        $set: {
          roadmapIds: ["$roadmapId"],
          targetEndDate: "$plannedEnd",
          statusOverride: null,
        },
      },
      {
        $unset: ["milestones", "roadmapId"],
      },
    ]
  );

  console.log(`Migrated ${result.modifiedCount} projects`);
  console.log("  - roadmapId → roadmapIds (array)");
  console.log("  - targetEndDate set from plannedEnd");
  console.log("  - statusOverride set to null");
  console.log("  - milestones field removed");

  await mongoose.disconnect();
  console.log("Done.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
