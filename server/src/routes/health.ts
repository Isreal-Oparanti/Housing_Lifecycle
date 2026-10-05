import { Router, Request, Response } from "express";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "truecost-api",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

export default router;
