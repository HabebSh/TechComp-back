// const express = require("express");
// const router = express.Router();
// const db = require("../db");
// const { generatePDFReceipt, sendReceiptEmail } = require("./utils/emailUtils");

// // Fetch all orders, possibly filtering by status
// router.get("/", async (req, res) => {
//   const { status } = req.query;

//   let sql = `
//     SELECT
//       o.user_id,
//       u.firstName AS customer_name,
//       o.order_date AS order_date,
//       SUM(o.price * o.quantity) AS total,
//       o.status
//     FROM
//       orders o
//     JOIN
//       users u ON o.user_id = u.id
//   `;

//   const params = [];
//   if (status) {
//     sql += " WHERE o.status = ?";
//     params.push(status);
//   }

//   sql += `
//     GROUP BY
//       o.user_id, u.firstName,DATE( o.order_date), o.status
//     ORDER BY
//       o.user_id, o.order_date;
//   `;

//   try {
//     const [settings] = await db
//       .promise()
//       .query("SELECT tax_rate FROM settings LIMIT 1");
//     const taxRate = settings[0].tax_rate;

//     const [results] = await db.promise().query(sql, params);

//     // Calculate total with tax
//     const ordersWithTax = results.map((order) => {
//       const totalWithTax = order.total * (1 + taxRate / 100);
//       return {
//         ...order,
//         totalWithTax: totalWithTax.toFixed(2),
//         tax: (order.total * (taxRate / 100)).toFixed(2),
//       };
//     });

//     res.json(ordersWithTax);
//   } catch (err) {
//     console.error("Error fetching orders:", err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // Fetch orders by user ID and status
// router.get("/user/:userId", async (req, res) => {
//   const userId = req.params.userId;
//   const status = req.query.status || "buying";

//   const sql = `
//     SELECT
//         o.id AS order_id,
//        o.order_date AS order_date,
//         u.firstName AS customer_name,
//         p.product_name,
//         o.price,
//         p.image_path,
//         o.quantity,
//         (o.price * o.quantity) AS total,
//         SUM(o.price * o.quantity) OVER (PARTITION BY DATE(o.order_date)) AS sum_total,
//         o.status
//     FROM
//         orders o
//     JOIN
//         users u ON o.user_id = u.id
//     JOIN
//         products p ON o.product_id = p.id
//     WHERE
//         o.user_id = ? AND o.status = ?;
//   `;

//   try {
//     const [results] = await db.promise().query(sql, [userId, status]);
//     res.json(results);
//   } catch (err) {
//     console.error("Error fetching order details:", err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // Update order status for a specific user
// router.put("/update-status-by-user/:userId", async (req, res) => {
//   const userId = req.params.userId;
//   const { status, confirm } = req.body;

//   if (!confirm) {
//     return res.status(400).json({
//       success: false,
//       confirmationRequired: true,
//       message: "Are you sure you want to mark this order as received?",
//     });
//   }

//   const sqlUpdate = `
//     UPDATE orders
//     SET status = ?
//     WHERE user_id = ? AND status = 'buying';
//   `;

//   try {
//     await db.promise().query(sqlUpdate, [status, userId]);
//     res.json({ success: true, message: "Order status updated." });
//   } catch (err) {
//     console.error("Error updating order status:", err);
//     res.status(500).json({ error: "Database error" });
//   }
// });
// const getUserDetails = async (userId) => {
//   const [rows] = await db
//     .promise()
//     .query(
//       "SELECT firstName,email, address, zipCode FROM users WHERE id = ?",
//       [userId]
//     );
//   return rows[0];
// };

// // Checkout process to create orders
// router.post("/checkout", (req, res) => {
//   console.log("processCheckout called");
//   const { cartItems, paymentDetails, userId } = req.body;

//   if (!Array.isArray(cartItems) || cartItems.length === 0) {
//     return res.status(400).json({ error: "Invalid cart items" });
//   }

//   if (!userId) {
//     return res.status(400).json({ error: "Invalid user ID" });
//   }

//   if (!paymentDetails) {
//     return res.status(400).json({ error: "Missing payment details" });
//   }

//   db.beginTransaction(async (err) => {
//     if (err) {
//       console.error("Error starting transaction:", err);
//       return res.status(500).json({ error: "Transaction error" });
//     }

//     const orderSql =
//       "INSERT INTO orders (user_id, product_id, quantity, price, order_date, status) VALUES (?, ?, ?, ?, NOW(), 'buying')";

//     const getProductDetails = (item, callback) => {
//       const productName = item.product?.product_name || item.name;

//       if (!productName) {
//         console.error(
//           "Product name is missing for one of the cart items:",
//           item
//         );
//         return db.rollback(() => {
//           res.status(400).json({
//             error: "Product name is missing for one of the cart items",
//           });
//         });
//       }
//       console.log(`Looking up product: ${productName}`);

//       const productSql = `
//         SELECT
//           p.id as product_id,
//           p.price,
//           p.image_path,
//           pd.discount_percentage,
//           pd.start_date,
//           pd.end_date
//         FROM
//           products p
//         LEFT JOIN
//           product_discounts pd
//         ON
//           p.id = pd.product_id
//         WHERE
//           p.product_name = ?`;
//       db.query(productSql, [productName], (err, results) => {
//         if (err) {
//           console.error("Error fetching product details:", err);
//           return db.rollback(() =>
//             res.status(500).json({ error: "Product lookup error" })
//           );
//         }
//         if (results.length > 0) {
//           const productDetails = results[0];

//           // Check if the discount is active based on the current date
//           const today = new Date();
//           let price = productDetails.price;

//           if (
//             productDetails.discount_percentage &&
//             new Date(productDetails.start_date) <= today &&
//             new Date(productDetails.end_date) >= today
//           ) {
//             // Apply the discount
//             price = price - (price * productDetails.discount_percentage) / 100;
//           }

//           item.imagePath = productDetails.image_path;
//           item.price = price; // Set the discounted price if applicable
//           callback(productDetails.product_id, price);
//         } else {
//           console.error(`Product not found: ${productName}`);
//           return db.rollback(() =>
//             res.status(404).json(`{ error: Product not found: ${productName} }`)
//           );
//         }
//       });
//     };

//     const insertOrderItems = (item, productId, price, callback) => {
//       if (!productId) {
//         console.error("Product ID is null, cannot insert order");
//         return db.rollback(() =>
//           res
//             .status(400)
//             .json({ error: "Product ID is missing for the order item" })
//         );
//       }

//       db.query(
//         orderSql,
//         [userId, productId, item.quantity, price],
//         (err, orderResult) => {
//           if (err) {
//             console.error("Error inserting order item:", err);
//             return db.rollback(() =>
//               res.status(500).json({ error: "Order insertion error" })
//             );
//           }
//           callback(orderResult.insertId);
//         }
//       );
//     };

//     const updateProductQuantity = (item, productId, callback) => {
//       const updateProductSql =
//         "UPDATE products SET quantity = quantity - ? WHERE id = ?";
//       db.query(updateProductSql, [item.quantity, productId], (err) => {
//         if (err) {
//           console.error("Error updating product quantity:", err);
//           return db.rollback(() =>
//             res.status(500).json({ error: "Product update error" })
//           );
//         }
//         callback();
//       });
//     };

//     const processCartItems = (index) => {
//       if (index < cartItems.length) {
//         const item = cartItems[index];
//         getProductDetails(item, (productId, price) => {
//           insertOrderItems(item, productId, price, () => {
//             updateProductQuantity(item, productId, () => {
//               processCartItems(index + 1);
//             });
//           });
//         });
//       } else {
//         db.commit(async (err) => {
//           if (err) {
//             console.error("Error committing transaction:", err);
//             return db.rollback(() =>
//               res.status(500).json({ error: "Transaction commit error" })
//             );
//           }

//           // Fetch the full user details including address and zipCode
//           const user = await getUserDetails(userId);

//           const orderDetails = {
//             orderId: Date.now(),
//             orderDate: new Date().toLocaleString(),
//           };

//           const filePath = generatePDFReceipt(
//             user,
//             orderDetails,
//             cartItems,
//             paymentDetails
//           );

//           await sendReceiptEmail(user.email, filePath);

//           res.json({ success: true });
//         });
//       }
//     };

//     processCartItems(0);
//   });
// });

// // Fetch user ID by email
// router.get("/email/:email", (req, res) => {
//   const email = req.params.email;
//   const sql = "SELECT id FROM users WHERE email = ?";
//   db.query(sql, [email], (err, results) => {
//     if (err) {
//       console.error("Error fetching user ID:", err);
//       return res.status(500).json({ error: "Database error" });
//     }
//     if (results.length > 0) {
//       res.json({ id: results[0].id });
//     } else {
//       res.status(404).json({ error: "User not found" });
//     }
//   });
// });

// // DATE(o.order_date) as order_date,
// // Fetch user's orders grouped by order date
// router.get("/user/myorders/:userId", async (req, res) => {
//   const userId = req.params.userId;
//   const sql = `
//     SELECT
//     DATE(o.order_date) as order_date,
//     o.id as order_id,
//     u.firstName as customer_name,
//     p.product_name,
//     o.price,
//     p.image_path,
//     o.quantity,
//     (o.price * o.quantity) AS total,
//     SUM(o.price * o.quantity) OVER (PARTITION BY DATE(o.order_date)) AS sum_total,
//     o.status
//   FROM
//     orders o
//   JOIN
//     users u ON o.user_id = u.id
//   JOIN
//     products p ON o.product_id = p.id
//   WHERE
//     o.user_id = ?
//   ORDER BY
//     DATE(o.order_date), o.id;
//   `;

//   try {
//     const [settings] = await db
//       .promise()
//       .query("SELECT tax_rate FROM settings LIMIT 1");
//     const taxRate = settings[0].tax_rate;

//     const [results] = await db.promise().query(sql, [userId]);

//     const groupedOrders = results.reduce((acc, order) => {
//       const date = order.order_date;
//       const key = `${order.customer_name}-${date}`;

//       if (!acc[key]) {
//         acc[key] = {
//           order_id: order.order_id,
//           order_date: date,
//           customer_name: order.customer_name,
//           items: [],
//           total: 0,
//           tax: 0,
//           totalWithTax: 0,
//           status: order.status,
//         };
//       }

//       const orderTotal = parseFloat(order.total);
//       acc[key].items.push(order);
//       acc[key].total += orderTotal;
//       acc[key].tax += orderTotal * (taxRate / 100);
//       acc[key].totalWithTax += orderTotal * (1 + taxRate / 100);

//       return acc;
//     }, {});

//     const orders = Object.values(groupedOrders);
//     res.json(orders);
//   } catch (err) {
//     console.error("Error fetching order details:", err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // Cancel an order
// router.post("/cancel-order", async (req, res) => {
//   const { orderId, orderDate } = req.body;
//   console.log("orderId:", orderId);
//   console.log("orderDate:", orderDate);

//   try {
//     const [orderInfo] = await db.promise().query(
//       `SELECT user_id, DATE(order_date) as order_date
//        FROM orders
//        WHERE id = ?`,
//       [orderId]
//     );

//     if (!orderInfo.length) {
//       return res.status(404).json({ error: "Order not found." });
//     }

//     const userId = orderInfo[0].user_id;
//     const orderDateFromDB = orderInfo[0].order_date;

//     console.log("userId from order:", userId);
//     console.log("orderDate from DB:", orderDateFromDB);

//     const [orderItems] = await db.promise().query(
//       `SELECT
//           product_id,
//           SUM(quantity) as total_quantity
//        FROM
//           orders
//        WHERE
//           user_id = ?
//           AND DATE(order_date) = DATE(?)
//        GROUP BY
//           product_id`,
//       [userId, orderDateFromDB]
//     );

//     console.log("orderItems:", orderItems);

//     if (!orderItems.length) {
//       return res.status(404).json({ error: "Order items not found." });
//     }

//     // Update the order status to "canceled" for all products in the same order (same user_id and order_date)
//     await db
//       .promise()
//       .query(
//         `UPDATE orders SET status = 'canceled' WHERE user_id = ? AND DATE(order_date) = DATE(?)`,
//         [userId, orderDateFromDB]
//       );

//     // Adjust the product quantities for all items in the order
//     for (let item of orderItems) {
//       await db
//         .promise()
//         .query(`UPDATE products SET quantity = quantity + ? WHERE id = ?`, [
//           item.total_quantity,
//           item.product_id,
//         ]);
//     }

//     res.json({
//       success: true,
//       message:
//         "Order and product statuses canceled and product quantities updated.",
//     });
//   } catch (err) {
//     console.error("Error canceling order:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// module.exports = router;
const express = require("express");
const router = express.Router();
const db = require("../db");
const { generatePDFReceipt, sendReceiptEmail } = require("./utils/emailUtils"); // Utility functions for generating PDF receipts and sending emails

// Fetch all orders, possibly filtering by status
router.get("/", async (req, res) => {
  const { status } = req.query; // Extract status from query parameters

  let sql = `
    SELECT 
      o.user_id,
      u.firstName AS customer_name,
      o.order_date AS order_date,
      SUM(o.price * o.quantity) AS total,
      o.status
    FROM 
      orders o
    JOIN 
      users u ON o.user_id = u.id
  `;

  const params = [];
  if (status) {
    sql += " WHERE o.status = ?"; // If status is provided, filter by status
    params.push(status);
  }

  sql += `
    GROUP BY 
      o.user_id, u.firstName, DATE(o.order_date), o.status
    ORDER BY 
      o.user_id, o.order_date;
  `;

  try {
    const [settings] = await db
      .promise()
      .query("SELECT tax_rate FROM settings LIMIT 1"); // Fetch tax rate
    const taxRate = settings[0].tax_rate;

    const [results] = await db.promise().query(sql, params);

    // Calculate total with tax
    const ordersWithTax = results.map((order) => {
      const totalWithTax = order.total * (1 + taxRate / 100);
      return {
        ...order,
        totalWithTax: totalWithTax.toFixed(2),
        tax: (order.total * (taxRate / 100)).toFixed(2),
      };
    });

    res.json(ordersWithTax);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Fetch orders by user ID and status
router.get("/user/:userId", async (req, res) => {
  const userId = req.params.userId; // Extract user ID from the URL parameters
  const status = req.query.status || "buying"; // Default status is "buying"

  const sql = `
    SELECT 
        o.id AS order_id,
        o.order_date AS order_date,
        u.firstName AS customer_name,
        p.product_name,
        o.price,
        p.image_path,
        o.quantity,
        (o.price * o.quantity) AS total,
        SUM(o.price * o.quantity) OVER (PARTITION BY DATE(o.order_date)) AS sum_total,
        o.status
    FROM 
        orders o
    JOIN 
        users u ON o.user_id = u.id
    JOIN 
        products p ON o.product_id = p.id
    WHERE 
        o.user_id = ? AND o.status = ?;
  `;

  try {
    const [results] = await db.promise().query(sql, [userId, status]);
    res.json(results);
  } catch (err) {
    console.error("Error fetching order details:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Update order status for a specific user
router.put("/update-status-by-user/:userId", async (req, res) => {
  const userId = req.params.userId;
  const { status, confirm } = req.body;

  // If confirmation is not provided, ask for confirmation
  if (!confirm) {
    return res.status(400).json({
      success: false,
      confirmationRequired: true,
      message: "Are you sure you want to mark this order as received?",
    });
  }

  const sqlUpdate = `
    UPDATE orders 
    SET status = ? 
    WHERE user_id = ? AND status = 'buying';
  `;

  try {
    await db.promise().query(sqlUpdate, [status, userId]);
    res.json({ success: true, message: "Order status updated." });
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get user details (first name, email, address, zip code)
const getUserDetails = async (userId) => {
  const [rows] = await db
    .promise()
    .query("SELECT firstName,email, address, zipCode FROM users WHERE id = ?", [
      userId,
    ]);
  return rows[0];
};

// Checkout process to create orders
router.post("/checkout", (req, res) => {
  console.log("processCheckout called");
  const { cartItems, paymentDetails, userId } = req.body;

  // Validate if cartItems, userId, and paymentDetails are valid
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ error: "Invalid cart items" });
  }
  if (!userId) {
    return res.status(400).json({ error: "Invalid user ID" });
  }
  if (!paymentDetails) {
    return res.status(400).json({ error: "Missing payment details" });
  }

  // Start a transaction
  db.beginTransaction(async (err) => {
    if (err) {
      console.error("Error starting transaction:", err);
      return res.status(500).json({ error: "Transaction error" });
    }

    const orderSql =
      "INSERT INTO orders (user_id, product_id, quantity, price, order_date, status) VALUES (?, ?, ?, ?, NOW(), 'buying')";

    // Function to fetch product details (price, discount, etc.)
    const getProductDetails = (item, callback) => {
      const productName = item.product?.product_name || item.name;

      if (!productName) {
        console.error(
          "Product name is missing for one of the cart items:",
          item
        );
        return db.rollback(() => {
          res.status(400).json({
            error: "Product name is missing for one of the cart items",
          });
        });
      }

      const productSql = `
        SELECT 
          p.id as product_id, 
          p.price, 
          p.image_path,
          pd.discount_percentage,
          pd.start_date,
          pd.end_date
        FROM 
          products p 
        LEFT JOIN 
          product_discounts pd 
        ON 
          p.id = pd.product_id 
        WHERE 
          p.product_name = ?`;
      db.query(productSql, [productName], (err, results) => {
        if (err) {
          console.error("Error fetching product details:", err);
          return db.rollback(() =>
            res.status(500).json({ error: "Product lookup error" })
          );
        }
        if (results.length > 0) {
          const productDetails = results[0];

          // Check if the discount is active based on the current date
          const today = new Date();
          let price = productDetails.price;

          if (
            productDetails.discount_percentage &&
            new Date(productDetails.start_date) <= today &&
            new Date(productDetails.end_date) >= today
          ) {
            // Apply the discount
            price = price - (price * productDetails.discount_percentage) / 100;
          }

          item.imagePath = productDetails.image_path;
          item.price = price; // Set the discounted price if applicable
          callback(productDetails.product_id, price);
        } else {
          console.error(`Product not found: ${productName}`);
          return db.rollback(() =>
            res.status(404).json(`{ error: Product not found: ${productName} }`)
          );
        }
      });
    };

    // Insert order items into the orders table
    const insertOrderItems = (item, productId, price, callback) => {
      if (!productId) {
        console.error("Product ID is null, cannot insert order");
        return db.rollback(() =>
          res
            .status(400)
            .json({ error: "Product ID is missing for the order item" })
        );
      }

      db.query(
        orderSql,
        [userId, productId, item.quantity, price],
        (err, orderResult) => {
          if (err) {
            console.error("Error inserting order item:", err);
            return db.rollback(() =>
              res.status(500).json({ error: "Order insertion error" })
            );
          }
          callback(orderResult.insertId);
        }
      );
    };

    // Update product quantity in the inventory after placing the order
    const updateProductQuantity = (item, productId, callback) => {
      const updateProductSql =
        "UPDATE products SET quantity = quantity - ? WHERE id = ?";
      db.query(updateProductSql, [item.quantity, productId], (err) => {
        if (err) {
          console.error("Error updating product quantity:", err);
          return db.rollback(() =>
            res.status(500).json({ error: "Product update error" })
          );
        }
        callback();
      });
    };

    // Process each cart item
    const processCartItems = (index) => {
      if (index < cartItems.length) {
        const item = cartItems[index];
        getProductDetails(item, (productId, price) => {
          insertOrderItems(item, productId, price, () => {
            updateProductQuantity(item, productId, () => {
              processCartItems(index + 1);
            });
          });
        });
      } else {
        db.commit(async (err) => {
          if (err) {
            console.error("Error committing transaction:", err);
            return db.rollback(() =>
              res.status(500).json({ error: "Transaction commit error" })
            );
          }

          // Fetch the full user details including address and zipCode
          const user = await getUserDetails(userId);

          const orderDetails = {
            orderId: Date.now(),
            orderDate: new Date().toLocaleString(),
          };

          // Generate a PDF receipt and send it via email
          const filePath = generatePDFReceipt(
            user,
            orderDetails,
            cartItems,
            paymentDetails
          );

          await sendReceiptEmail(user.email, filePath);

          res.json({ success: true });
        });
      }
    };

    processCartItems(0); // Start processing the first item
  });
});

// Fetch user ID by email
router.get("/email/:email", (req, res) => {
  const email = req.params.email;
  const sql = "SELECT id FROM users WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("Error fetching user ID:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (results.length > 0) {
      res.json({ id: results[0].id });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });
});

// Fetch user's orders grouped by order date
router.get("/user/myorders/:userId", async (req, res) => {
  const userId = req.params.userId;
  const sql = `
    SELECT 
    DATE(o.order_date) as order_date,
    o.id as order_id,
    u.firstName as customer_name,
    p.product_name,
    o.price,
    p.image_path,
    o.quantity,
    (o.price * o.quantity) AS total,
    SUM(o.price * o.quantity) OVER (PARTITION BY DATE(o.order_date)) AS sum_total,
    o.status
  FROM 
    orders o
  JOIN 
    users u ON o.user_id = u.id
  JOIN 
    products p ON o.product_id = p.id
  WHERE 
    o.user_id = ?
  ORDER BY 
    DATE(o.order_date), o.id;
  `;

  try {
    const [settings] = await db
      .promise()
      .query("SELECT tax_rate FROM settings LIMIT 1");
    const taxRate = settings[0].tax_rate;

    const [results] = await db.promise().query(sql, [userId]);

    // Group orders by date and calculate total and tax
    const groupedOrders = results.reduce((acc, order) => {
      const date = order.order_date;
      const key = `${order.customer_name}-${date}`;

      if (!acc[key]) {
        acc[key] = {
          order_id: order.order_id,
          order_date: date,
          customer_name: order.customer_name,
          items: [],
          total: 0,
          tax: 0,
          totalWithTax: 0,
          status: order.status,
        };
      }

      const orderTotal = parseFloat(order.total);
      acc[key].items.push(order);
      acc[key].total += orderTotal;
      acc[key].tax += orderTotal * (taxRate / 100);
      acc[key].totalWithTax += orderTotal * (1 + taxRate / 100);

      return acc;
    }, {});

    const orders = Object.values(groupedOrders);
    res.json(orders);
  } catch (err) {
    console.error("Error fetching order details:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Cancel an order
router.post("/cancel-order", async (req, res) => {
  const { orderId, orderDate } = req.body;

  try {
    // Fetch user ID and order date from the database
    const [orderInfo] = await db.promise().query(
      `SELECT user_id, DATE(order_date) as order_date 
       FROM orders 
       WHERE id = ?`,
      [orderId]
    );

    if (!orderInfo.length) {
      return res.status(404).json({ error: "Order not found." });
    }

    const userId = orderInfo[0].user_id;
    const orderDateFromDB = orderInfo[0].order_date;

    // Fetch product quantities for the order to adjust the stock later
    const [orderItems] = await db.promise().query(
      `SELECT 
          product_id, 
          SUM(quantity) as total_quantity
       FROM 
          orders
       WHERE 
          user_id = ? 
          AND DATE(order_date) = DATE(?) 
       GROUP BY 
          product_id`,
      [userId, orderDateFromDB]
    );

    if (!orderItems.length) {
      return res.status(404).json({ error: "Order items not found." });
    }

    // Update the order status to "canceled" for all products in the same order (same user_id and order_date)
    await db
      .promise()
      .query(
        `UPDATE orders SET status = 'canceled' WHERE user_id = ? AND DATE(order_date) = DATE(?)`,
        [userId, orderDateFromDB]
      );

    // Adjust the product quantities for all items in the order
    for (let item of orderItems) {
      await db
        .promise()
        .query(`UPDATE products SET quantity = quantity + ? WHERE id = ?`, [
          item.total_quantity,
          item.product_id,
        ]);
    }

    res.json({
      success: true,
      message:
        "Order and product statuses canceled and product quantities updated.",
    });
  } catch (err) {
    console.error("Error canceling order:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
