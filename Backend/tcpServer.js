app.post('/api/tracker', (req, res) => {
  const { message, sender } = req.body;

  console.log("Incoming SMS:", message);

  const regex = /LAT:(.*),LON:(.*),TS:(.*)/;
  const match = message.match(regex);

  if (match) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);

    console.log("Parsed:", lat, lon);

    // Save to DB
  }

  res.sendStatus(200);
});