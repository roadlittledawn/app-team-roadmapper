import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/team-roadmapper";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";

async function seed() {
  await mongoose.connect(MONGODB_URI);

  const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
  });

  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`User ${ADMIN_EMAIL} already exists, skipping.`);
  } else {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await User.create({ email: ADMIN_EMAIL, passwordHash: hash });
    console.log(`Created user: ${ADMIN_EMAIL}`);
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
