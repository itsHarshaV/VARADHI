import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";

import Report from "../models/Report.js";

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/varadhi";
const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:5000";

function usage() {
  console.log("Seeds a few demo flood reports (dev utility).");
  console.log("");
  console.log("Usage:");
  console.log("  node scripts/seedReports.js --yes");
  console.log("");
  console.log("Env (optional):");
  console.log("  API_BASE_URL=http://localhost:5000");
}

function seedSvg({ title, subtitle, color = "#0ea5e9" }) {
  const t = String(title || "Flood Report");
  const s = String(subtitle || "");
  const c = String(color || "#0ea5e9");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c}" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#0b1020" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" rx="48" fill="url(#g)"/>
  <circle cx="1040" cy="135" r="110" fill="#ffffff" opacity="0.08"/>
  <circle cx="1030" cy="150" r="70" fill="#ffffff" opacity="0.08"/>
  <g fill="#ffffff">
    <text x="80" y="310" font-size="72" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${t}</text>
    <text x="80" y="380" font-size="34" font-family="Segoe UI, Arial, sans-serif" opacity="0.9">${s}</text>
    <text x="80" y="460" font-size="22" font-family="Segoe UI, Arial, sans-serif" opacity="0.7">Demo seed image</text>
  </g>
</svg>`;
}

async function ensureSeedImageSvg(filename, svgText) {
  await fs.mkdir("uploads", { recursive: true });
  const fullPath = path.join("uploads", filename);
  await fs.writeFile(fullPath, svgText, "utf8");
  return `${apiBaseUrl}/uploads/${encodeURIComponent(filename)}`;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (!args.has("--yes")) {
    usage();
    process.exitCode = 2;
    return;
  }

  await mongoose.connect(mongoUri);

  const ameerpetImageUrl = await ensureSeedImageSvg(
    "seed-ameerpet-high.svg",
    seedSvg({ title: "Ameerpet is flooded", subtitle: "Water level: High", color: "#ef4444" })
  );
  const hitechImageUrl = await ensureSeedImageSvg(
    "seed-hitech-medium.svg",
    seedSvg({ title: "Hitech City is flooded", subtitle: "Water level: Medium", color: "#f59e0b" })
  );
  const secunderabadImageUrl = await ensureSeedImageSvg(
    "seed-secunderabad-low.svg",
    seedSvg({ title: "Secunderabad is flooded", subtitle: "Water level: Low", color: "#10b981" })
  );

  const now = Date.now();
  const docs = [
    {
      userEmail: "demo@varadhi.local",
      address: "Ameerpet",
      waterLevel: "High",
      location: { type: "Point", coordinates: [78.4483, 17.4375] },
      imageUrl: ameerpetImageUrl,
      createdAt: new Date(now - 12 * 60 * 1000),
    },
    {
      userEmail: "demo@varadhi.local",
      address: "Hitech City",
      waterLevel: "Medium",
      location: { type: "Point", coordinates: [78.3762, 17.4449] },
      imageUrl: hitechImageUrl,
      createdAt: new Date(now - 38 * 60 * 1000),
    },
    {
      userEmail: "demo@varadhi.local",
      address: "Secunderabad",
      waterLevel: "Low",
      location: { type: "Point", coordinates: [78.4983, 17.4399] },
      imageUrl: secunderabadImageUrl,
      createdAt: new Date(now - 58 * 60 * 1000),
    },
  ];

  const inserted = await Report.insertMany(docs, { ordered: true });
  console.log(`Seeded reports: ${inserted.length}`);
  console.log(`API_BASE_URL: ${apiBaseUrl}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
