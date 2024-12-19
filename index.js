import express from "express";
import cors from "cors";

import admin from "./routes/admin.js";
import superAdmin from "./routes/superAdmin.js";
import guest from "./routes/guest.js";

const app = express();

app.use(cors());

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// admin routes
app.use("/api/auth/admin", admin);

// super admin routes
app.use("/api/auth/super-admin", superAdmin);

// guest routes
app.use("/api/guest", guest);

// set port, listen for requests
const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
