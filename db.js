import mysql from "mysql2";
import "dotenv/config";

// Create a connection to the database
const db = mysql
  .createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })
  .promise();

setInterval(async () => {
  try {
    const connection = await db.getConnection();
    await connection.ping();
    connection.release();
  } catch (err) {
    console.error("Error during keep-alive ping:", err);
  }
}, 60000); // Run every minute

export default db;
