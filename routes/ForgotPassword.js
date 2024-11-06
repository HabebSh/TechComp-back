// const express = require("express");
// const router = express.Router();
// const db = require("../db");
// const nodemailer = require("nodemailer");
// const crypto = require("crypto");
// const bcrypt = require("bcrypt");

// // Setup Nodemailer transporter
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // Route to handle forgot password and send verification code
// router.post("/forgot-password", (req, res) => {
//   const { email } = req.body;
//   const code = crypto.randomInt(100000, 999999).toString(); // Generate a 6-digit code
//   const expirationTime = new Date(Date.now() + 3600000); // 1 hour from now

//   // Store the code and email in the database
//   db.query(
//     "UPDATE users SET reset_code = ?, reset_code_expires = ? WHERE email = ?",
//     [code, expirationTime, email],
//     (error, results) => {
//       if (error) {
//         return res.status(500).json({ error: "Database error" });
//       }

//       if (results.affectedRows === 0) {
//         return res.status(404).json({ error: "Email not found" });
//       }

//       // Send email with the verification code
//       const mailOptions = {
//         from: process.env.EMAIL_USER,
//         to: email,
//         subject: "Password Reset Verification Code",
//         text: `Your password reset verification code is ${code}. It expires in 1 hour.`,
//       };

//       transporter.sendMail(mailOptions, (error, info) => {
//         if (error) {
//           console.error(error);
//           return res
//             .status(500)
//             .json({ success: false, message: "Failed to send email." });
//         } else {
//           res.status(200).json({
//             success: true,
//             message: "Verification code sent.",
//           });
//         }
//       });
//     }
//   );
// });

// // Route to verify the code
// router.post("/verify-code", (req, res) => {
//   const { email, code } = req.body;

//   db.query(
//     "SELECT reset_code, reset_code_expires FROM users WHERE email = ?",
//     [email],
//     (error, results) => {
//       if (error) {
//         return res.status(500).json({ error: "Database error" });
//       }

//       if (results.length === 0) {
//         return res.status(404).json({ error: "Email not found" });
//       }

//       const { reset_code, reset_code_expires } = results[0];
//       const now = new Date();

//       if (reset_code === code && new Date(reset_code_expires) > now) {
//         res.status(200).json({ success: true, message: "Code verified." });
//       } else if (new Date(reset_code_expires) <= now) {
//         res.status(400).json({
//           success: false,
//           message: "Code expired. Please request a new one.",
//         });
//       } else {
//         res.status(400).json({ success: false, message: "Invalid code." });
//       }
//     }
//   );
// });

// // Route to reset the password
// router.post("/reset-password", async (req, res) => {
//   const { email, code, newPassword } = req.body;

//   db.query(
//     "SELECT reset_code, reset_code_expires FROM users WHERE email = ?",
//     [email],
//     async (error, results) => {
//       if (error) {
//         return res.status(500).json({ error: "Database error" });
//       }

//       if (results.length === 0) {
//         return res.status(404).json({ error: "Email not found" });
//       }

//       const { reset_code, reset_code_expires } = results[0];
//       const now = new Date();

//       if (reset_code === code && new Date(reset_code_expires) > now) {
//         // Hash the new password
//         const hashedPassword = await bcrypt.hash(newPassword, 10);

//         // Update the user's password and clear the reset code
//         db.query(
//           "UPDATE users SET password = ?, reset_code = NULL, reset_code_expires = NULL WHERE email = ?",
//           [hashedPassword, email],
//           (error, results) => {
//             if (error) {
//               return res.status(500).json({ error: "Database error" });
//             }

//             res.status(200).json({
//               success: true,
//               message: "Password reset successful.",
//             });
//           }
//         );
//       } else if (new Date(reset_code_expires) <= now) {
//         res.status(400).json({
//           success: false,
//           message: "Code expired. Please request a new one.",
//         });
//       } else {
//         res.status(400).json({ success: false, message: "Invalid code." });
//       }
//     }
//   );
// });

// module.exports = router;
const express = require("express");
const router = express.Router();
const db = require("../db");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Route to handle forgot password and send verification code
router.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  const code = crypto.randomInt(100000, 999999).toString(); // Generate a 6-digit code
  const expirationTime = new Date(Date.now() + 3600000); // 1 hour from now

  // Store the code and email in the database
  db.query(
    "UPDATE users SET reset_code = ?, reset_code_expires = ? WHERE email = ?",
    [code, expirationTime, email],
    (error, results) => {
      if (error) {
        return res.status(500).json({ error: "Database error" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "Email not found" });
      }

      // Send email with the verification code
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset Verification Code",
        text: `Your password reset verification code is ${code}. It expires in 1 hour.`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(error);
          return res
            .status(500)
            .json({ success: false, message: "Failed to send email." });
        } else {
          res.status(200).json({
            success: true,
            message: "Verification code sent.",
          });
        }
      });
    }
  );
});

// Route to verify the code
router.post("/verify-code", (req, res) => {
  const { email, code } = req.body;

  // Query the database to check if the code matches and is not expired
  db.query(
    "SELECT reset_code, reset_code_expires FROM users WHERE email = ?",
    [email],
    (error, results) => {
      if (error) {
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "Email not found" });
      }

      const { reset_code, reset_code_expires } = results[0];
      const now = new Date();

      // Verify if the code matches and hasn't expired
      if (reset_code === code && new Date(reset_code_expires) > now) {
        res.status(200).json({ success: true, message: "Code verified." });
      } else if (new Date(reset_code_expires) <= now) {
        res.status(400).json({
          success: false,
          message: "Code expired. Please request a new one.",
        });
      } else {
        res.status(400).json({ success: false, message: "Invalid code." });
      }
    }
  );
});

// Route to reset the password
router.post("/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;

  // Query the database to check if the code is correct and valid
  db.query(
    "SELECT reset_code, reset_code_expires FROM users WHERE email = ?",
    [email],
    async (error, results) => {
      if (error) {
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "Email not found" });
      }

      const { reset_code, reset_code_expires } = results[0];
      const now = new Date();

      // If the code matches and is valid, hash the new password and update the database
      if (reset_code === code && new Date(reset_code_expires) > now) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password and clear the reset code
        db.query(
          "UPDATE users SET password = ?, reset_code = NULL, reset_code_expires = NULL WHERE email = ?",
          [hashedPassword, email],
          (error, results) => {
            if (error) {
              return res.status(500).json({ error: "Database error" });
            }

            res.status(200).json({
              success: true,
              message: "Password reset successful.",
            });
          }
        );
      } else if (new Date(reset_code_expires) <= now) {
        res.status(400).json({
          success: false,
          message: "Code expired. Please request a new one.",
        });
      } else {
        res.status(400).json({ success: false, message: "Invalid code." });
      }
    }
  );
});

module.exports = router;
