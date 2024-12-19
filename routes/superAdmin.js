import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import db from '../db.js';
import 'dotenv/config';

const router = Router();

router.post('/register', async (req, res) => {
  let super_admin_id = nanoid();
  try {
    const { name, email, password, secrectKey } = req.body;

    if (name && email && password && secrectKey) {
      if (secrectKey !== process.env.SECRET_KEY) {
        return res.status(400).json({ message: 'Invalid secrect key' });
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [rows, fields] = await db.query(
          'INSERT INTO super_admins (super_admin_id, name, email, password) VALUES (?, ?, ?, ?)',
          [super_admin_id, name, email, hashedPassword]
        );

        // Added super admin as admin as well / Dept = Faculty
        const [rows2, fields2] = await db.query(
          'INSERT INTO admins (admin_id, name, email, password, dept_id) VALUES (?, ?, ?, ?, ?)',
          [super_admin_id, name, email, hashedPassword, 'gw0rqhiiyNtWqeIxq66xt']
        );

        const token = jwt.sign(
          { id: rows.insertId },
          process.env.TOKEN_SECRET,
          {
            expiresIn: '1h',
          }
        );
        res.status(201).json({ token });
      }
    } else {
      res.status(400).json({ message: 'Invalid body' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email && password) {
      const [rows] = await db.query(
        'SELECT * FROM super_admins WHERE email = ?',
        [email]
      );

      if (rows.length === 0) {
        return res.status(400).json({ message: 'Invalid email' });
      }

      const validPassword = await bcrypt.compare(password, rows[0].password);

      if (!validPassword) {
        return res.status(400).json({ message: 'Invalid password' });
      }

      const token = jwt.sign(
        { id: rows[0].super_admin_id },
        process.env.TOKEN_SECRET,
        {
          expiresIn: '8h',
        }
      );
      res.status(200).json({ token: token, id: rows[0].super_admin_id });
    } else {
      res.status(400).json({ message: 'Invalid body' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/add-department', async (req, res) => {
  try {
    let dept_id = nanoid();
    const { dept_name } = req.body;
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query(
      'SELECT * FROM super_admins WHERE super_admin_id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token invalid' });
    } else {
      if (dept_name) {
        const [rows2, fields2] = await db.query(
          'INSERT INTO departments (dept_id, dept_name) VALUES (?, ?)',
          [dept_id, dept_name]
        );
        res.status(201).json({ message: 'Department added' });
      } else {
        res.status(400).json({ message: 'Invalid body' });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/add-hall', async (req, res) => {
  try {
    let hall_id = nanoid();
    const { dept_id, hall_name } = req.body;
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query(
      'SELECT * FROM super_admins WHERE super_admin_id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token invalid' });
    } else {
      if (hall_name) {
        const [rows2, fields2] = await db.query(
          'INSERT INTO halls (hall_id, dept_id, hall_name, admin_id) VALUES (?, ?, ?, ?)',
          [hall_id, dept_id, hall_name, rows[0].super_admin_id]
        );
        res.status(201).json({ message: 'Hall added' });
      } else {
        res.status(400).json({ message: 'Invalid body' });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/get-all-departments', async (req, res) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query(
      'SELECT * FROM super_admins WHERE super_admin_id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token invalid' });
    } else {
      const [rows2, fields2] = await db.query('SELECT * FROM departments');
      res.status(200).json(rows2);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/get-all-admins', async (req, res) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query(
      'SELECT * FROM super_admins WHERE super_admin_id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token invalid' });
    } else {
      const [rows2, fields2] = await db.query(
        'select admins.admin_id,admins.name,admins.email,admins.is_verified,departments.dept_name from admins join departments on admins.dept_id = departments.dept_id'
      );
      // don't return password
      rows2.forEach((row) => {
        delete row.password;
      });
      res.status(200).json(rows2.filter((row) => row.admin_id !== decoded.id));
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/get-all-halls', async (req, res) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query(
      'SELECT * FROM super_admins WHERE super_admin_id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token invalid' });
    } else {
      const [rows2, fields2] = await db.query(
        'SELECT hall_id,hall_name FROM halls'
      );
      res.status(200).json(rows2);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/verify-admin/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query(
      'SELECT * FROM super_admins WHERE super_admin_id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token invalid' });
    } else {
      if (id) {
        const [rows2, fields2] = await db.query(
          'UPDATE admins SET is_verified = 1 WHERE admin_id = ?',
          [id]
        );
        res.status(200).json({ message: 'User verified' });
      } else {
        res.status(400).json({ message: 'Invalid body' });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/delete-admin/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query(
      'SELECT * FROM super_admins WHERE super_admin_id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token invalid' });
    } else {
      if (id) {
        const [rows2, fields2] = await db.query(
          'DELETE FROM admins WHERE admin_id = ?',
          [id]
        );
        res.status(200).json({ message: 'User deleted' });
      } else {
        res.status(400).json({ message: 'Invalid body' });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/delete-hall/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query(
      'SELECT * FROM super_admins WHERE super_admin_id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token invalid' });
    } else {
      if (id) {
        const [rows2, fields2] = await db.query(
          'DELETE FROM halls WHERE hall_id = ?',
          [id]
        );
        res.status(200).json({ message: 'Hall deleted' });
      } else {
        res.status(400).json({ message: 'Invalid body' });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/delete-department/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query(
      'SELECT * FROM super_admins WHERE super_admin_id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token invalid' });
    } else {
      if (id) {
        const [rows2, fields2] = await db.query(
          'DELETE FROM departments WHERE dept_id = ?',
          [id]
        );
        res.status(200).json({ message: 'Hall deleted' });
      } else {
        res.status(400).json({ message: 'Invalid body' });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/add-lecture', async (req, res) => {
  let lec_id = nanoid();
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query('SELECT * FROM admins WHERE admin_id = ?', [
      decoded.id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
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
      return res.status(400).json({ message: 'Lecture already exists' });
    }

    if (lec_name && course_code) {
      const [rows2, fields] = await db.query(
        'INSERT INTO lectures (lec_id, admin_id, venue_dept_id, venue_hall_id, course_code, lec_name, scheduled_date, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
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

      res.status(201).json({ message: 'Lecture added' });
    } else {
      res.status(400).json({ message: 'Invalid body' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/delete-lecture/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query('SELECT * FROM admins WHERE admin_id = ?', [
      decoded.id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (id) {
      const [rows2, fields2] = await db.query(
        'DELETE FROM lectures WHERE lec_id = ?',
        [id]
      );
      res.status(200).json({ message: 'Lecture deleted' });
    } else {
      res.status(400).json({ message: 'Invalid body' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/add-prefix', async (req, res) => {
  let prefix_id = nanoid();
  try {
    const { prefix_name, dept_id } = req.body;
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query(
      'SELECT * FROM super_admins WHERE super_admin_id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token invalid' });
    } else {
      if (prefix_name) {
        const [rows2, fields2] = await db.query(
          'INSERT INTO course_code_prefix (prefix_id, prefix_name, dept_id) VALUES (?, ?, ?)',
          [prefix_id, prefix_name, dept_id]
        );
        res.status(201).json({ message: 'Prefix added' });
      } else {
        res.status(400).json({ message: 'Invalid body' });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/get-all-prefixes', async (req, res) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query(
      'SELECT * FROM super_admins WHERE super_admin_id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token invalid' });
    } else {
      const [rows2, fields2] = await db.query(
        'select course_code_prefix.prefix_id,course_code_prefix.prefix_name,course_code_prefix.dept_id,departments.dept_name from course_code_prefix join departments on course_code_prefix.dept_id = departments.dept_id'
      );
      res.status(200).json(rows2);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/delete-prefix/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const [rows] = await db.query(
      'SELECT * FROM super_admins WHERE super_admin_id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token invalid' });
    } else {
      if (id) {
        const [rows2, fields2] = await db.query(
          'DELETE FROM course_code_prefix WHERE prefix_id = ?',
          [id]
        );
        res.status(200).json({ message: 'Prefix deleted' });
      } else {
        res.status(400).json({ message: 'Invalid body' });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
