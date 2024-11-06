// const express = require("express");
// const db = require("../db"); // Ensure this points to your database configuration
// const router = express.Router();

// // Fetch all unique categories
// router.get("/products/categories", (req, res) => {
//   const sql =
//     "SELECT DISTINCT category_name FROM products WHERE is_active = true";
//   db.query(sql, (err, results) => {
//     if (err) {
//       console.error("Error fetching categories:", err);
//       return res.status(500).json({ error: "Database error" });
//     }
//     res.json(results.map((row) => row.category_name));
//   });
// });

// // Fetch products by category, including discounted price if applicable
// router.get("/products", (req, res) => {
//   const { category } = req.query;
//   const sql = `
//     SELECT 
//       p.id, 
//       p.product_name, 
//       p.price,
//       IF(pd.discount_percentage IS NOT NULL AND CURDATE() BETWEEN pd.start_date AND pd.end_date, 
//         p.price - (p.price * pd.discount_percentage / 100), p.price) AS discounted_price
//     FROM products p
//     LEFT JOIN product_discounts pd ON p.id = pd.product_id
//     WHERE p.is_active = true AND p.category_name = ?`;
//   db.query(sql, [category], (err, results) => {
//     if (err) {
//       console.error("Error fetching products:", err);
//       return res.status(500).json({ error: "Database error" });
//     }
//     res.json(results);
//   });
// });

// // Add or update a discount for a product or a category
// router.post("/add-discount", (req, res) => {
//   const { productId, category, discountPercentage, startDate, endDate } =
//     req.body;

//   // Validate required fields
//   if (!discountPercentage || !startDate || !endDate) {
//     return res
//       .status(400)
//       .json({ message: "Discount, start date, and end date are required." });
//   }

//   // Validate dates
//   const currentDate = new Date().toISOString().split("T")[0];
//   if (new Date(startDate) < new Date(currentDate)) {
//     return res
//       .status(400)
//       .json({ message: "Start date must be today or in the future." });
//   }

//   if (new Date(startDate) >= new Date(endDate)) {
//     return res
//       .status(400)
//       .json({ message: "End date must be after the start date." });
//   }

//   // Check if the request is to apply a discount to a specific product
//   if (productId) {
//     const checkProductSql =
//       "SELECT id FROM product_discounts WHERE product_id = ?";
//     db.query(checkProductSql, [productId], (err, results) => {
//       if (err) {
//         console.error("Error checking existing product discount:", err);
//         return res
//           .status(500)
//           .json({ error: "Database error when checking product discount." });
//       }

//       if (results.length > 0) {
//         const updateSql = `
//           UPDATE product_discounts
//           SET discount_percentage = ?, start_date = ?, end_date = ?
//           WHERE product_id = ?
//         `;
//         db.query(
//           updateSql,
//           [discountPercentage, startDate, endDate, productId],
//           (err, result) => {
//             if (err) {
//               console.error("Error updating product discount:", err);
//               return res.status(500).json({
//                 error: "Database error when updating product discount.",
//               });
//             }
//             res.json({
//               success: true,
//               message: "Discount updated for the specific product.",
//             });
//           }
//         );
//       } else {
//         const insertSql = `
//           INSERT INTO product_discounts (product_id, product_name, discount_percentage, start_date, end_date)
//           SELECT id, product_name, ?, ?, ?
//           FROM products
//           WHERE id = ? AND is_active = true
//         `;
//         db.query(
//           insertSql,
//           [discountPercentage, startDate, endDate, productId],
//           (err, result) => {
//             if (err) {
//               console.error("Error inserting product discount:", err);
//               return res.status(500).json({
//                 error: "Database error when inserting product discount.",
//               });
//             }
//             res.json({
//               success: true,
//               message: "Discount added for the specific product.",
//             });
//           }
//         );
//       }
//     });
//   } else if (category) {
//     // Apply discount to all products in the category
//     const categorySql = `
//       SELECT pd.id AS discount_id, pd.start_date AS existing_start_date, pd.end_date AS existing_end_date
//       FROM product_discounts pd
//       JOIN products p ON pd.product_id = p.id
//       WHERE p.category_name = ? AND pd.start_date IS NOT NULL AND pd.end_date IS NOT NULL
//     `;
//     db.query(categorySql, [category], (err, results) => {
//       if (err) {
//         console.error("Error checking existing discounts in category:", err);
//         return res
//           .status(500)
//           .json({ error: "Database error when checking category discounts." });
//       }

//       const updateDiscounts = results.filter((discount) => {
//         return (
//           new Date(discount.existing_start_date) <= new Date(endDate) &&
//           new Date(discount.existing_end_date) >= new Date(startDate)
//         );
//       });

//       if (updateDiscounts.length > 0) {
//         updateDiscounts.forEach((discount) => {
//           const updateSql = `
//             UPDATE product_discounts
//             SET discount_percentage = ?, start_date = ?, end_date = ?
//             WHERE id = ?
//           `;
//           db.query(
//             updateSql,
//             [discountPercentage, startDate, endDate, discount.discount_id],
//             (err) => {
//               if (err) {
//                 console.error("Error updating existing discount:", err);
//               }
//             }
//           );
//         });
//       }

//       const applyNewDiscountSql = `
//         INSERT INTO product_discounts (product_id, product_name, discount_percentage, start_date, end_date)
//         SELECT id, product_name, ?, ?, ?
//         FROM products
//         WHERE category_name = ? AND id NOT IN (SELECT product_id FROM product_discounts)
//         ON DUPLICATE KEY UPDATE
//           discount_percentage = VALUES(discount_percentage),
//           start_date = VALUES(start_date),
//           end_date = VALUES(end_date)
//       `;
//       db.query(
//         applyNewDiscountSql,
//         [discountPercentage, startDate, endDate, category],
//         (err, result) => {
//           if (err) {
//             console.error("Error applying category discount:", err);
//             return res.status(500).json({
//               error: "Database error when applying category discount.",
//             });
//           }
//           res.json({
//             success: true,
//             message: "Discount applied to all products in category.",
//           });
//         }
//       );
//     });
//   } else {
//     res.status(400).json({ message: "Please specify a category or product." });
//   }
// });

// module.exports = router;
const express = require("express");
const db = require("../db"); // Ensure this points to your database configuration
const router = express.Router();

// Fetch all unique categories
router.get("/products/categories", (req, res) => {
  // SQL query to fetch distinct categories from the products table where products are active
  const sql =
    "SELECT DISTINCT category_name FROM products WHERE is_active = true";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching categories:", err);
      return res.status(500).json({ error: "Database error" });
    }
    // Return the list of unique categories
    res.json(results.map((row) => row.category_name));
  });
});

// Fetch products by category, including discounted price if applicable
router.get("/products", (req, res) => {
  const { category } = req.query;
  // SQL query to fetch products based on category and calculate discounted price if applicable
  const sql = `
    SELECT 
      p.id, 
      p.product_name, 
      p.price,
      IF(pd.discount_percentage IS NOT NULL AND CURDATE() BETWEEN pd.start_date AND pd.end_date, 
        p.price - (p.price * pd.discount_percentage / 100), p.price) AS discounted_price
    FROM products p
    LEFT JOIN product_discounts pd ON p.id = pd.product_id
    WHERE p.is_active = true AND p.category_name = ?`;
  db.query(sql, [category], (err, results) => {
    if (err) {
      console.error("Error fetching products:", err);
      return res.status(500).json({ error: "Database error" });
    }
    // Return the list of products along with discounted prices
    res.json(results);
  });
});

// Add or update a discount for a product or a category
router.post("/add-discount", (req, res) => {
  const { productId, category, discountPercentage, startDate, endDate } =
    req.body;

  // Validate required fields for discount creation
  if (!discountPercentage || !startDate || !endDate) {
    return res
      .status(400)
      .json({ message: "Discount, start date, and end date are required." });
  }

  // Validate that the start date is today or in the future
  const currentDate = new Date().toISOString().split("T")[0];
  if (new Date(startDate) < new Date(currentDate)) {
    return res
      .status(400)
      .json({ message: "Start date must be today or in the future." });
  }

  // Validate that the end date is after the start date
  if (new Date(startDate) >= new Date(endDate)) {
    return res
      .status(400)
      .json({ message: "End date must be after the start date." });
  }

  // Apply a discount to a specific product if productId is provided
  if (productId) {
    const checkProductSql =
      "SELECT id FROM product_discounts WHERE product_id = ?";
    db.query(checkProductSql, [productId], (err, results) => {
      if (err) {
        console.error("Error checking existing product discount:", err);
        return res
          .status(500)
          .json({ error: "Database error when checking product discount." });
      }

      if (results.length > 0) {
        // If the product already has a discount, update it
        const updateSql = `
          UPDATE product_discounts
          SET discount_percentage = ?, start_date = ?, end_date = ?
          WHERE product_id = ?
        `;
        db.query(
          updateSql,
          [discountPercentage, startDate, endDate, productId],
          (err, result) => {
            if (err) {
              console.error("Error updating product discount:", err);
              return res.status(500).json({
                error: "Database error when updating product discount.",
              });
            }
            // Return a success message after updating the discount
            res.json({
              success: true,
              message: "Discount updated for the specific product.",
            });
          }
        );
      } else {
        // If the product doesn't have a discount, insert a new one
        const insertSql = `
          INSERT INTO product_discounts (product_id, product_name, discount_percentage, start_date, end_date)
          SELECT id, product_name, ?, ?, ?
          FROM products
          WHERE id = ? AND is_active = true
        `;
        db.query(
          insertSql,
          [discountPercentage, startDate, endDate, productId],
          (err, result) => {
            if (err) {
              console.error("Error inserting product discount:", err);
              return res.status(500).json({
                error: "Database error when inserting product discount.",
              });
            }
            // Return a success message after adding the discount
            res.json({
              success: true,
              message: "Discount added for the specific product.",
            });
          }
        );
      }
    });
  } else if (category) {
    // Apply discount to all products in the specified category
    const categorySql = `
      SELECT pd.id AS discount_id, pd.start_date AS existing_start_date, pd.end_date AS existing_end_date
      FROM product_discounts pd
      JOIN products p ON pd.product_id = p.id
      WHERE p.category_name = ? AND pd.start_date IS NOT NULL AND pd.end_date IS NOT NULL
    `;
    db.query(categorySql, [category], (err, results) => {
      if (err) {
        console.error("Error checking existing discounts in category:", err);
        return res
          .status(500)
          .json({ error: "Database error when checking category discounts." });
      }

      // Update existing discounts that overlap with the new discount dates
      const updateDiscounts = results.filter((discount) => {
        return (
          new Date(discount.existing_start_date) <= new Date(endDate) &&
          new Date(discount.existing_end_date) >= new Date(startDate)
        );
      });

      if (updateDiscounts.length > 0) {
        updateDiscounts.forEach((discount) => {
          const updateSql = `
            UPDATE product_discounts
            SET discount_percentage = ?, start_date = ?, end_date = ?
            WHERE id = ?
          `;
          db.query(
            updateSql,
            [discountPercentage, startDate, endDate, discount.discount_id],
            (err) => {
              if (err) {
                console.error("Error updating existing discount:", err);
              }
            }
          );
        });
      }

      // Apply new discounts to products in the category that do not already have discounts
      const applyNewDiscountSql = `
        INSERT INTO product_discounts (product_id, product_name, discount_percentage, start_date, end_date)
        SELECT id, product_name, ?, ?, ?
        FROM products
        WHERE category_name = ? AND id NOT IN (SELECT product_id FROM product_discounts)
        ON DUPLICATE KEY UPDATE
          discount_percentage = VALUES(discount_percentage),
          start_date = VALUES(start_date),
          end_date = VALUES(end_date)
      `;
      db.query(
        applyNewDiscountSql,
        [discountPercentage, startDate, endDate, category],
        (err, result) => {
          if (err) {
            console.error("Error applying category discount:", err);
            return res.status(500).json({
              error: "Database error when applying category discount.",
            });
          }
          // Return a success message after applying the discount to all products in the category
          res.json({
            success: true,
            message: "Discount applied to all products in category.",
          });
        }
      );
    });
  } else {
    // If neither productId nor category is provided, return an error
    res.status(400).json({ message: "Please specify a category or product." });
  }
});

module.exports = router;
