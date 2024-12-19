import { Router } from "express";

import moment from "moment";
import db from "../db.js";

const router = Router();

router.get("/get-all-lectures", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM lectures");
    res.status(200).json(
      rows.map((lecture) => {
        let dt1 = moment(lecture.scheduled_date).format("YYYY-MM-DD");
        let ddt1 = `${dt1}T${lecture.start_time}.000Z`;
        let dt2 = moment(lecture.scheduled_date).format("YYYY-MM-DD");
        let ddt2 = `${dt2}T${lecture.end_time}.000Z`;

        return {
          id: lecture.lec_id,
          title: lecture.course_code + " - " + lecture.lec_name,
          channelUuid: lecture.venue_hall_id,
          since: moment(ddt1)
            .utcOffset("-05:30")
            .format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
          till: moment(ddt2)
            .utcOffset("-05:30")
            .format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
          admin_id: lecture.admin_id,
        };
      })
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/get-all-halls", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT hall_id,hall_name FROM halls");
    res.status(200).json(
      rows.map((hall) => {
        return {
          uuid: hall.hall_id,
          title: hall.hall_name,
        };
      })
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/get-all-halls-v2", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT hall_id,hall_name FROM halls");
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//get all departments
router.get("/get-all-departments", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM departments");
    res.status(200).json(
      rows.map((dept) => {
        return {
          dept_id: dept.dept_id,
          dept_name: dept.dept_name,
        };
      })
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// get courses by venue dept
router.get("/filter-by-dept/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM lectures where venue_dept_id=?",
      [req.params.id]
    );
    res.status(200).json(
      rows.map((lecture) => {
        let dt1 = moment(lecture.scheduled_date).format("YYYY-MM-DD");
        let ddt1 = `${dt1}T${lecture.start_time}.000Z`;
        let dt2 = moment(lecture.scheduled_date).format("YYYY-MM-DD");
        let ddt2 = `${dt2}T${lecture.end_time}.000Z`;

        return {
          id: lecture.lec_id,
          title: lecture.course_code + " - " + lecture.lec_name,
          channelUuid: lecture.venue_hall_id,
          since: moment(ddt1)
            .utcOffset("-05:30")
            .format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
          till: moment(ddt2)
            .utcOffset("-05:30")
            .format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
          admin_id: lecture.admin_id,
        };
      })
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//get prefix by dept
router.get("/get-prefixs-by-uid/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM admins where admin_id=?", [
      req.params.id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const [rows2] = await db.query(
      "SELECT * FROM course_code_prefix where dept_id=?",
      [rows[0].dept_id]
    );
    res.status(200).json(rows2);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
export default router;
