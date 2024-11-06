
const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");

// Fetch user profile by customer ID
router.get("/p/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const [userProfile] = await db
      .promise()
      .query(
        "SELECT firstName, email, phoneNumber, address, city, zipCode FROM users WHERE id = ?",
        [userId]
      );

    if (userProfile.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json(userProfile[0]);
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user profile by customer ID
router.put("/d/:id", async (req, res) => {
  const userId = req.params.id;
  const { firstName, email, phoneNumber, address, city, zipCode, password } =
    req.body;

  try {
    let hashedPassword;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const query = `
      UPDATE users 
      SET firstName = ?, email = ?, phoneNumber = ?, address = ?, city = ?, zipCode = ?, password = COALESCE(?, password) 
      WHERE id = ?`;
    const [updateResult] = await db
      .promise()
      .query(query, [
        firstName,
        email,
        phoneNumber,
        address,
        city,
        zipCode,
        hashedPassword,
        userId,
      ]);

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({ success: true, message: "Profile updated successfully." });
  } catch (err) {
    console.error("Error updating user profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
