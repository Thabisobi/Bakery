// backend/server.js
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
require("dotenv").config();

const app = express();

// ✅ Use Railway's PORT or fallback to 5000
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*", // Allow frontend hosted on Railway
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);
app.use(bodyParser.json());

// ✅ MySQL connection (environment variables for Railway)
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "bakery_db",
  port: process.env.DB_PORT || 3306,
});

db.connect((err) => {
  if (err) console.error("❌ MySQL connection error:", err);
  else console.log("✅ Connected to MySQL database!");
});

// ---------------- USERS ----------------

// Register
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: "All fields required" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY")
            return res.status(400).json({ error: "Username or email exists" });
          return res.status(500).json({ error: err });
        }
        res.json({ message: "User registered successfully" });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "All fields required" });

  db.query("SELECT * FROM users WHERE username = ?", [username], async (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0)
      return res.status(400).json({ error: "User not found" });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Incorrect password" });

    res.json({
      message: "Login successful",
      user: { id: user.id, username: user.username },
    });
  });
});

// ---------------- ORDERS ----------------

app.get("/api/orders", (req, res) => {
  db.query("SELECT * FROM orders", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.post("/api/orders", (req, res) => {
  const { customerName, product, quantity, orderDate, status } = req.body;

  const createdAt = orderDate
    ? new Date(orderDate).toISOString().slice(0, 19).replace("T", " ")
    : new Date().toISOString().slice(0, 19).replace("T", " ");

  db.query(
    "INSERT INTO orders (customer, item, quantity, status, created_at) VALUES (?, ?, ?, ?, ?)",
    [customerName, product, quantity, status || "Pending", createdAt],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({
        id: result.insertId,
        customer: customerName,
        item: product,
        quantity,
        status,
        created_at: createdAt,
      });
    }
  );
});

app.put("/api/orders/:id", (req, res) => {
  const { id } = req.params;
  const { customer, item, quantity } = req.body;
  db.query(
    "UPDATE orders SET customer=?, item=?, quantity=? WHERE id=?",
    [customer, item, quantity, id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Order updated" });
    }
  );
});

app.delete("/api/orders/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM orders WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Order deleted" });
  });
});

// ✅ Start server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
