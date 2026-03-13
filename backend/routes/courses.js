const express = require("express");
const router = express.Router();
const pool = require("../db");

// Get all active courses (optional filter by department)
router.get("/", async (req, res) => {
  const { department } = req.query;
  try {
    let query = `
      SELECT c.course_id, c.course_name, c.credits, c.department
      FROM Courses AS c
      WHERE c.is_active = TRUE
    `;
    const params = [];

    if (department) {
      params.push(department);
      query += ` AND c.department = $1`;
    }

    query += ` ORDER BY c.department, c.course_name;`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching all courses:", err.message);
    res.status(500).send("Server error fetching courses");
  }
});

// Search active courses by keyword
router.get("/search", async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res
      .status(400)
      .json({ error: "Search query parameter 'q' is required." });
  }

  try {
    const query = `
      SELECT c.course_id, c.course_name, c.department
      FROM Courses c
      WHERE c.course_name ILIKE $1 AND c.is_active = TRUE
      ORDER BY c.course_name;
    `;
    const result = await pool.query(query, [`%${q}%`]);
    res.json(result.rows);
  } catch (err) {
    console.error(`Error searching courses with query "${q}":`, err.message);
    res.status(500).send("Server error searching courses");
  }
});

// Get details of a single active course
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Get current semester if available
    const semesterResult = await pool.query(`
      SELECT semester_id FROM Semesters
      WHERE CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1;
    `);
    const currentSemesterId =
      semesterResult.rows.length > 0
        ? semesterResult.rows[0].semester_id
        : null;

    let query = `
      SELECT
        c.course_id, c.course_name, c.credits, c.department,
        p.professor_id, p.name as professor_name,
        s.semester_id, s.name as semester_name
      FROM Courses AS c
      LEFT JOIN Classes cl ON c.course_id = cl.course_id AND cl.is_active = TRUE
      LEFT JOIN Professors p ON cl.professor_id = p.professor_id AND p.is_active = TRUE
      LEFT JOIN Semesters s ON cl.semester_id = s.semester_id
      WHERE c.course_id = $1 AND c.is_active = TRUE
    `;
    const params = [id];

    if (currentSemesterId) {
      query += ` AND (cl.semester_id = $2 OR cl.semester_id IS NULL)`;
      params.push(currentSemesterId);
    }
    query += ` ORDER BY s.start_date DESC NULLS LAST LIMIT 1;`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      const courseExistsResult = await pool.query(
        "SELECT course_id, course_name, credits, department FROM Courses WHERE course_id = $1 AND is_active = TRUE",
        [id]
      );
      if (courseExistsResult.rows.length > 0) {
        return res.json({
          ...courseExistsResult.rows[0],
          professor_name: null,
          semester_name: null,
        });
      } else {
        return res.status(404).json({ error: "Active course not found." });
      }
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error fetching course with ID ${id}:`, err.message);
    res.status(500).send("Server error fetching course details");
  }
});

// Get class schedule for a course
router.get("/classes/:class_id/schedule", async (req, res) => {
  const { class_id } = req.params;
  try {
    const classCheck = await pool.query(
      "SELECT 1 FROM Classes WHERE class_id = $1 AND is_active = TRUE",
      [class_id]
    );
    if (classCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Active class offering not found." });
    }

    const query = `
      SELECT cs.day_of_week, cs.start_time, cs.end_time, cs.room
      FROM ClassSchedule AS cs
      WHERE cs.class_id = $1
      ORDER BY
        CASE cs.day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          ELSE 6 END,
        cs.start_time;
    `;
    const result = await pool.query(query, [class_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(
      `Error fetching schedule for class ID ${class_id}:`,
      err.message
    );
    res.status(500).send("Server error fetching class schedule");
  }
});

module.exports = router;
