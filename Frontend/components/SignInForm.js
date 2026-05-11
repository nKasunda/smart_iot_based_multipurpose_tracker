import React, { useState } from "react";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import { auth as firebaseAuth } from "../Firebase";

function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const appAuth = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      await appAuth.login(email, password);
      // Role is now determined by backend - user's email determines if admin or client
      // Both roles go to the same dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Sign in error:", error.message);
      setError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(firebaseAuth, provider);
      const idToken = await credential.user.getIdToken();
      await appAuth.googleLogin(idToken);
      router.push("/dashboard");
    } catch (error) {
      console.error("Google sign in error:", error);
      setError(error.response?.data?.error || error.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const getColor = (inputName) => (focusedInput === inputName ? "#000080": "gray");

  return (
    <form
      onSubmit={handleSubmit}
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
        Sign in to your account
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

      {/* Forgot Password Link */}
      <div style={{ textAlign: "right", marginBottom: "30px" }}>
        <Link
          href="/forgot-password"
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

      {/* 🔹 Updated Sign In Button with Animation + Spinner */}
      <button
        type="submit"
        className="sign-in-button"
        disabled={loading}
      >
        {loading ? <div className="spinner"></div> : "Sign In"}
      </button>

      <div className="divider">
        <span>or</span>
      </div>

      <button
        type="button"
        className="google-button"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        <FaGoogle />
        Sign in with Google
      </button>

      {/* Register Link */}
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <span style={{ color: "black", fontSize: "14px" }}>
          Don't have an account?{" "}
          <Link
            href="/register"
            style={{
              color: "#000080",
              textDecoration: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign up here
          </Link>
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

        .divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 18px 0;
          color: #6b7280;
          font-size: 12px;
          font-weight: 700;
        }

        .divider::before,
        .divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }

        .google-button {
          width: 100%;
          height: 45px;
          border-radius: 8px;
          border: 2px solid #e5e7eb;
          background: #ffffff;
          color: #111827;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 700;
          transition: all 0.2s ease;
        }

        .google-button:hover {
          border-color: #000080;
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(0, 0, 128, 0.14);
        }

        .google-button:disabled {
          opacity: 0.72;
          cursor: not-allowed;
          transform: none;
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
