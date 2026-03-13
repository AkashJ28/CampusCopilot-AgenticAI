require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();


const authMiddleware = require("./middleware/authMiddleware");


const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/students");
const professorRoutes = require("./routes/professors");
const courseRoutes = require("./routes/courses");
const recruiterRoutes = require("./routes/recruiters");
const chatRoutes = require("./routes/chat");
const semesterRoutes = require("./routes/semesters");
const placementsRoutes = require("./routes/placements");

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (req, res) => res.send("✅ Backend API is live and responding!"));

app.use("/api/auth", authRoutes);

app.use("/api/chat", authMiddleware, chatRoutes);

app.use("/api/students", studentRoutes);
app.use("/api/professors", professorRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/recruiters", recruiterRoutes);
app.use("/api/semesters", semesterRoutes);
app.use("/api/placements", placementsRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Backend API server is running on port ${PORT}`);
});
