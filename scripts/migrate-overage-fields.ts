import { config } from "dotenv";
import mongoose from "mongoose";

config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/team-roadmapper";

async function migrate() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const projects = db.collection("projects");

  const docs = await projects.find({ targetEndDate: { $exists: true } }).toArray();
  console.log(`Found ${docs.length} projects with targetEndDate to migrate`);

  let updated = 0;
  for (const doc of docs) {
    const oldTargetEnd = new Date(doc.targetEndDate);
    const oldPlannedEnd = new Date(doc.plannedEnd);

    // Old model: targetEndDate = original commitment, plannedEnd = actual/extended end
    // New model: plannedEnd = original commitment, currentEndDate = extended end (if different)
    const newPlannedEnd = oldTargetEnd;
    const newCurrentEndDate = oldPlannedEnd > oldTargetEnd ? oldPlannedEnd : null;

    await projects.updateOne(
      { _id: doc._id },
      {
        $set: {
          plannedEnd: newPlannedEnd,
          ...(newCurrentEndDate ? { currentEndDate: newCurrentEndDate } : {}),
        },
        $unset: { targetEndDate: "" },
      }
    );
    updated++;
    console.log(`  Migrated: ${doc.title} | plannedEnd: ${newPlannedEnd.toISOString().split("T")[0]} | currentEndDate: ${newCurrentEndDate?.toISOString().split("T")[0] || "null"}`);
  }

  // Also clean up any projects without targetEndDate that might have the field missing
  await projects.updateMany(
    { currentEndDate: { $exists: false } },
    { $set: { currentEndDate: null } }
  );

  console.log(`\nMigration complete. ${updated} projects updated.`);
  await mongoose.disconnect();
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
