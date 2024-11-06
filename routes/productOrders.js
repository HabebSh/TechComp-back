const express = require("express");
const router = express.Router();
const db = require("../db"); 
router.get("/low-stock", async (req, res) => {
  try {
    const [results] = await db.promise().query(`
      SELECT *
      FROM products
      WHERE quantity <= 5
    `);
    res.json(results);
  } catch (error) {
    console.error("Error fetching low stock products:", error);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
