import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import User from "./models/User.js";
import Report from "./models/Report.js";

const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/varadhi";
const port = Number.parseInt(process.env.PORT || "5000", 10) || 5000;

function safeFileExt(originalName) {
  const ext = path.extname(String(originalName || "")).toLowerCase();
  if (!ext) return "";
  if (!/^\.[a-z0-9]{1,10}$/i.test(ext)) return "";
  return ext;
}

async function uploadImageToLocal(req, file) {
  if (!file) return null;

  await fs.mkdir("uploads", { recursive: true });

  const ext =
    safeFileExt(file.originalname) ||
    (file.mimetype === "image/png"
      ? ".png"
      : file.mimetype === "image/jpeg"
        ? ".jpg"
        : file.mimetype === "image/webp"
          ? ".webp"
          : "");

  const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
  const fullPath = path.join("uploads", filename);
  await fs.writeFile(fullPath, file.buffer);

  return `${req.protocol}://${req.get("host")}/uploads/${encodeURIComponent(
    filename
  )}`;
}

async function uploadImage(req, file) {
  if (!file) return null;
  return uploadImageToLocal(req, file);
}

/* ---------- NORMALIZERS ---------- */

function normalizeIntensity(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return null;

  if (["ankle", "low", "l", "1"].includes(v)) return "ANKLE";
  if (["knee", "medium", "med", "m", "2"].includes(v)) return "KNEE";

  if (
    [
      "vehicle risk",
      "vehicle_risk",
      "vehiclerisk",
      "high",
      "h",
      "3",
      "red",
      "danger",
    ].includes(v)
  )
    return "VEHICLE_RISK";

  if (v.includes("ankle")) return "ANKLE";
  if (v.includes("knee")) return "KNEE";
  if (v.includes("vehicle")) return "VEHICLE_RISK";

  return null;
}

function normalizeWaterLevel(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return null;

  if (["low", "l", "1", "ankle", "ankle level", "green"].includes(v))
    return "Low";
  if (["medium", "med", "m", "2", "knee", "knee level", "yellow"].includes(v))
    return "Medium";
  if (["high", "h", "3", "waist", "vehicle", "vehicle risk", "red"].includes(v))
    return "High";

  const intensity = normalizeIntensity(value);
  if (intensity === "ANKLE") return "Low";
  if (intensity === "KNEE") return "Medium";
  if (intensity === "VEHICLE_RISK") return "High";

  return null;
}

/* ---------- MIDDLEWARE ---------- */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 }, // 6MB
});

const uploadIfMultipart = (req, res, next) => {
  if (req.is("multipart/form-data"))
    return upload.single("image")(req, res, next);
  next();
};

const requireMongo = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      msg: "MongoDB not connected. Check MONGO_URI.",
    });
  }
  next();
};

/* ---------- REPORT CREATION ---------- */

async function createReportFromRequest(req) {
  const lat = Number.parseFloat(req.body.lat);
  const lng = Number.parseFloat(req.body.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const error = new Error("lat and lng are required numbers");
    error.status = 400;
    throw error;
  }

  const waterLevel =
    normalizeWaterLevel(req.body.waterLevel) ||
    normalizeWaterLevel(req.body.intensity) ||
    normalizeWaterLevel(req.body.level);

  if (!waterLevel) {
    const error = new Error("waterLevel is required (Low, Medium, High)");
    error.status = 400;
    throw error;
  }

  let imageUrl = null;
  try {
    imageUrl = await uploadImage(req, req.file);
  } catch (e) {
    const error = new Error(e?.message || "Image upload failed");
    error.status = 500;
    throw error;
  }

  const address = String(req.body.address || "").trim() || undefined;

  return Report.create({
    userEmail: req.userEmail || req.body.userEmail,
    waterLevel,
    location: { type: "Point", coordinates: [lng, lat] },
    imageUrl,
    address,
  });
}

/* ---------- AUTH ---------- */

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const sessions = new Map(); // token -> { email, expiresAt }

const authOptional = (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) return next();

  const session = sessions.get(token);
  if (session && session.expiresAt > Date.now()) {
    req.userEmail = session.email;
  } else if (session) {
    sessions.delete(token);
  }

  next();
};

app.post("/api/auth/login", requireMongo, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ msg: "Valid email is required" });
  }

  await User.findOneAndUpdate({ email }, { email }, { upsert: true, new: true });
  const token = crypto.randomBytes(24).toString("base64url");
  sessions.set(token, { email, expiresAt: Date.now() + SESSION_TTL_MS });
  res.json({ email, token });
});

/* ---------- REPORT APIs ---------- */

app.post(
  "/api/reports",
  requireMongo,
  authOptional,
  uploadIfMultipart,
  async (req, res) => {
    try {
      const report = await createReportFromRequest(req);
      res.json(report);
    } catch (err) {
      res
        .status(err.status || 500)
        .json({ msg: err.message || "Failed to create report" });
    }
  }
);

app.get("/api/reports/active", requireMongo, async (req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const reports = await Report.find({ createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .limit(200);

  res.json(reports);
});

app.delete("/api/reports/:id", requireMongo, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ msg: "Invalid report id" });
  }

  const report = await Report.findByIdAndDelete(id);
  if (!report) return res.status(404).json({ msg: "Report not found" });

  const imageUrl = String(report.imageUrl || "");
  const marker = "/uploads/";
  const idx = imageUrl.indexOf(marker);
  if (idx !== -1) {
    const filename = decodeURIComponent(imageUrl.slice(idx + marker.length)).split(/[?#]/)[0];
    const safeName = path.basename(filename);
    const fullPath = path.join(process.cwd(), "uploads", safeName);
    try {
      await fs.unlink(fullPath);
    } catch {
      // ignore missing file
    }
  }

  res.json({ ok: true });
});

/* ---------- SERVER START ---------- */

async function start() {
  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
  }

  app.listen(port, () => console.log(`Server running on port ${port}`));
}

start();
