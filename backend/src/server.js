import express from "express";
import dotenv from "dotenv";
import { initDB } from "./config/db.js";
import cors from "cors";
import rateLimiter from "./middleware/rateLimiter.js";
import resumesRoutes from "./routes/resumesRoutes.js"; 

dotenv.config();

const app = express();

app.use(express.json());

// rate limiter
app.use(rateLimiter); 

app.use(
  cors({
    origin: "http://localhost:3000", //sross-origin resource sharing- connects backend and frontend urls
    credentials: true,
  })
);


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
