const express = require("express");
const router = express.Router();
const db = require("../db");

// Endpoint to save tax rate
router.post("/tax-rate", (req, res) => {
  const { taxRate } = req.body;
  const sql = "UPDATE settings SET tax_rate = ? WHERE id = 1";
  db.query(sql, [taxRate], (err, result) => {
    if (err) throw err;
    res.json({ success: true });
  });
});

// Endpoint to get tax rate
router.get("/tax-rate", (req, res) => {
  const sql = "SELECT tax_rate FROM settings WHERE id = 1";
  db.query(sql, (err, result) => {
    if (err) throw err;
    res.json(result[0]);
  });
});

module.exports = router;
