import React from "react";
import SignInForm from "../components/SignInForm";


function AdminPage() {
  return (
    <div
       style={{
        backgroundImage: "url('images/bg1.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100dvh",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
    
      <main style={{ width: "100%", maxWidth: 460, textAlign: "center" }}>
       <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(1.5rem, 7vw, 2.5rem)",
          marginBottom: "clamp(18px, 5vw, 40px)",
          textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
        }}
      >
        Administrator Portal
      </h2>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <SignInForm />
      </div>
     </main>
   </div>
  );
}

export default AdminPage;
