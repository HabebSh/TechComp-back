// const express = require("express");
// const bodyParser = require("body-parser");
// const cors = require("cors");
// const session = require("express-session");
// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");
// const app = express();

// app.use(bodyParser.json());
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// app.use(
//   cors({
//     origin: "http://localhost:3000",
//     credentials: true,
//   })
// );

// app.use(
//   session({
//     secret: "qweasdzxcqweasdzxcqweasdzxcqweasdzxc",
//     resave: false,
//     saveUninitialized: true,
//     cookie: { secure: false }, // Set to true if using HTTPS
//   })
// );

// // Ensure uploads directory exists
// if (!fs.existsSync("uploads")) {
//   fs.mkdirSync("uploads");
// }

// // Configure multer storage
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads/");
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   },
// });

// const upload = multer({ storage });
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// // Use the upload router

// module.exports = { app, upload };
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();

app.use(bodyParser.json()); // Middleware to parse incoming JSON requests

app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve static files from the "uploads" directory

app.use(
  cors({
    origin: "http://localhost:3000", // Allow CORS from the React frontend
    credentials: true, // Enable sending credentials (cookies, authorization headers)
  })
);

app.use(
  session({
    secret: "qweasdzxcqweasdzxcqweasdzxcqweasdzxc", // Secret for encrypting the session cookie
    resave: false, // Do not save session if it hasn't been modified
    saveUninitialized: true, // Save uninitialized sessions
    cookie: { secure: false }, // Set 'true' if using HTTPS for secure cookies
  })
);

// Ensure uploads directory exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads"); // Create "uploads" directory if it doesn't exist
}

// Configure multer storage for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Set the destination folder for file uploads
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Set unique file name using current timestamp and original extension
  },
});

const upload = multer({ storage }); // Initialize multer with defined storage configuration

app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve uploaded files as static resources

module.exports = { app, upload }; // Export app and upload for use in other modules
