const express = require("express");
const db = require("../db");

const router = express.Router();

// Get all suppliers
router.get("/", (req, res) => {
  const sql = "SELECT * FROM suppliers ORDER BY supplier_id DESC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// Add a new supplier
router.post("/", (req, res) => {
  const { company_id, supplier_name, email, supplied_product, price } =
    req.body;
  if (!company_id || !supplier_name || !email || !supplied_product || !price) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const sql =
    "INSERT INTO suppliers (company_id, supplier_name, email, supplied_product, price) VALUES (?, ?, ?, ?, ?)";
  db.query(
    sql,
    [company_id, supplier_name, email, supplied_product, price],
    (err, result) => {
      if (err) {
        console.error("Database insert error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.status(201).json({
        supplier_id: result.insertId,
        company_id,
        supplier_name,
        email,
        supplied_product,
        price,
      });
    }
  );
});
router.put("/:supplier_id", (req, res) => {
  const { supplier_id } = req.params;
  const { company_id, supplier_name, email, supplied_product, price } =
    req.body;

  const sqlUpdateSupplier = `
    UPDATE suppliers
    SET company_id = ?, supplier_name = ?, email = ?, supplied_product = ?, price = ?
    WHERE supplier_id = ?`;

  db.query(
    sqlUpdateSupplier,
    [
      company_id,
      supplier_name,
      email,
      supplied_product,
      parseFloat(price),
      supplier_id,
    ],
    (err, result) => {
      if (err) {
        console.error("Database update error:", err);
        return res
          .status(500)
          .json({ error: "Database error while updating supplier" });
      }
      res.status(200).json({ message: "Supplier updated successfully" });
    }
  );
});

module.exports = router;
