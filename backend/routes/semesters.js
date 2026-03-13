const express = require("express");
const router = express.Router();
const pool = require("../db");
const { DateTime } = require("luxon");

// Get current semester
router.get("/current", async (req, res) => {
  try {
    const today = DateTime.now().toISODate();

    const semesterQuery = `
      SELECT semester_id, name, start_date, end_date
      FROM Semesters
      WHERE $1 BETWEEN start_date AND end_date
      LIMIT 1;
    `;
    const semesterResult = await pool.query(semesterQuery, [today]);

    if (semesterResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "No active semester found for today's date." });
    }

    res.json(semesterResult.rows[0]);
  } catch (err) {
    console.error("Error getting current semester:", err.message);
    res.status(500).send("Server error");
  }
});

// Get all semesters
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM Semesters ORDER BY start_date DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching semesters:", err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
