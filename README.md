# Varadhi (MERN) — Urban Flood Reporting

Varadhi is a MERN demo app to report **urban flooding** with a **location**, a **water level** (Low/Medium/High), and an optional **photo**, and then view those reports on a live map.

## What it does
- Email “login” (demo) to start a session
- Submit flood reports with `lat/lng`, water level, optional image
- View the last **24 hours** of reports on a map + in a list
- “Alerts” view filters Medium/High reports
- Reports auto-expire after 24 hours (MongoDB TTL index)

## How it works (high level)
- **React** UI (Tailwind) calls the API using Axios
- **Express** API persists reports in **MongoDB** using Mongoose
- Report location is stored as GeoJSON (`Point`) with a 2dsphere index
- Image uploads are handled via Multer and stored locally in `server/uploads/` (served at `/uploads`)
- Auth is a simple in-memory token session (dev/demo; resets on server restart)

## Prerequisites
- Node.js (18+) and npm
- MongoDB (local `mongod`) or MongoDB Atlas connection string
- Map provider:
  - Default: **OpenStreetMap (Leaflet)** (no API key needed)
  - Optional: **Google Maps** (needs an API key)

## Server (Express + MongoDB)
1. Open a terminal in `server/`
2. Set environment variables:
   - `MONGO_URI` (optional): e.g. `mongodb://127.0.0.1:27017/varadhi` or an Atlas URI
   - `PORT` (optional): default `5000`
   - `CLIENT_ORIGIN` (optional): default `http://localhost:3000`
3. Install + run:
   - `npm install`
   - `npm start`

Server runs on `http://localhost:5000`.

### API
- `POST /api/auth/login` body: `email` → returns `{ email, token }`
- `POST /api/reports` (JSON or multipart) body: `lat`, `lng`, `waterLevel` (`Low|Medium|High`) + optional `image`
- `GET /api/reports/active` (active reports; older auto-expire)
- `DELETE /api/reports/:id` (delete a report + its local image)

## Client (React)
1. Open a terminal in `client/`
2. (Optional) Create `client/.env`:
   - Copy `client/.env.example`
   - Set `REACT_APP_MAP_PROVIDER=osm` (default) or `google`
   - If using Google Maps: set `REACT_APP_GOOGLE_MAPS_API_KEY=...`
3. Install + run:
   - `npm install`
   - `npm start`

Client runs on `http://localhost:3000`.

## Notes
- If MongoDB is not reachable, server endpoints return `503` with a message about MongoDB not connected.
- OSM mode uses OpenStreetMap tiles; Google mode requires enabling the `Maps JavaScript API` for your key.
