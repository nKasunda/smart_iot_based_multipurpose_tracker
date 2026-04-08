import React from "react";
import SignInForm from "../components/SignInForm";

function ClientPage() {
  return (
     <div
       style={{
        backgroundImage: "url('images/bg1.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
        color: "white"
      }}
    >
    <main style={{ padding: "150px", textAlign: "center" }}>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "2.5rem",
          marginBottom: "40px",
          textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
        }}
      >
        Client
      </h2>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <SignInForm/>
      </div>
    </main>
    </div>
  );
}

export default ClientPage;
