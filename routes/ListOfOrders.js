// const express = require("express");
// const router = express.Router();
// const db = require("../db"); // Assuming you have a db.js for database connection

// // Get orders for a specific customer
// router.get("/customer/:customerId", async (req, res) => {
//   const { customerId } = req.params;
//   try {
//     const orders = await db.query(
//       `SELECT
//          o.id,
//          o.order_date,
//          SUM(p.price * oi.quantity) AS total,
//          GROUP_CONCAT(
//            JSON_OBJECT(
//              'product_id', p.id,
//              'name', p.product_name,
//              'quantity', oi.quantity,
//              'price', p.price,
//              'image', p.image_path
//            )
//          ) AS products
//        FROM orders o
//        JOIN order_items oi ON o.id = oi.order_id
//        JOIN products p ON oi.product_id = p.id
//        WHERE o.user_id = ?
//        GROUP BY o.id, o.order_date`,
//       [customerId]
//     );

//     // Parse the JSON string in the products field
//     orders.forEach((order) => {
//       order.products = JSON.parse(`[${order.products}]`); // Wrap in brackets to create a valid JSON array
//     });

//     res.json(orders);
//   } catch (err) {
//     console.error("Error fetching orders:", err);
//     res.status(500).send("Server error");
//   }
// });

// module.exports = router;
const express = require("express");
const router = express.Router();
const db = require("../db"); // Assuming you have a db.js for database connection

// Get orders for a specific customer
router.get("/customer/:customerId", async (req, res) => {
  const { customerId } = req.params;
  try {
    // SQL query to fetch orders for a specific customer including product details
    const orders = await db.query(
      `SELECT 
         o.id, 
         o.order_date, 
         SUM(p.price * oi.quantity) AS total,
         GROUP_CONCAT(
           JSON_OBJECT(
             'product_id', p.id,
             'name', p.product_name,
             'quantity', oi.quantity,
             'price', p.price,
             'image', p.image_path
           )
         ) AS products
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE o.user_id = ?
       GROUP BY o.id, o.order_date`,
      [customerId]
    );

    // Parse the JSON string in the products field
    orders.forEach((order) => {
      order.products = JSON.parse(`[${order.products}]`); // Wrap in brackets to create a valid JSON array
    });

    // Return the orders with product details
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
