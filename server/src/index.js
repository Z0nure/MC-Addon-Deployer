import "dotenv/config";
import express from "express";
import cors from "cors";
import addonRoutes from "./routes/addon.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL || "https://zonure.xyz" }));
app.use(express.json());

app.use("/api/addon", addonRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
