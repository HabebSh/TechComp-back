const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const generatePDFReceipt = (user, orderDetails, cartItems, paymentDetails) => {
  const receiptsDir = path.join(__dirname, "../receipts");

  // Check if the receipts directory exists, if not, create it
  if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir);
  }

  const filePath = path.join(
    receiptsDir,
    `receipt_${orderDetails.orderId}.pdf`
  );

  const doc = new PDFDocument({ margin: 50 });

  // Pipe the PDF into a writable stream
  doc.pipe(fs.createWriteStream(filePath));

  // Add title and user details
  doc.fontSize(20).text("Order Receipt", { align: "center" });
  doc.moveDown();
  doc
    .fontSize(14)
    .text(`User Name: ${user.firstName || ""} ${user.lastName || ""}`);
  doc.text(`Email: ${user.email}`);
  doc.text(`Address: ${user.address || "N/A"}`);
  doc.text(`Zip Code: ${user.zipCode || "N/A"}`);
  doc.text(`Order ID: ${orderDetails.orderId}`);
  doc.text(`Order Date: ${orderDetails.orderDate}`);
  doc.moveDown();

  // Add product details as a table
  doc.fontSize(16).text("Products:", { underline: true });
  doc.moveDown();

  const tableTop = doc.y;
  const itemDescriptionX = 50;
  const itemPriceX = 300;
  const itemQuantityX = 370;
  const itemTotalX = 440;

  // Table Header
  doc
    .fontSize(12)
    .text("Product", itemDescriptionX, tableTop)
    .text("Price", itemPriceX, tableTop)
    .text("Quantity", itemQuantityX, tableTop)
    .text("Total", itemTotalX, tableTop);

  doc
    .moveTo(50, tableTop + 15)
    .lineTo(550, tableTop + 15)
    .stroke();

  // Table Rows
  let position = tableTop + 25;
  cartItems.forEach((item) => {
    // Ensure item.price is a number
    const price = parseFloat(item.price) || 0;
    const total = (price * item.quantity).toFixed(2);

    doc
      .fontSize(10)
      .text(item.name, itemDescriptionX, position)
      .text(`$${price.toFixed(2)}`, itemPriceX, position)
      .text(item.quantity, itemQuantityX, position)
      .text(`$${total}`, itemTotalX, position);

    if (item.imagePath) {
      const imagePath = path.join(__dirname, "../..", item.imagePath);
      doc.image(imagePath, 50, position + 15, { width: 100, height: 100 });
      position += 120; // Adjust the position to move down if image is added
    } else {
      position += 20;
    }

    doc.moveTo(50, position).lineTo(550, position).stroke();
    position += 10;
  });

  // Add a line break before payment details
  doc.moveDown().moveDown();

  // Add payment details
  const totalAmount = cartItems
    .reduce(
      (total, item) => total + (parseFloat(item.price) || 0) * item.quantity,
      0
    )
    .toFixed(2);
  doc.moveDown();
  doc.fontSize(16).text("Payment Details:", { underline: true });

  doc.fontSize(12).text(`Total Amount: $${totalAmount}`);
  doc.text("Payment Method: PayPal");

  // Finalize the PDF and end the stream
  doc.end();

  return filePath;
};

const sendReceiptEmail = async (email, filePath) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // Accept self-signed certificates
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Purchase Receipt",
    text: "Thank you for your purchase! Please find your receipt attached.",
    attachments: [
      {
        filename: "receipt.pdf",
        path: filePath,
        contentType: "application/pdf",
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Receipt email sent successfully");
  } catch (error) {
    console.error("Error sending receipt email:", error);
  }
};

module.exports = {
  generatePDFReceipt,
  sendReceiptEmail,
};
