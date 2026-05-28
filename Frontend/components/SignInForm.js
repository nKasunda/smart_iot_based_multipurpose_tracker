import React, { useEffect, useRef, useState } from "react";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { getRedirectResult, GoogleAuthProvider, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import { auth as firebaseAuth } from "../Firebase";
import { friendlyError } from "../lib/errors";

const ADMIN_EMAIL = "kasundanelson@gmail.com";

const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [showAdminHint, setShowAdminHint] = useState(false);
  const router = useRouter();
  const appAuth = useAuth();
  const checkedGoogleRedirect = useRef(false);

  const finishGoogleSignIn = async (credential) => {
    const idToken = await credential.user.getIdToken();
    await appAuth.googleLogin(idToken);
    router.push("/dashboard");
  };

  useEffect(() => {
    if (checkedGoogleRedirect.current) return;
    checkedGoogleRedirect.current = true;

    const handleRedirectResult = async () => {
      try {
        const credential = await getRedirectResult(firebaseAuth);
        if (!credential) return;
        setLoading(true);
        setError("");
        await finishGoogleSignIn(credential);
      } catch (error) {
        console.error("Google redirect sign in error:", error);
        setError(friendlyError(error, "Google sign-in could not complete. Please try again."));
      } finally {
        setLoading(false);
      }
    };

    handleRedirectResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShowAdminHint(false);
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      await appAuth.login(email, password);
      // Role is now determined by backend - user's email determines if admin or client
      // Both roles go to the same dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Sign in error:", error.message);
      setError(friendlyError(error, "Sign in failed. Check your details and try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    setShowAdminHint(false);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(firebaseAuth, provider);
      await finishGoogleSignIn(credential);
    } catch (error) {
      console.error("Google sign in error:", error);
      if (error.code === "auth/popup-blocked") {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await signInWithRedirect(firebaseAuth, provider);
        return;
      }
      setError(friendlyError(error, "Google sign-in could not complete. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const getColor = (inputName) => (focusedInput === inputName ? "#000080": "gray");

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.96)",
        padding: "clamp(22px, 5vw, 40px)",
        borderRadius: "14px",
        width: "min(400px, calc(100vw - 32px))",
        maxWidth: "100%",
        boxShadow: "0 24px 60px rgba(3, 7, 18, 0.28)",
        fontFamily: "'Roboto', sans-serif",
        border: "1px solid rgba(255,255,255,0.55)",
      }}
    >
      {/* Heading */}
      <h2
        style={{
          marginBottom: "clamp(18px, 4vw, 30px)",
          color: "black",
          textAlign: "center",
          fontWeight: 700,
          fontSize: "clamp(18px, 5vw, 22px)",
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
            {String(error).toLowerCase().includes("verify") ? (
              <div style={{ marginTop: 8, lineHeight: 1.5 }}>
                Contact the administrator at{" "}
                <a href={`mailto:${ADMIN_EMAIL}`} style={{ color: "#000080", fontWeight: 800 }}>
                  {ADMIN_EMAIL}
                </a>
                {" "}for account access.
              </div>
            ) : null}
          </div>
        ) : null}

      {/* Email Field */}
      <div style={{ width: "100%", marginBottom: "clamp(16px, 3vw, 25px)" }}>
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            className="auth-input"
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

      <div style={{ textAlign: "right", marginBottom: "clamp(18px, 4vw, 30px)" }}>
        <button
          type="button"
          onClick={() => setShowAdminHint((value) => !value)}
          style={{
            color: "#000080",
            background: "transparent",
            border: 0,
            padding: 0,
            fontSize: "0.9rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Forgot Password?
        </button>
      </div>

      {showAdminHint ? (
        <div
          style={{
            margin: "-12px 0 18px",
            padding: "10px 12px",
            borderRadius: 8,
            background: "white",
            border: "1px solid #000080",
            color: "#000080",
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.45,
          }}
        >
          Contact the administrator at{" "}
          <a href={`mailto:${ADMIN_EMAIL}`} style={{ color: "#000080", fontWeight: 800 }}>
            {ADMIN_EMAIL}
          </a>{" "}
          for password help.
        </div>
      ) : null}

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
        <GoogleLogo />
        Sign in with Google
      </button>

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
          box-shadow: 0 10px 18px rgba(0, 0, 128, 0.18);
        }

        .sign-in-button:hover {
          transform: translateY(-1px);
          background-color: #000080;
          box-shadow: 0 14px 22px rgba(0, 0, 128, 0.24);
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

        @media (max-width: 420px), (max-height: 680px) {
          .sign-in-button,
          .google-button {
            height: 42px;
          }

          .divider {
            margin: 12px 0;
          }
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
