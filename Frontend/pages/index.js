import React from "react";
import { useRouter } from "next/router";

function App() {
  const router = useRouter();

  const handleClientLogin = () => {
    router.push("/ClientSignIn");
    console.log("Client login clicked");
  };

  const handleAdminLogin = () => {
    router.push("/AdminSignIn");
    console.log("Admin login clicked");
  };

  return (
    <div
      style={{
        backgroundImage: "url('images/bg1.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
        color: "white",
      }}
    >


      <main style={{ padding: "200px" }}>
        <h2
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: "3.5rem",
            fontWeight: "700",
            letterSpacing: "2px",
            textShadow: "3px 3px 6px rgba(0,0,0,0.7)",
            marginBottom: "40px",
          }}
        >
          Welcome
        </h2>

        <div style={{ display: "flex", gap: "20px", marginTop: "30px" }}>
          <button
            onClick={handleClientLogin}
            style={{
              padding: "15px 40px",
              fontSize: "1.1rem",
              fontWeight: "600",
              fontFamily: "'Montserrat', sans-serif",
              color: "white",
              backgroundColor: "rgba(0, 0, 128, 0.8)",
              border: "2px solid white",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "rgba(0, 0, 128, 1)";
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 6px 20px rgba(0,0,0,0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "rgba(0, 0, 128, 0.8)";
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            Client Account
          </button>

          <button
            onClick={handleAdminLogin}
            style={{
              padding: "15px 40px",
              fontSize: "1.1rem",
              fontWeight: "600",
              fontFamily: "'Montserrat', sans-serif",
              color: "white",
              backgroundColor: "rgba(220, 38, 38, 0.8)",
              border: "2px solid white",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "rgba(220, 38, 38, 1)";
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 6px 20px rgba(0,0,0,0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "rgba(220, 38, 38, 0.8)";
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            Administrator
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
