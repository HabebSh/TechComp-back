

const express = require("express");
const db = require("../db");
const sendGroupedEmailsToSuppliers = require("./sendEmailToSupplier"); // Updated import
const { promisify } = require("util");
const router = express.Router();

// Promisify the necessary db methods
const queryAsync = promisify(db.query).bind(db);
const beginTransactionAsync = promisify(db.beginTransaction).bind(db);
const commitAsync = promisify(db.commit).bind(db);
const rollbackAsync = promisify(db.rollback).bind(db);

// Route to handle placing an order and sending emails
router.post("/suppliers_orders", async (req, res) => {
  try {
    const orders = req.body;

    if (!Array.isArray(orders) || orders.length === 0) {
      return res
        .status(400)
        .json({ error: "No products provided for ordering" });
    }

    // Object to accumulate orders by company_id
    const ordersBySupplier = {};

    // Fetch supplier details for each product and accumulate them by company_id
    for (const product of orders) {
      console.log(`Processing product: ${product.supplied_product}`);

      const results = await queryAsync(
        "SELECT company_id, email FROM suppliers WHERE supplied_product = ?",
        [product.supplied_product]
      );

      if (results.length === 0) {
        console.error(
          `Supplier not found for product ${product.supplied_product}`
        );
        return res.status(404).json({
          error: `Supplier not found for product ${product.supplied_product}`,
        });
      }

      const { company_id, email } = results[0];
      console.log(
        `Found supplier with company_id: ${company_id} for product: ${product.supplied_product}`
      );

      // Add product details along with supplier info
      const productWithSupplierInfo = {
        ...product,
        company_id,
        email,
        order_date:
          product.order_date || new Date().toISOString().split("T")[0], // Ensure order_date is present
      };

      // Accumulate products by company_id
      if (!ordersBySupplier[company_id]) {
        ordersBySupplier[company_id] = {
          email: email,
          products: [],
        };
      }

      ordersBySupplier[company_id].products.push(productWithSupplierInfo);
      console.log(`Accumulated product under company_id: ${company_id}`);
    }

    console.log(`All products accumulated by company_id:`, ordersBySupplier);

    // Now process each supplier's orders in a transaction and send emails
    for (const [company_id, supplierData] of Object.entries(ordersBySupplier)) {
      const { email, products: supplierOrders } = supplierData;
      console.log(
        `Preparing to handle supplier with company_id: ${company_id} and email: ${email} with ${supplierOrders.length} products`
      );

      try {
        // Start a transaction
        await beginTransactionAsync();
        console.log(`Transaction started for company_id: ${company_id}`);

        // Insert each product order into suppliers_orders table
        for (const order of supplierOrders) {
          console.log(`Inserting order for product: ${order.supplied_product}`);
          await queryAsync(
            "INSERT INTO suppliers_orders (company_id, supplied_product, quantity, order_date, total_price) VALUES (?, ?, ?, ?, ?)",
            [
              order.company_id,
              order.supplied_product,
              order.quantity,
              order.order_date,
              order.total_price,
            ]
          );
        }

        // Commit transaction after successful insertion
        await commitAsync();
        console.log(`Transaction committed for company_id: ${company_id}`);
      } catch (error) {
        // Rollback transaction in case of error
        await rollbackAsync();
        console.error(
          `Failed to process orders for company_id ${company_id}:`,
          error
        );
        return res.status(500).json({
          error: `Failed to process orders for company_id ${company_id}: ${error.message}`,
        });
      }
    }

    // Send grouped emails to suppliers after all orders are processed
    await sendGroupedEmailsToSuppliers(ordersBySupplier);

    // Respond with success message
    res.status(200).json({
      message: "All orders have been placed and emails sent successfully!",
    });
  } catch (error) {
    console.error("Error processing orders:", error);
    res.status(500).json({ error: "An unexpected error occurred." });
  }
});

module.exports = router;
