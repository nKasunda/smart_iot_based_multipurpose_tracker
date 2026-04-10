require('dotenv').config();
const express = require("express");
const http = require("http");
const { sequelize } = require("./models");
const trackerRoutes = require("./routes/tracker.routes");
const cors = require("cors");
const app = express();

// Socket.io setup
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: { origin: "*" }
});
app.set("io", io); // make io accessible in controllers

app.use(cors());
app.use(express.json());
app.use("/api/tracker", trackerRoutes);

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await sequelize.authenticate();
    console.log("Database connected!");
  } catch (err) {
    console.error("DB connection error:", err);
  }
});