const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.MY_EMAIL, // Your email id
    pass: process.env.MY_PASSWORD, // Your password
  },
});

/**
 * Sends a single email to each supplier with all the grouped order details.
 * @param {Object} ordersBySupplier - Grouped orders by company_id with email and products.
 */
const sendGroupedEmailsToSuppliers = async (ordersBySupplier) => {
  try {
    // Iterate over each supplier's orders
    for (const [company_id, supplierData] of Object.entries(ordersBySupplier)) {
      const { email, products: orderData } = supplierData;
      console.log(`Attempting to send email to: ${email}`);

      if (!Array.isArray(orderData) || orderData.length === 0) {
        console.error("No products provided for ordering");
        continue; // Skip if no orders are present
      }

      // Check if there is only one product
      const isSingleProduct = orderData.length === 1;

      // Prepare the message content based on the number of products
      let emailContent;

      if (isSingleProduct) {
        const product = orderData[0];
        emailContent = `
Hello,

We would like to place an order for the following product:

${product.supplied_product}: ${product.quantity} units - $${parseFloat(
          product.total_price
        ).toFixed(2)}

Order Date: ${product.order_date}

Please confirm the order at your earliest convenience.

Thank you,
TechComp Manager
        `;
      } else {
        // Combine all products into a single email content
        const productsList = orderData
          .map(
            (product, index) =>
              `${index + 1}. ${product.supplied_product}: ${
                product.quantity
              } units - $${parseFloat(product.total_price).toFixed(2)}`
          )
          .join("\n");

        console.log(`Products list for email to ${email}:\n${productsList}`);

        // Calculate total order price
        const totalOrderPrice = orderData
          .reduce((sum, product) => sum + parseFloat(product.total_price), 0)
          .toFixed(2);

        emailContent = `
Hello,

We would like to place an order for the following products:

${productsList}

Total Order Price: $${totalOrderPrice}
Order Date: ${orderData[0].order_date}

Please confirm the order at your earliest convenience.

Thank you,
TechComp Manager
        `;
      }

      console.log(`Email content prepared for ${email}`);

      const mailOptions = {
        from: process.env.MY_EMAIL, // Your email id
        to: email,
        subject: isSingleProduct
          ? `Order for a Product`
          : `Order for Multiple Products`,
        text: emailContent.trim(),
      };

      // Send the email
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email successfully sent to ${email}: ${info.response}`);
    }
  } catch (error) {
    console.error("Error sending grouped emails to suppliers:", error);
    throw error; // Propagate error to be handled by the caller
  }
};

module.exports = sendGroupedEmailsToSuppliers;
