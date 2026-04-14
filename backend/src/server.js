import express from "express";
import dotenv from "dotenv";
import { initDB } from "./config/db.js";
import cors from "cors";
import rateLimiter from "./middleware/rateLimiter.js";
import resumesRoutes from "./routes/resumesRoutes.js";

dotenv.config();

const app = express();
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL,
]
  .filter(Boolean)
  .map((origin) => origin.trim());

app.use(express.json());

// rate limiter
app.use(rateLimiter);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("Blocked by CORS:", origin);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use("/api/resumes", resumesRoutes); //connect & use all api routes

const PORT = process.env.PORT || 5000; //current & default port

app.get("/health", (req, res) => { //checking status of backend- debugging
  res.status(200).json({ status: "ok" });
});


initDB() //initialise database then run app
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Resume Cleaner Backend is up and running on PORT: ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize DB", error);
    process.exit(1);
  });
