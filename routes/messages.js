// const express = require("express");
// const db = require("../db");

// const router = express.Router();

// router.post("/sendMessage", (req, res) => {
//   const { userName, phone, message } = req.body;
//   const connectedAt = new Date();

//   const sql =
//     "INSERT INTO messages (userName, phone, message, connected_at) VALUES (?, ?, ?, ?)";
//   db.query(sql, [userName, phone, message, connectedAt], (err, result) => {
//     if (err) {
//       console.error("Error inserting message:", err);
//       return res.status(500).json({ error: "Database error" });
//     }
//     res.json({
//       success: true,
//       id: result.insertId,
//       userName,
//       phone,
//       connected_at: connectedAt,
//     });
//   });
// });

// router.get("/SendMessage", (req, res) => {
//   // If you need a GET route as well
//   const sql = "SELECT * FROM messages";
//   db.query(sql, (err, results) => {
//     if (err) {
//       console.error("Error fetching messages:", err);
//       return res.status(500).json({ error: "Database error" });
//     }
//     res.json(results);
//   });
// });

// module.exports = router;
const express = require("express");
const db = require("../db");

const router = express.Router();

// Route to handle sending a message (POST)
router.post("/sendMessage", (req, res) => {
  const { userName, phone, message } = req.body;
  const connectedAt = new Date(); // Capture the current time

  // SQL query to insert a new message into the database
  const sql =
    "INSERT INTO messages (userName, phone, message, connected_at) VALUES (?, ?, ?, ?)";
  db.query(sql, [userName, phone, message, connectedAt], (err, result) => {
    if (err) {
      console.error("Error inserting message:", err);
      return res.status(500).json({ error: "Database error" });
    }
    // Return success response with inserted message details
    res.json({
      success: true,
      id: result.insertId, // Return the ID of the inserted message
      userName,
      phone,
      connected_at: connectedAt,
    });
  });
});

// Route to fetch all messages (GET)
router.get("/SendMessage", (req, res) => {
  const sql = "SELECT * FROM messages"; // SQL query to fetch all messages
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching messages:", err);
      return res.status(500).json({ error: "Database error" });
    }
    // Return the fetched messages as JSON
    res.json(results);
  });
});

module.exports = router;
