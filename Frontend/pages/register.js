import React from "react";
import RegisterForm from "../components/RegisterForm";

function RegisterPage() {
  return (
    <div
      style={{
        backgroundImage: "url('images/bg1.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <RegisterForm />
    </div>
  );
}

export default RegisterPage;
