import React from "react";
import SignInForm from "../components/SignInForm";

function App() {
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
      <SignInForm />
    </div>
  );
}

export default App;
