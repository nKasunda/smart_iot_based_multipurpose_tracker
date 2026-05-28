import React from "react";
import SignInForm from "../components/SignInForm";

function App() {
  return (
    <div
      style={{
        background: "#0b4fbd",
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
