import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";

import Report from "../models/Report.js";

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/varadhi";

function usage() {
  console.log("Clears all reports from MongoDB (dev utility).");
  console.log("");
  console.log("Usage:");
  console.log("  node scripts/clearReports.js --yes [--uploads]");
  console.log("");
  console.log("Flags:");
  console.log("  --yes      Required confirmation");
  console.log("  --uploads  Also deletes files in ./uploads");
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (!args.has("--yes")) {
    usage();
    process.exitCode = 2;
    return;
  }

  await mongoose.connect(mongoUri);

  const result = await Report.deleteMany({});
  console.log(`Deleted reports: ${result.deletedCount ?? 0}`);

  if (args.has("--uploads")) {
    const uploadsDir = path.join(process.cwd(), "uploads");
    try {
      const entries = await fs.readdir(uploadsDir, { withFileTypes: true });
      const files = entries.filter((e) => e.isFile()).map((e) => e.name);
      await Promise.all(files.map((f) => fs.unlink(path.join(uploadsDir, f))));
      console.log(`Deleted upload files: ${files.length}`);
    } catch (e) {
      if (e?.code === "ENOENT") {
        console.log("No uploads directory found, skipped.");
      } else {
        throw e;
      }
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

