import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import db from "../db.js";
import "dotenv/config";

const router = Router();

//nano id checked
router.post("/register", async (req, res) => {
  let admin_id = nanoid();
  try {
    const { name, email, password, dept_id } = req.body;

    if (name && email && password && dept_id) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const [rows, fields] = await db.query(
        "INSERT INTO admins (admin_id, name, email, password, dept_id) VALUES (?, ?, ?, ?, ?)",
        [admin_id, name, email, hashedPassword, dept_id]
      );

      res.status(201).json({
        message: "User created. Waiting for super admin verification",
      });
    } else {
      res.status(400).json({ message: "Invalid body" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//nano id checked
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email && password) {
      const [rows] = await db.query("SELECT * FROM admins WHERE email = ?", [
        email,
      ]);

      if (rows.length === 0) {
        return res.status(400).json({ message: "Invalid email" });
      }

      if (rows[0].is_verified == 0) {
        return res
          .status(400)
          .json({ message: "Pending Super Admin approval" });
      }

      if (rows[0].is_verified == 9) {
        return res.status(400).json({
          message: "You're a Super Admin. Please use Super Admin Login.",
        });
      }

      const validPassword = await bcrypt.compare(password, rows[0].password);

      if (!validPassword) {
        return res.status(400).json({ message: "Invalid password" });
      }

      const token = jwt.sign(
        { id: rows[0].admin_id },
        process.env.TOKEN_SECRET,
        {
          expiresIn: "8h",
        }
      );
      res.status(200).json({ token: token, id: rows[0].admin_id });
    } else {
      res.status(400).json({ message: "Invalid body" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
//nano id checked
router.get("/user-data", async (req, res) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query("SELECT * FROM admins WHERE admin_id = ?", [
      decoded.id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const [rows2] = await db.query(
      "SELECT * FROM departments WHERE dept_id = ?",
      [rows[0].dept_id]
    );

    res.status(200).json({
      admin_id: rows[0].admin_id,
      name: rows[0].name,
      email: rows[0].email,
      dept_id: rows[0].dept_id,
      dept_name: rows2[0].dept_name,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//change user name, password, email
router.put("/update-user", async (req, res) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query("SELECT * FROM admins WHERE admin_id = ?", [
      decoded.id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const { username, password } = req.body;

    if (username && password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const decodedData = rows[0];
      const [rows2, fields] = await db.query(
        "UPDATE admins SET username = ?, email = ?, password = ? WHERE admin_id = ?",
        [username, decodedData.email, hashedPassword, decodedData.id]
      );

      res.status(200).json({ message: "User updated" });
    } else {
      res.status(400).json({ message: "Invalid body" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Todo joint sql query for dept_id and hall_id
//nano id checked
router.post("/add-lecture", async (req, res) => {
  let lec_id = nanoid();
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query("SELECT * FROM admins WHERE admin_id = ?", [
      decoded.id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const {
      venue_dept_id,
      venue_hall_id,
      course_code,
      lec_name,
      scheduled_date,
      start_time,
      end_time,
    } = req.body;

    const [rowValidate] = await db.query(
      `SELECT * FROM lectures WHERE scheduled_date = '${scheduled_date}' AND venue_hall_id = '${venue_hall_id}' AND ((start_time < '${end_time}' AND end_time > '${start_time}'))`
    );

    if (rowValidate.length > 0) {
      return res.status(400).json({ message: "Lecture already exists" });
    }

    if (lec_name && course_code) {
      const [rows2, fields] = await db.query(
        "INSERT INTO lectures (lec_id, admin_id, venue_dept_id, venue_hall_id, course_code, lec_name, scheduled_date, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          lec_id,
          rows[0].admin_id,
          venue_dept_id,
          venue_hall_id,
          course_code,
          lec_name,
          scheduled_date,
          start_time,
          end_time,
        ]
      );

      res.status(201).json({ message: "Lecture added" });
    } else {
      res.status(400).json({ message: "Invalid body" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// add department halls
//nano id checked
router.post("/add-dept-hall", async (req, res) => {
  try {
    let hall_id = nanoid();
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query("SELECT * FROM admins WHERE admin_id = ?", [
      decoded.id,
    ]);

    if (rows.length === 0) {
      return res.status(400).json({ message: "Token error" });
    } else {
      const { hall_name } = req.body;

      if (hall_name) {
        const [rows2, fields] = await db.query(
          "INSERT INTO halls (hall_id, dept_id, hall_name, admin_id) VALUES (?, ?, ?, ?)",
          [hall_id, rows[0].dept_id, hall_name, rows[0].admin_id]
        );

        res.status(201).json({ message: "Hall added" });
      } else {
        res.status(400).json({ message: "Invalid body" });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//get added department halls
//nano id checked
router.get("/get-dept-halls/", async (req, res) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query("SELECT * FROM admins WHERE admin_id = ?", [
      decoded.id,
    ]);

    if (rows.length === 0) {
      return res.status(400).json({ message: "Token error" });
    } else {
      const [rows2] = await db.query(
        "SELECT hall_id,hall_name FROM halls WHERE dept_id = ?",
        [rows[0].dept_id]
      );

      res.status(200).json({ data: rows2 });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
