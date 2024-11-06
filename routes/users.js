const express = require("express");
const db = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const router = express.Router();

// Fetch user profile by email (using query parameter)
router.get("/profile", (req, res) => {
  const email = req.query.email;
  console.log("User's Email is : ", email); // Get email from query parameters
  if (!email) {
    return res.status(400).json({ error: "Email query parameter is required" });
  }
  const sql = "SELECT id, email FROM users WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("Error fetching user profile:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });
});

router.get("/user", (req, res) => {
  const { email } = req.query;
  const sql =
    "SELECT firstName, email, phoneNumber, address, city, zipCode, isManager FROM users WHERE email = ?";
  db.query(sql, [email], (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      res.send({ success: true, user: result[0] });
    } else {
      res.send({ success: false, message: "User not found" });
    }
  });
});

router.get("/user-id/:email", (req, res) => {
  const email = req.params.email;
  const sql = "SELECT id FROM users WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("Error fetching user ID:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (results.length > 0) {
      res.json({ userId: results[0].id });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  });
});

// User login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      const user = result[0];
      // Compare hashed password with the user's password
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        const accessSession = jwt.sign(
          {
            email: user.email,
            isManager: user.isManager,
          },
          "qweasdzxcqweasdzxcqweasdzxcqweasdzxc",
          { expiresIn: "1m" }
        );
        res.send({
          success: true,
          name: user.firstName,
          isManager: user.isManager,
          email: user.email, // Include email in the response
        });
      } else {
        res.send({ success: false, message: "Invalid email or password" });
      }
    } else {
      res.send({ success: false, message: "Invalid email or password" });
    }
  });
});

// User registration
router.post("/register", async (req, res) => {
  const {
    firstName,
    email,
    password,
    phoneNumber,
    address,
    city,
    zipCode,
    isManager,
  } = req.body;

  // Check if email already exists
  const checkEmailSql = "SELECT * FROM users WHERE email = ?";
  db.query(checkEmailSql, [email], async (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      return res.send({ success: false, message: "Email already registered" });
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const sql =
      "INSERT INTO users (firstName, email, password, phoneNumber, address, city, zipCode, isManager) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    db.query(
      sql,
      [
        firstName,
        email,
        hashedPassword, // Store hashed password
        phoneNumber,
        address,
        city,
        zipCode,
        isManager,
      ],
      (err, result) => {
        if (err) throw err;
        res.send({ success: true });
      }
    );
  });
});

// Register Manager (similar to User registration)
router.post("/registerManager", async (req, res) => {
  const {
    firstName,
    email,
    password,
    phoneNumber,
    address,
    city,
    zipCode,
    isManager,
  } = req.body;

  // Check if email already exists
  const checkEmailSql = "SELECT * FROM users WHERE email = ?";
  db.query(checkEmailSql, [email], async (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      return res.send({ success: false, message: "Email already registered" });
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const sql =
      "INSERT INTO users (firstName, email, password, phoneNumber, address, city, zipCode, isManager) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    db.query(
      sql,
      [
        firstName,
        email,
        hashedPassword, // Store hashed password
        phoneNumber,
        address,
        city,
        zipCode,
        isManager,
      ],
      (err, result) => {
        if (err) throw err;
        res.send({ success: true });
      }
    );
  });
});

// Update user details
router.put("/updateUser", async (req, res) => {
  const {
    firstName,
    email,
    password,
    phoneNumber,
    address,
    city,
    zipCode,
    isManager,
  } = req.body;

  // Hash the password before updating if it exists
  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  const updateSql =
    "UPDATE users SET firstName = ?, password = ?, phoneNumber = ?, address = ?, city = ?, zipCode = ?, isManager = ? WHERE email = ?";
  db.query(
    updateSql,
    [
      firstName,
      hashedPassword || password, // Use hashedPassword if it's provided, otherwise keep the existing one
      phoneNumber,
      address,
      city,
      zipCode,
      isManager,
      email,
    ],
    (err, result) => {
      if (err) throw err;
      if (result.affectedRows === 0) {
        return res.send({ success: false, message: "User not found" });
      }
      res.send({ success: true });
    }
  );
});

module.exports = router;
