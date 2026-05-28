import React, { useState } from "react";
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import { friendlyError } from "../lib/errors";

function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const auth = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const name = e.target.name.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;

    // Validation
    if (!name.trim()) {
      setError("Enter your full name to create the account.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Use a password with at least 6 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match. Re-enter them and try again.");
      setLoading(false);
      return;
    }

    try {
      const data = await auth.register(name, email, password);
      router.push({
        pathname: "/verify-email",
        query: {
          email,
          sent: data?.emailSent === false ? "0" : "1",
        },
      });
    } catch (error) {
      console.error("Register error:", error.message);
      setError(friendlyError(error, "Registration failed. Check your details and try again."));
    } finally {
      setLoading(false);
    }
  };

  const getColor = (inputName) => (focusedInput === inputName ? "#000080" : "gray");

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: "white",
        padding: "clamp(22px, 6vw, 40px)",
        borderRadius: "15px",
        width: "min(400px, calc(100vw - 32px))",
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
        Create your account
      </h2>

      {error ? (
        <div
          style={{
            marginBottom: "18px",
            padding: "10px 12px",
            borderRadius: "10px",
            background: "rgba(220,38,38,0.1)",
            border: "1px solid rgba(220,38,38,0.2)",
            color: "#7f1d1d",
            fontSize: "13px",
            fontWeight: 600,
            textAlign: "left",
          }}
        >
          {error}
        </div>
      ) : null}

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
            className="auth-input"
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
            className="auth-input"
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
      <div style={{ width: "100%", marginBottom: "25px" }}>
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
            className="auth-input"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password (min 6 characters)"
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

      {/* Confirm Password Field */}
      <div style={{ width: "100%", marginBottom: "15px" }}>
        <label
          htmlFor="confirmPassword"
          style={{
            color: "black",
            fontWeight: 500,
            marginBottom: "8px",
            display: "block",
            textAlign: "left",
            fontSize: "15px",
          }}
        >
          Confirm Password
        </label>
        <div style={{ position: "relative" }}>
          <FaLock
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: getColor("confirmPassword"),
              pointerEvents: "none",
            }}
          />
          <input
            id="confirmPassword"
            name="confirmPassword"
            className="auth-input"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your password"
            style={{
              width: "100%",
              padding: "12px 40px 12px 40px",
              borderRadius: "8px",
              border: `2px solid ${getColor("confirmPassword")}`,
              backgroundColor: "white",
              color: "black",
              outline: "none",
              height: "45px",
              boxSizing: "border-box",
              fontWeight: 400,
              fontSize: "14px",
            }}
            onFocus={() => setFocusedInput("confirmPassword")}
            onBlur={() => setFocusedInput("")}
            required
          />
          <div
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: getColor("confirmPassword"),
              cursor: "pointer",
            }}
          >
            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
          </div>
        </div>
      </div>

      {/* Sign Up Button */}
      <button
        type="submit"
        className="sign-up-button"
        disabled={loading}
        style={{ marginTop: "30px" }}
      >
        {loading ? <div className="spinner"></div> : "Create Account"}
      </button>

      {/* Sign In Link */}
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <span style={{ color: "black", fontSize: "14px" }}>
          Already have an account?{" "}
          <Link
            href="/"
            style={{
              color: "#000080",
              textDecoration: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign in here
          </Link>
        </span>
      </div>

      <style jsx>{`
        input::placeholder {
          color: gray;
          opacity: 1;
          font-weight: 400;
        }

        .sign-up-button {
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

        .sign-up-button:hover {
          transform: scale(1.05);
          background-color: #000080;
          box-shadow: 0 6px 14px rgba(0, 123, 255, 0.4);
        }

        .sign-up-button:active {
          transform: scale(0.97);
        }

        .sign-up-button:disabled {
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

export default RegisterForm;
