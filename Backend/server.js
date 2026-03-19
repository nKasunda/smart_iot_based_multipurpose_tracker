const express = require("express");
const cors = require("cors");
require("dotenv").config();


const sequelize = require("./models").sequelize;
const trackerRoutes = require("./routes/tracker.routes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/tracker", trackerRoutes);

sequelize.authenticate()
  .then(() => console.log("PostgreSQL connected"))
  .catch(err => console.error("DB connection error:", err));

sequelize.sync().then(() => console.log("Tables synced"));

app.listen(5000, () => console.log("Server running on port 5000"));
