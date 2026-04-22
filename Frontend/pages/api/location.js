let latestLocation = null; // store the most recent location in memory

export default function handler(req, res) {
  if (req.method === "POST") {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    console.log("📍 Location received:", latitude, longitude);
    latestLocation = { latitude, longitude, status: "Active" };

    return res.status(200).json({
      message: "Location received successfully",
      data: latestLocation
    });
  }

  if (req.method === "GET") {
    if (latestLocation) {
      return res.status(200).json({ data: latestLocation });
    } else {
      // fallback demo location (Lilongwe)
      return res.status(200).json({
        data: { latitude: -13.9626, longitude: 33.7741, status: "Demo" }
      });
    }
  }

  // Any other method not allowed
  return res.status(405).json({ error: "Only POST and GET methods are allowed" });
}
