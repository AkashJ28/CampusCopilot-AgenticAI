const express = require("express");
const router = express.Router();
const pool = require("../db");

// Get logged-in professor profile
router.get("/me", async (req, res) => {
  const professorId = req.user.professorId;

  if (!professorId) {
    return res
      .status(403)
      .json({ error: "Access denied. User is not a professor." });
  }

  try {
    const result = await pool.query(
      "SELECT professor_id, name, department FROM professors WHERE professor_id = $1 AND is_active = TRUE",
      [professorId]
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Professor profile not found or inactive." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(
      `Error fetching profile for professor ID ${professorId}:`,
      err.message
    );
    res.status(500).send("Server error fetching profile");
  }
});

// Get professor’s own classes (optional semester filter)
router.get("/me/classes", async (req, res) => {
  const professorId = req.user.professorId;
  const { semester_id } = req.query;

  if (!professorId) {
    return res.status(403).json({ error: "Access denied. Not a professor." });
  }

  try {
    let query = `
      SELECT cl.class_id, crs.course_name, crs.department, s.name AS semester_name
      FROM Classes AS cl
      JOIN Courses AS crs ON cl.course_id = crs.course_id
      JOIN Semesters AS s ON cl.semester_id = s.semester_id
      WHERE cl.professor_id = $1 AND cl.is_active = TRUE AND crs.is_active = TRUE
    `;
    const params = [professorId];
    let paramCount = 1;

    if (semester_id) {
      paramCount++;
      params.push(semester_id);
      query += ` AND cl.semester_id = $${paramCount}`;
    }
    query += ` ORDER BY s.start_date DESC, crs.course_name;`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(
      `Error fetching classes for professor ID ${professorId}:`,
      err.message
    );
    res.status(500).send("Server error fetching classes");
  }
});

// Get professor’s schedule (optional filters)
router.get("/me/schedule", async (req, res) => {
  const professorId = req.user.professorId;
  const { semester_id, day } = req.query;

  if (!professorId) {
    return res.status(403).json({ error: "Access denied. Not a professor." });
  }

  try {
    let query = `
      SELECT crs.course_name, cs.day_of_week, cs.start_time, cs.end_time, cs.room, cl.class_id
      FROM ClassSchedule AS cs
      JOIN Classes AS cl ON cs.class_id = cl.class_id
      JOIN Courses AS crs ON cl.course_id = crs.course_id
      WHERE cl.professor_id = $1 AND cl.is_active = TRUE AND crs.is_active = TRUE
    `;
    const params = [professorId];
    let paramCount = 1;

    if (semester_id) {
      paramCount++;
      params.push(semester_id);
      query += ` AND cl.semester_id = $${paramCount}`;
    }
    if (day) {
      paramCount++;
      params.push(day);
      query += ` AND cs.day_of_week = $${paramCount}`;
    }
    query += ` ORDER BY cs.start_time;`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(
      `Error fetching schedule for professor ID ${professorId}:`,
      err.message
    );
    res.status(500).send("Server error fetching schedule");
  }
});

// Get specific professor profile by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT professor_id, name, department FROM professors WHERE professor_id = $1 AND is_active = TRUE",
      [id]
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Professor not found or inactive." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error fetching professor with ID ${id}:`, err.message);
    res.status(500).send("Server error");
  }
});

// Get classes of a specific professor
router.get("/:id/classes", async (req, res) => {
  const { id } = req.params;
  const { semester_id } = req.query;

  try {
    let query = `
      SELECT cl.class_id, crs.course_name, crs.department, s.name AS semester_name
      FROM Classes AS cl
      JOIN Courses AS crs ON cl.course_id = crs.course_id
      JOIN Semesters AS s ON cl.semester_id = s.semester_id
      WHERE cl.professor_id = $1 AND cl.is_active = TRUE AND crs.is_active = TRUE
    `;
    const params = [id];
    let paramCount = 1;

    if (semester_id) {
      paramCount++;
      params.push(semester_id);
      query += ` AND cl.semester_id = $${paramCount}`;
    }
    query += ` ORDER BY s.start_date DESC, crs.course_name;`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(
      `Error fetching classes for professor ID ${id}:`,
      err.message
    );
    res.status(500).send("Server error fetching classes");
  }
});

// Get schedule of a specific professor
router.get("/:id/schedule", async (req, res) => {
  const { id } = req.params;
  const { semester_id, day } = req.query;

  try {
    let query = `
      SELECT crs.course_name, cs.day_of_week, cs.start_time, cs.end_time, cs.room, cl.class_id
      FROM ClassSchedule AS cs
      JOIN Classes AS cl ON cs.class_id = cl.class_id
      JOIN Courses AS crs ON cl.course_id = crs.course_id
      WHERE cl.professor_id = $1 AND cl.is_active = TRUE AND crs.is_active = TRUE
    `;
    const params = [id];
    let paramCount = 1;

    if (semester_id) {
      paramCount++;
      params.push(semester_id);
      query += ` AND cl.semester_id = $${paramCount}`;
    }
    if (day) {
      paramCount++;
      params.push(day);
      query += ` AND cs.day_of_week = $${paramCount}`;
    }
    query += ` ORDER BY cs.start_time;`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(
      `Error fetching schedule for professor ID ${id}:`,
      err.message
    );
    res.status(500).send("Server error fetching schedule");
  }
});

module.exports = router;
