require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error("❌ DB connection error:", err.stack);
  }
  console.log("✅ Connected to PostgreSQL!");
  client.query("SELECT NOW()", (err, result) => {
    release();
    if (err) {
      return console.error("Error running test query:", err.stack);
    }
  });
});

module.exports = pool;
