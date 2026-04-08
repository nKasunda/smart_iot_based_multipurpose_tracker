import React, { useState } from "react";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUser } from "react-icons/fa";
import Link from "next/link";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/pages/Firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/router";

function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

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

  const getColor = (inputName) => (focusedInput === inputName ? "#000080": "gray");

  return (
    <form
      onSubmit={isRegistering ? handleRegister : handleSignIn}
      style={{
        backgroundColor: "white",
        padding: "40px",
        borderRadius: "15px",
        width: "400px",
        boxShadow: "0 6px 12px rgba(0,0,0,0.5)",
        fontFamily: "'Roboto', sans-serif",
      }}
    >
      {/* Heading */}
      <h2
        style={{
          marginBottom: "30px",
          color: "black",
          textAlign: "center",
          fontWeight: 700,
          fontSize: "22px",
        }}
      >
        {isRegistering ? "Create Account" : "Sign in to your account"}
      </h2>

      {/* Name Field (only for registration) */}
      {isRegistering && (
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
      )}

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
            placeholder={isRegistering ? "Create a password" : "Enter your password"}
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
          <div
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: getColor("password"),
              cursor: "pointer",
            }}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </div>
        </div>
      </div>

      {/* Forgot Password Link (only for sign-in) */}
      {!isRegistering && (
        <div style={{ textAlign: "right", marginBottom: "30px" }}>
          <Link
            href="/ForgotPassword"
            style={{
              color: "#000080",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 400,
            }}
          >
            Forgot Password?
          </Link>
        </div>
      )}

      {/* Sign In/Register Button */}
      <button
        type="submit"
        className="sign-in-button"
        disabled={loading}
      >
        {loading ? <div className="spinner"></div> : (isRegistering ? "Create Account" : "Sign In")}
      </button>

      {/* Toggle between Sign In and Register */}
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <span style={{ color: "#666", fontSize: "14px" }}>
          {isRegistering ? "Already have an account? " : "Don't have an account? "}
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            style={{
              color: "#000080",
              textDecoration: "underline",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            {isRegistering ? "Sign in here" : "Register here"}
          </button>
        </span>
      </div>

      <style jsx>{`
        input::placeholder {
          color: gray;
          opacity: 1;
          font-weight: 400;
        }

        .sign-in-button {
          width: 100%;
          padding: 12px;
          background-color: #000080;
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          font-weight: 700;
          height: 45px;
          font-size: 15px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 8px rgba(0, 123, 255, 0.2);
        }

        .sign-in-button:hover {
          transform: scale(1.05);
          background-color: #000080;
          box-shadow: 0 6px 14px rgba(0, 123, 255, 0.4);
        }

        .sign-in-button:active {
          transform: scale(0.97);
        }

        .sign-in-button:disabled {
          background-color: #000080;
          cursor: not-allowed;
          transform: none;
        }

        .spinner {
          border: 3px solid white;
          border-top: 3px solid transparent;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          margin: 0 auto;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </form>
  );
}

export default SignInForm;
