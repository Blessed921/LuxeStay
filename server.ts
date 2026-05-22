import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2023-10-16" as any,
  });

  app.use(express.json());

  // API Routes
  app.post("/api/initiate-settlement", async (req, res) => {
    try {
      const { listingName, price, days, listingId, guests, checkIn, userId } = req.body;
      
      console.log(`Initiating Sanctuary Ledger Protocol for ${listingName} [User: ${userId}]`);
      
      // Simulate ledger entry generation with unique protocol ID
      const settlementId = `SL-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      
      res.json({ 
        success: true, 
        settlementId,
        protocolVersion: "2.4.1-alpha",
        timestamp: new Date().toISOString(),
        details: {
          listingName,
          amount: price * days,
          currency: "USD"
        }
      });
    } catch (error: any) {
      console.error("Settlement Initiation Error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/cancel-booking", async (req, res) => {
    try {
      const { settlementId } = req.body;
      
      console.log(`Sanctuary Ledger: Refund protocol initiated for ${settlementId}`);
      
      // In this version, we immediately acknowledge simulated reversals
      res.json({ 
        success: true, 
        refundStatus: "REVERSED",
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Refund Error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
