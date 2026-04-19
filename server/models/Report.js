import mongoose from "mongoose";

export const WATER_LEVELS = ["Low", "Medium", "High"];

const ReportSchema = new mongoose.Schema(
  {
    userEmail: { type: String, index: true },
    imageUrl: { type: String },

    waterLevel: { type: String, enum: WATER_LEVELS, required: true, index: true },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },

      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
        validate: {
          validator(value) {
            return (
              Array.isArray(value) &&
              value.length === 2 &&
              value.every((n) => Number.isFinite(n))
            );
          },
          message: "location.coordinates must be [lng, lat] numbers",
        },
      },
    },

    address: { type: String },
    createdAt: { type: Date, default: Date.now, expires: 86400, index: true },

    // Legacy fields
    lat: { type: Number },
    lng: { type: Number },
    time: { type: Date },
    timestamp: { type: Date },
    image: { type: String },
    intensity: { type: String },
  },
  {
    minimize: false,

    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        if (ret.location?.coordinates?.length === 2) {
          ret.lng = ret.lng ?? ret.location.coordinates[0];
          ret.lat = ret.lat ?? ret.location.coordinates[1];
        }

        ret.timestamp = ret.timestamp ?? ret.createdAt;
        ret.time = ret.time ?? ret.createdAt;

        delete ret.__v;

        return ret;
      },
    },

    toObject: { virtuals: true },
  }
);

ReportSchema.index({ location: "2dsphere" });

ReportSchema.pre("validate", function syncLegacyFields(next) {
  const hasGeoJson = this.location?.coordinates?.length === 2;

  const hasLegacyLatLng =
    Number.isFinite(this.lat) && Number.isFinite(this.lng);

  if (!hasGeoJson && hasLegacyLatLng) {
    this.location = {
      type: "Point",
      coordinates: [this.lng, this.lat],
    };
  }

  if (hasGeoJson && !hasLegacyLatLng) {
    this.lng = this.location.coordinates[0];
    this.lat = this.location.coordinates[1];
  }

  if (!this.time) this.time = this.createdAt;
  if (!this.timestamp) this.timestamp = this.createdAt;

  if (!this.intensity) {
    if (this.waterLevel === "Low") this.intensity = "ANKLE";
    if (this.waterLevel === "Medium") this.intensity = "KNEE";
    if (this.waterLevel === "High") this.intensity = "VEHICLE_RISK";
  }

  next();
});

const Report = mongoose.model("Report", ReportSchema);

export default Report;
