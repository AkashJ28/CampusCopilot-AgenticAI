// Import required modules and dependencies
const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const authMiddleware = require("../middleware/authMiddleware");

// =======================================================
// REGISTER NEW USER
// =======================================================
router.post("/register", async (req, res) => {
  const { email, password, name, department, role, entry_date } = req.body;

  // Basic validation
  if (!email || !password || !name || !role) {
    return res
      .status(400)
      .json({ error: "Please provide email, password, name, and role." });
  }
  if (role === "Student" && !entry_date) {
    return res.status(400).json({
      error: "Please provide a valid entry_date (YYYY-MM-DD) for students.",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN"); // Start transaction

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Get role_id from Roles table
    const roleResult = await client.query(
      "SELECT role_id FROM Roles WHERE role_name = $1",
      [role]
    );
    if (roleResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Invalid role specified." });
    }

    const roleId = roleResult.rows[0].role_id;

    // Insert into Users table
    const userInsertQuery =
      "INSERT INTO Users (email, password_hash, role_id) VALUES ($1, $2, $3) RETURNING user_id";
    const userResult = await client.query(userInsertQuery, [
      email,
      hashedPassword,
      roleId,
    ]);
    const newUserId = userResult.rows[0].user_id;

    // Insert into role-specific table
    if (role === "Student") {
      await client.query(
        "INSERT INTO Students (user_id, name, department, entry_date) VALUES ($1, $2, $3, $4)",
        [newUserId, name, department, entry_date]
      );
    } else if (role === "Professor") {
      await client.query(
        "INSERT INTO Professors (user_id, name, department) VALUES ($1, $2, $3)",
        [newUserId, name, department]
      );
    } else {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Profile creation failed for the given role." });
    }

    await client.query("COMMIT"); // Commit transaction
    res
      .status(201)
      .json({ message: `User registered successfully as a ${role}!` });
  } catch (err) {
    await client.query("ROLLBACK");
    // Handle duplicate email error
    if (err.code === "23505") {
      return res
        .status(400)
        .json({ error: "An account with this email already exists." });
    }
    console.error("Registration error:", err.message);
    res.status(500).send("Server error during registration");
  } finally {
    client.release();
  }
});

// =======================================================
// USER LOGIN
// =======================================================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    // Get user details with role and profile info
    const userResult = await pool.query(
      `SELECT
        u.user_id, u.password_hash, u.is_active,
        r.role_name,
        s.student_id, s.entry_date,
        p.professor_id,
        COALESCE(s.name, p.name) as name
      FROM Users u
      JOIN Roles r ON u.role_id = r.role_id
      LEFT JOIN Students s ON u.user_id = s.user_id AND s.is_active = TRUE
      LEFT JOIN Professors p ON u.user_id = p.user_id AND p.is_active = TRUE
      WHERE u.email = $1`,
      [email]
    );

    // Validate user existence
    if (userResult.rows.length === 0)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = userResult.rows[0];
    if (!user.is_active)
      return res.status(403).json({ error: "Account is inactive." });

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    // Prepare JWT payload
    const payload = {
      userId: user.user_id,
      role: user.role_name,
      studentId: user.student_id,
      professorId: user.professor_id,
      name: user.name,
      email: email,
      entryDate: user.entry_date,
    };

    // Sign token (expires in 3 hours)
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "3h",
    });

    res.json({ token, user: payload });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).send("Server Error during login");
  }
});

// =======================================================
// Password Change Route
// =======================================================
router.post("/change-password", authMiddleware, async (req, res) => {
  const { oldPassword, newPassword, confirmNewPassword } = req.body;
  const userId = req.user.userId;

  // Basic validation
  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ error: "New passwords do not match." });
  }
  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "New password must be at least 6 characters." });
  }

  try {
    // Fetch stored password hash
    const userResult = await pool.query(
      "SELECT password_hash FROM Users WHERE user_id = $1",
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const storedHash = userResult.rows[0].password_hash;
    const isMatch = await bcrypt.compare(oldPassword, storedHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect old password." });
    }

    // Hash and update new password
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    await pool.query("UPDATE Users SET password_hash = $1 WHERE user_id = $2", [
      hashedNewPassword,
      userId,
    ]);

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error(
      `Error changing password for user ID ${userId}:`,
      err.message
    );
    res.status(500).send("Server error changing password");
  }
});

// Export router
module.exports = router;
