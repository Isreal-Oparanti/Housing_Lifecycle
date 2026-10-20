// Must be first: route modules read environment variables (such as OS_API_KEY) when they load.
import "dotenv/config";
import express from "express";
import cors from "cors";
import healthRouter from "./routes/health.js";
import councilTaxRouter from "./routes/councilTax.js";
import lookupRouter from "./routes/lookup.js";

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = (process.env.CORS_ORIGIN || "http://localhost:3000").split(",");

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Routes
app.use("/api", healthRouter);
app.use("/api/council-tax", councilTaxRouter);
app.use("/api/lookup", lookupRouter);

app.listen(PORT, () => {
  console.log(`TrueCost API server is running on http://localhost:${PORT}`);
});
