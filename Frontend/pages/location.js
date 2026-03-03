import { useState, useEffect } from "react";

export default function LocationPage() {
    const [location, setLocation] = useState(null);

    useEffect(() => {
        //Fetch the lates location from the API every 5 seconds
        const fetchLocation = async () => {
            try {
                const res = await fetch("api/location");
                if (res.ok){
                    const data = await res.json();
                    setLocation(data.data); // "data" inside response
                }
            } catch(error) {
                console.error("Error fetching location:", error);
            }
        };

        fetchLocation(); // intitial load
        const interval = setInterval(fetchLocation, 5000);  //update every 5 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ padding: "20px", fontFamily: "Arial" }}>
            <h1> IoT Device Location</h1>
            {location ?(
                <p>
                    latitude: <b>{location. latitude}</b> <br />
                    longitude: <b>{location.longitude}</b>
                </p>
            ) : (
                <p>No location received yet</p>
            )}
        </div>
    );
}