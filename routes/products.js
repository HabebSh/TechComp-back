const express = require("express");
const db = require("../db");
const { upload } = require("../app");

const router = express.Router();

router.get("/", (req, res) => {
  const category = req.query.category;
  let sql = `
    SELECT 
    p.*, 
    d.discount_percentage, 
    d.start_date, 
    d.end_date 
FROM products p
LEFT JOIN product_discounts d ON p.id = d.product_id
WHERE p.is_active = true 
  AND p.quantity > 0

  `;
  if (category) {
    sql += " AND p.category_name = ?";
  }
  sql+=`ORDER BY 
    CASE 
        WHEN d.discount_percentage IS NOT NULL THEN 1 
        ELSE 0 
    END DESC,                  
    d.start_date DESC,        
    p.id DESC`;
  db.query(sql, [category], (err, result) => {
    if (err) throw err;
    res.send(result);
  });
});

router.get("/managerProducts", (req, res) => {
  const category = req.query.category;
  let sql = `
    SELECT 
      p.*, 
      d.discount_percentage, 
      d.start_date, 
      d.end_date 
    FROM products p
    LEFT JOIN product_discounts d ON p.id = d.product_id
    WHERE p.is_active = true or is_active= false
  `;
  if (category) {
    sql += " AND p.category_name = ?";
  }
  db.query(sql, [category], (err, result) => {
    if (err) throw err;
    res.send(result);
  });
});

router.get("/searchBar", (req, res) => {
  const searchTerm = req.query.q;
  const sql =
    "SELECT * FROM products WHERE product_name LIKE ? AND is_active = true";
  db.query(sql, `%${searchTerm}%`, (err, result) => {
    if (err) throw err;
    res.send(result);
  });
});

router.get("/search", (req, res) => {
  const searchTerm = req.query.q;
  const sql = `
    SELECT 
      p.*, 
      d.discount_percentage, 
      d.start_date, 
      d.end_date 
    FROM products p
    LEFT JOIN product_discounts d ON p.id = d.product_id
    WHERE p.product_name LIKE ? AND p.is_active = true
  `;
  db.query(sql, [`%${searchTerm}%`], (err, result) => {
    if (err) throw err;
    res.send(result);
  });
});

router.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const {
    product_name,
    supplier,
    description,
    price,
    memory,
    type,
    category_name,
    quantity,
  } = req.body;
  const imagePath = `/uploads/${req.file.filename}`;
  const sql = `
    INSERT INTO products 
    (product_name, supplier, description, price, memory, type, image_path, category_name, quantity, is_active) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      product_name,
      supplier,
      description,
      price,
      memory,
      type,
      imagePath,
      category_name,
      quantity,
      true, // New products are active by default
    ],
    (err, result) => {
      if (err) {
        console.error("Database insert error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({
        id: result.insertId,
        product_name,
        supplier,
        description,
        price,
        memory,
        type,
        image_path: imagePath,
        category_name,
        quantity,
        is_active: true,
      });
    }
  );
});

router.put("/:id", upload.single("image"), (req, res) => {
  const {
    product_name,
    supplier,
    description,
    price,
    memory,
    type,
    category_name,
    quantity,
    is_active, // include is_active in the request body
  } = req.body;
  let imagePath = req.body.image_path;
  if (req.file) {
    imagePath = `/uploads/${req.file.filename}`;
  }
  const sql = `
    UPDATE products 
    SET 
      product_name = ?, 
      supplier = ?, 
      description = ?, 
      price = ?, 
      memory = ?, 
      type = ?, 
      image_path = ?, 
      category_name = ?, 
      quantity = ?, 
      is_active = ? 
    WHERE id = ?
  `;
  db.query(
    sql,
    [
      product_name,
      supplier,
      description,
      price,
      memory,
      type,
      imagePath,
      category_name,
      quantity,
      is_active, // update the is_active field
      req.params.id,
    ],
    (err, result) => {
      if (err) {
        console.error("Failed to update product:", err);
        res.status(500).send("Failed to update product");
      } else {
        res.send({
          id: req.params.id,
          product_name,
          supplier,
          description,
          price,
          memory,
          type,
          image_path: imagePath,
          category_name,
          quantity,
          is_active, // include is_active in the response
        });
      }
    }
  );
});

module.exports = router;
