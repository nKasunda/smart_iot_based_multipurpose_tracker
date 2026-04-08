import React, { useState } from "react";
import Header from "../components/Header";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUser } from "react-icons/fa";
import Link from "next/link";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/pages/Firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/router";

function App() {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const name = e.target.name.value;
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user data to Firestore with client role
      await setDoc(doc(db, "users", user.uid), {
        name: name,
        email: email,
        role: "client",
        createdAt: new Date().toISOString(),
      });

      alert("Account created successfully! Please sign in.");
      setIsRegistering(false);
    } catch (error) {
      console.error("Registration error:", error.message);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      // Sign in user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user role safely
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        alert("User data not found in Firestore.");
        return;
      }

      const { role } = userDoc.data();

      // Redirect based on role
      if (role === "admin") router.push("/Dashboard");
      else router.push("/ClientDashboard");
    } catch (error) {
      console.error("Sign in error:", error.message);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getColor = (inputName) => (focusedInput === inputName ? "#000080" : "gray");

  return (
    <div style={{ backgroundColor: "white", minHeight: "100vh" }}>
      <Header />

      <main style={{ padding: "20px", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <div style={{ display: "flex", gap: "40px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Welcome Text */}
          <div style={{ maxWidth: "400px" }}>
            <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#333", marginBottom: "20px" }}>
              Welcome to Smart IoT Tracker
            </h1>
            <p style={{ fontSize: "1.2rem", color: "#666", lineHeight: "1.6" }}>
              Monitor and manage your IoT devices with ease. Sign in to access your dashboard or create a new account to get started.
            </p>
          </div>

          {/* Auth Form */}
          <div>
            {!isRegistering ? (
              // Sign In Form
              <form
                onSubmit={handleSignIn}
                style={{
                  backgroundColor: "white",
                  padding: "40px",
                  borderRadius: "15px",
                  width: "400px",
                  boxShadow: "0 6px 12px rgba(0,0,0,0.5)",
                  fontFamily: "'Roboto', sans-serif",
                }}
              >
                <h2
                  style={{
                    marginBottom: "30px",
                    color: "black",
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: "22px",
                  }}
                >
                  Sign In
                </h2>

                {/* Email Field */}
                <div style={{ width: "100%", marginBottom: "25px" }}>
                  <label
                    htmlFor="email"
                    style={{
                      color: "black",
                      fontWeight: 500,
                      marginBottom: "8px",
                      display: "block",
                      textAlign: "left",
                      fontSize: "15px",
                    }}
                  >
                    Email Address
                  </label>
                  <div style={{ position: "relative" }}>
                    <FaEnvelope
                      style={{
                        position: "absolute",
                        left: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: getColor("email"),
                        pointerEvents: "none",
                      }}
                    />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      style={{
                        width: "100%",
                        padding: "12px 10px 12px 40px",
                        borderRadius: "8px",
                        border: `2px solid ${getColor("email")}`,
                        backgroundColor: "white",
                        color: "black",
                        outline: "none",
                        height: "45px",
                        boxSizing: "border-box",
                        fontWeight: 400,
                        fontSize: "14px",
                      }}
                      onFocus={() => setFocusedInput("email")}
                      onBlur={() => setFocusedInput("")}
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div style={{ width: "100%", marginBottom: "15px" }}>
                  <label
                    htmlFor="password"
                    style={{
                      color: "black",
                      fontWeight: 500,
                      marginBottom: "8px",
                      display: "block",
                      textAlign: "left",
                      fontSize: "15px",
                    }}
                  >
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <FaLock
                      style={{
                        position: "absolute",
                        left: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: getColor("password"),
                        pointerEvents: "none",
                      }}
                    />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      style={{
                        width: "100%",
                        padding: "12px 40px 12px 40px",
                        borderRadius: "8px",
                        border: `2px solid ${getColor("password")}`,
                        backgroundColor: "white",
                        color: "black",
                        outline: "none",
                        height: "45px",
                        boxSizing: "border-box",
                        fontWeight: 400,
                        fontSize: "14px",
                      }}
                      onFocus={() => setFocusedInput("password")}
                      onBlur={() => setFocusedInput("")}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: getColor("password"),
                      }}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: loading ? "#ccc" : "#000080",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    marginBottom: "20px",
                  }}
                >
                  {loading ? "Signing In..." : "Sign In"}
                </button>

                {/* Switch to Register */}
                <p style={{ textAlign: "center", color: "#666" }}>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setIsRegistering(true)}
                    style={{
                      color: "#000080",
                      textDecoration: "underline",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Register here
                  </button>
                </p>
              </form>
            ) : (
              // Registration Form
              <form
                onSubmit={handleRegister}
                style={{
                  backgroundColor: "white",
                  padding: "40px",
                  borderRadius: "15px",
                  width: "400px",
                  boxShadow: "0 6px 12px rgba(0,0,0,0.5)",
                  fontFamily: "'Roboto', sans-serif",
                }}
              >
                <h2
                  style={{
                    marginBottom: "30px",
                    color: "black",
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: "22px",
                  }}
                >
                  Create Account
                </h2>

                {/* Name Field */}
                <div style={{ width: "100%", marginBottom: "25px" }}>
                  <label
                    htmlFor="name"
                    style={{
                      color: "black",
                      fontWeight: 500,
                      marginBottom: "8px",
                      display: "block",
                      textAlign: "left",
                      fontSize: "15px",
                    }}
                  >
                    Full Name
                  </label>
                  <div style={{ position: "relative" }}>
                    <FaUser
                      style={{
                        position: "absolute",
                        left: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: getColor("name"),
                        pointerEvents: "none",
                      }}
                    />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Enter your full name"
                      style={{
                        width: "100%",
                        padding: "12px 10px 12px 40px",
                        borderRadius: "8px",
                        border: `2px solid ${getColor("name")}`,
                        backgroundColor: "white",
                        color: "black",
                        outline: "none",
                        height: "45px",
                        boxSizing: "border-box",
                        fontWeight: 400,
                        fontSize: "14px",
                      }}
                      onFocus={() => setFocusedInput("name")}
                      onBlur={() => setFocusedInput("")}
                      required
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div style={{ width: "100%", marginBottom: "25px" }}>
                  <label
                    htmlFor="email"
                    style={{
                      color: "black",
                      fontWeight: 500,
                      marginBottom: "8px",
                      display: "block",
                      textAlign: "left",
                      fontSize: "15px",
                    }}
                  >
                    Email Address
                  </label>
                  <div style={{ position: "relative" }}>
                    <FaEnvelope
                      style={{
                        position: "absolute",
                        left: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: getColor("email"),
                        pointerEvents: "none",
                      }}
                    />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      style={{
                        width: "100%",
                        padding: "12px 10px 12px 40px",
                        borderRadius: "8px",
                        border: `2px solid ${getColor("email")}`,
                        backgroundColor: "white",
                        color: "black",
                        outline: "none",
                        height: "45px",
                        boxSizing: "border-box",
                        fontWeight: 400,
                        fontSize: "14px",
                      }}
                      onFocus={() => setFocusedInput("email")}
                      onBlur={() => setFocusedInput("")}
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div style={{ width: "100%", marginBottom: "15px" }}>
                  <label
                    htmlFor="password"
                    style={{
                      color: "black",
                      fontWeight: 500,
                      marginBottom: "8px",
                      display: "block",
                      textAlign: "left",
                      fontSize: "15px",
                    }}
                  >
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <FaLock
                      style={{
                        position: "absolute",
                        left: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: getColor("password"),
                        pointerEvents: "none",
                      }}
                    />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      style={{
                        width: "100%",
                        padding: "12px 40px 12px 40px",
                        borderRadius: "8px",
                        border: `2px solid ${getColor("password")}`,
                        backgroundColor: "white",
                        color: "black",
                        outline: "none",
                        height: "45px",
                        boxSizing: "border-box",
                        fontWeight: 400,
                        fontSize: "14px",
                      }}
                      onFocus={() => setFocusedInput("password")}
                      onBlur={() => setFocusedInput("")}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: getColor("password"),
                      }}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {/* Register Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: loading ? "#ccc" : "#000080",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    marginBottom: "20px",
                  }}
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>

                {/* Switch to Sign In */}
                <p style={{ textAlign: "center", color: "#666" }}>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setIsRegistering(false)}
                    style={{
                      color: "#000080",
                      textDecoration: "underline",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Sign in here
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
