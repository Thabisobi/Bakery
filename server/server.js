// server/server.js
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",       // XAMPP default
  password: "",       // XAMPP default
  database: "bakery_db",
});

db.connect((err) => {
  if (err) console.error("❌ MySQL connection error:", err);
  else console.log("✅ Connected to MySQL database!");
});

// ------------------- USERS -------------------

// Register
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: "All fields are required" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY")
            return res.status(400).json({ error: "Username or email already exists" });
          return res.status(500).json({ error: err.message });
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
    return res.status(400).json({ error: "All fields are required" });

  db.query("SELECT * FROM users WHERE username = ?", [username], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(400).json({ error: "User not found" });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Incorrect password" });

    res.json({
      message: "Login successful",
      user: { id: user.id, username: user.username, email: user.email },
    });
  });
});

// ------------------- ORDERS -------------------

// Get all orders
app.get("/api/orders", (req, res) => {
  db.query("SELECT * FROM orders", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Add a new order
app.post("/api/orders", (req, res) => {
  const { customerName, product, quantity, orderDate, status } = req.body;

  const createdAt = orderDate
    ? new Date(orderDate).toISOString().slice(0, 19).replace("T", " ")
    : new Date().toISOString().slice(0, 19).replace("T", " ");

  db.query(
    "INSERT INTO orders (customer, item, quantity, status, created_at) VALUES (?, ?, ?, ?, ?)",
    [customerName, product, quantity, status || "Pending", createdAt],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        id: result.insertId,
        customer: customerName,
        item: product,
        quantity,
        status: status || "Pending",
        created_at: createdAt,
      });
    }
  );
});

// Update an order
app.put("/api/orders/:id", (req, res) => {
  const { id } = req.params;
  const { customer, item, quantity, status } = req.body;

  db.query(
    "UPDATE orders SET customer=?, item=?, quantity=?, status=? WHERE id=?",
    [customer, item, quantity, status, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Order updated successfully" });
    }
  );
});

// Delete an order
app.delete("/api/orders/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM orders WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Order deleted successfully" });
  });
});

// ------------------- START SERVER -------------------
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);

