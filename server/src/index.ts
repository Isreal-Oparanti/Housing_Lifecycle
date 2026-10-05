import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthRouter from "./routes/health.js";
import councilTaxRouter from "./routes/councilTax.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api", healthRouter);
app.use("/api/council-tax", councilTaxRouter);

app.listen(PORT, () => {
  console.log(`TrueCost API server is running on http://localhost:${PORT}`);
});
