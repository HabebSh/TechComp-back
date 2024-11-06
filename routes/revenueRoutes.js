const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/revenue-by-category", async (req, res) => {
  try {
    const [results] = await db.promise().query(`
      SELECT 
        p.category_name AS Category,
        SUM(o.quantity * IFNULL(pd.discounted_price, p.price)) AS Total_Revenue
      FROM 
        orders o
      JOIN 
        products p ON o.product_id = p.id
      LEFT JOIN 
        (
          SELECT 
            pd.product_id, 
            p.price * (1 - pd.discount_percentage / 100) AS discounted_price
          FROM 
            product_discounts pd
          JOIN 
            products p ON pd.product_id = p.id
          WHERE 
            NOW() BETWEEN pd.start_date AND pd.end_date
        ) pd ON p.id = pd.product_id
      WHERE 
        o.status = 'received'
      GROUP BY 
        p.category_name;
    `);

    res.json(results);
  } catch (error) {
    console.error("Error fetching revenue by category:", error);
    res.status(500).json({ error: "Database error" });
  }
});
module.exports = router;
