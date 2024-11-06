const express = require("express");
const db = require("../db"); // Adjust the path to your database connection file
const router = express.Router();
router.get("/suppliers_orders", (req, res) => {
  const sql = `
    SELECT so.*, s.supplier_name 
    FROM suppliers_orders so 
    JOIN suppliers s ON so.company_id = s.company_id
    ORDER BY so.order_date DESC`;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res
        .status(500)
        .json({ error: "Database error while fetching orders" });
    }
    res.status(200).json(results);
  });
});
// Route to handle receiving an order and updating the product quantity
router.post("/receive_order", (req, res) => {
  const { order_id } = req.body;

  if (!order_id) {
    return res.status(400).json({ error: "Order ID is required" });
  }

  // First, fetch the order details from the suppliers_orders table
  const sqlFetchOrder = "SELECT * FROM suppliers_orders WHERE order_id = ?";
  db.query(sqlFetchOrder, [order_id], (err, results) => {
    if (err) {
      console.error("Database fetch error:", err);
      return res
        .status(500)
        .json({ error: "Database error while fetching order details" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = results[0];

    // Update the product quantity and set the received flag to 'yes'
    const sqlUpdateProductAndReceived = `
      UPDATE products, suppliers_orders
      SET products.quantity = products.quantity + ?, suppliers_orders.received = 'yes'
      WHERE products.product_name = ? AND suppliers_orders.order_id = ?`;

    db.query(
      sqlUpdateProductAndReceived,
      [order.quantity, order.supplied_product, order_id],
      (err, updateResult) => {
        if (err) {
          console.error("Database update error:", err);
          return res.status(500).json({
            error:
              "Database error while updating product quantity and received status",
          });
        }

        // Respond with success if the operation is successful
        res.status(200).json({
          message: "Product quantity updated and order marked as received",
          order_id: order_id,
        });
      }
    );
  });
});

module.exports = router; // Export the router
