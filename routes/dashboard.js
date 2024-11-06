// const express = require("express");
// const router = express.Router();
// const db = require("../db");

// router.get("/earliest", (req, res) => {
//   const query = `SELECT MIN(order_date) AS earliest_order_date FROM orders where status!='canceled'`;

//   // Execute the SQL query
//   db.query(query, (err, result) => {
//     if (err) {
//       console.error("Error fetching the earliest order date:", err);
//       res.status(500).json({ error: "An error occurred while fetching data" });
//     } else {
//       // Return the result as a JSON object
//       res.json(result[0]);
//     }
//   });
// });

// router.get("/stats", async (req, res) => {
//   const { startDate, endDate } = req.query;
//   let dateCondition = "";

//   // Validate that both startDate and endDate are provided
//   if (startDate && endDate) {
//     dateCondition = `o.order_date BETWEEN '${startDate}' AND '${endDate}'`;
//     console.log(startDate);
//   } else {
//     return res
//       .status(400)
//       .json({ error: "Both startDate and endDate are required" });
//   }

//   try {
//     // Get the earliest order date
//     const [earliestDateResult] = await db.promise().query(`
//       SELECT MIN(order_date) as earliest_date FROM orders
//     `);
//     const earliestDate = earliestDateResult[0].earliest_date;

//     // Get the tax rate from settings
//     const [taxResult] = await db.promise().query(`
//       SELECT tax_rate FROM settings LIMIT 1
//     `);
//     const taxRate = taxResult[0].tax_rate;

//     // Fetch orders within the specified date range
//     const [results] = await db.promise().query(`
//      SELECT
//     p.product_name,
//     o.price,
//     o.quantity AS quantity_sold,
//     o.status,
//     COALESCE(p.category_name, 'Uncategorized') AS category_name  -- Set default category as 'Uncategorized'
// FROM
//     orders o
// JOIN
//     products p ON o.product_id = p.id
// WHERE
//     ${dateCondition} AND o.status != 'canceled';
//     `);

//     // If no orders found, return a 200 status with an empty product data and a message
//     if (results.length === 0) {
//       console.log("No orders found");
//       return res.status(200).json({
//         productData: [],
//         maxQuantityProduct: null,
//         totalProductsSold: 0,
//         totalRevenue: 0,
//         message: "No orders found within the specified date range.",
//         earliestDate,
//       });
//     }

//     // Filter and process the results
//     const validResults = results.filter(
//       (result) => result.product_name && result.price
//     );

//     const productData = validResults.map((result) => {
//       const priceAfterDiscount =  result.price
//       return {
//         product_name: result.product_name,
//         price: priceAfterDiscount,
//         quantity_sold: result.quantity_sold,
//         status: result.status,
//         category_name: result.category_name || "Uncategorized",
//       };
//     });

//     const maxQuantityProduct = productData.reduce(
//       (max, product) =>
//         product.quantity_sold > max.quantity_sold ? product : max,
//       productData[0]
//     );

//     const totalProductsSold = productData.reduce(
//       (acc, product) => acc + product.quantity_sold,
//       0
//     );

//     const totalRevenueWithoutTax = productData.reduce(
//       (acc, product) => acc + product.price * product.quantity_sold,
//       0
//     );

//     const totalRevenueWithTax = totalRevenueWithoutTax;

//     // Return the results as a JSON response including the earliest order date
//     res.status(200).json({
//       productData,
//       maxQuantityProduct: maxQuantityProduct.product_name,
//       totalProductsSold,
//       totalRevenue: totalRevenueWithTax,
//       taxRate,
//       earliestDate,
//     });
//   } catch (error) {
//     console.error("Error fetching product data:", error);
//     res.status(500).json({ error: "Database error" });
//   }
// });
// router.get("/low-stock-products", (req, res) => {
//   const query = "SELECT product_name FROM products WHERE quantity <= 5";

//   db.query(query, (error, results) => {
//     if (error) {
//       return res.status(500).send("Error fetching low stock products");
//     }
//     res.json(results);
//   });
// });

// module.exports = router;
const express = require("express");
const router = express.Router();
const db = require("../db");

// Route to get the earliest order date that is not canceled
router.get("/earliest", (req, res) => {
  const query = `SELECT MIN(order_date) AS earliest_order_date FROM orders where status!='canceled'`;

  // Execute the SQL query to fetch the earliest order date
  db.query(query, (err, result) => {
    if (err) {
      console.error("Error fetching the earliest order date:", err);
      res.status(500).json({ error: "An error occurred while fetching data" });
    } else {
      // Return the earliest date as a JSON object
      res.json(result[0]);
    }
  });
});

// Route to get statistics on orders within a date range
router.get("/stats", async (req, res) => {
  const { startDate, endDate } = req.query;
  let dateCondition = "";

  // Validate that both startDate and endDate are provided
  if (startDate && endDate) {
    dateCondition = `o.order_date BETWEEN '${startDate}' AND '${endDate}'`;
    console.log(startDate);
  } else {
    return res
      .status(400)
      .json({ error: "Both startDate and endDate are required" });
  }

  try {
    // Get the earliest order date from the database
    const [earliestDateResult] = await db.promise().query(`
      SELECT MIN(order_date) as earliest_date FROM orders
    `);
    const earliestDate = earliestDateResult[0].earliest_date;

    // Get the tax rate from settings
    const [taxResult] = await db.promise().query(`
      SELECT tax_rate FROM settings LIMIT 1
    `);
    const taxRate = taxResult[0].tax_rate;

    // Fetch orders within the specified date range
    const [results] = await db.promise().query(`
     SELECT
    p.product_name,
    o.price,
    o.quantity AS quantity_sold,
    o.status,
    COALESCE(p.category_name, 'Uncategorized') AS category_name  -- Set default category as 'Uncategorized'
FROM
    orders o
JOIN
    products p ON o.product_id = p.id
WHERE
    ${dateCondition} AND o.status != 'canceled';
    `);

    // If no orders are found, return a message with empty data
    if (results.length === 0) {
      console.log("No orders found");
      return res.status(200).json({
        productData: [],
        maxQuantityProduct: null,
        totalProductsSold: 0,
        totalRevenue: 0,
        message: "No orders found within the specified date range.",
        earliestDate,
      });
    }

    // Filter and process the results
    const validResults = results.filter(
      (result) => result.product_name && result.price
    );

    const productData = validResults.map((result) => {
      const priceAfterDiscount = result.price;
      return {
        product_name: result.product_name,
        price: priceAfterDiscount,
        quantity_sold: result.quantity_sold,
        status: result.status,
        category_name: result.category_name || "Uncategorized",
      };
    });

    // Find the product with the maximum quantity sold
    const maxQuantityProduct = productData.reduce(
      (max, product) =>
        product.quantity_sold > max.quantity_sold ? product : max,
      productData[0]
    );

    // Calculate the total number of products sold
    const totalProductsSold = productData.reduce(
      (acc, product) => acc + product.quantity_sold,
      0
    );

    // Calculate the total revenue without tax
    const totalRevenueWithoutTax = productData.reduce(
      (acc, product) => acc + product.price * product.quantity_sold,
      0
    );

    const totalRevenueWithTax = totalRevenueWithoutTax;

    // Return the results including product data, max product sold, total revenue, and tax rate
    res.status(200).json({
      productData,
      maxQuantityProduct: maxQuantityProduct.product_name,
      totalProductsSold,
      totalRevenue: totalRevenueWithTax,
      taxRate,
      earliestDate,
    });
  } catch (error) {
    console.error("Error fetching product data:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Route to get products that are low in stock (quantity <= 5)
router.get("/low-stock-products", (req, res) => {
  const query = "SELECT product_name FROM products WHERE quantity <= 5";

  // Execute the SQL query to fetch products with low stock
  db.query(query, (error, results) => {
    if (error) {
      return res.status(500).send("Error fetching low stock products");
    }
    res.json(results); // Return the results as JSON
  });
});

module.exports = router;
