const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "ecommerce2",
  port: 3306,
});

db.connect((err) => {
  if (err) throw err;
  console.log("Database connected!");
});

module.exports = db;
