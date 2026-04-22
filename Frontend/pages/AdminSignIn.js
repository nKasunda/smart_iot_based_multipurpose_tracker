import React from "react";
import SignInForm from "../components/SignInForm";

function AdminPage() {
  return (
    <main className="pageShell">
      <section className="hero">
        <div className="ambientGlow ambientGlowTop" />
        <div className="ambientGlow ambientGlowBottom" />
        <div className="gridTexture" />
        <div className="overlay" />

        <div className="content">
          <div className="intro">
            <span className="eyebrow">Administrator</span>
            <h1>Set up your admin account for the tracker platform.</h1>
            <p>
              Create your administrator credentials to manage devices, monitor
              activity, and control the wider IoT workspace from one place.
            </p>
          </div>

          <SignInForm role="admin" portalName="Administrator" />
        </div>
      </section>

      <style jsx>{`
        .pageShell {
          min-height: 100vh;
          background: #e8eef5;
        }

        .hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          background:
            radial-gradient(circle at top left, rgba(84, 135, 196, 0.2), transparent 34%),
            radial-gradient(circle at bottom right, rgba(26, 72, 118, 0.32), transparent 30%),
            linear-gradient(135deg, #06111f 0%, #0d2239 50%, #123657 100%);
          overflow: hidden;
        }

        .ambientGlow {
          position: absolute;
          border-radius: 999px;
          filter: blur(10px);
          opacity: 0.9;
        }

        .ambientGlowTop {
          top: -120px;
          left: -80px;
          width: 360px;
          height: 360px;
          background: radial-gradient(circle, rgba(95, 168, 255, 0.3), transparent 68%);
        }

        .ambientGlowBottom {
          right: -120px;
          bottom: -160px;
          width: 420px;
          height: 420px;
          background: radial-gradient(circle, rgba(31, 100, 173, 0.28), transparent 70%);
        }

        .gridTexture {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.055) 1px, transparent 1px);
          background-size: 72px 72px;
          mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.75), transparent);
          opacity: 0.32;
        }

        .overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(4, 12, 24, 0.46),
            rgba(7, 26, 48, 0.18)
          );
        }

        .content {
          position: relative;
          z-index: 1;
          width: min(1160px, 100%);
          display: grid;
          grid-template-columns: 1fr minmax(320px, 620px);
          gap: 40px;
          align-items: center;
        }

        .intro {
          color: #f4f7fb;
          max-width: 560px;
        }

        .eyebrow {
          display: inline-block;
          margin-bottom: 18px;
          padding: 8px 14px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          font-size: 0.82rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0 0 18px;
          font-size: clamp(2.4rem, 5vw, 4.3rem);
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        p {
          margin: 0;
          font-size: 1.04rem;
          line-height: 1.8;
          color: rgba(244, 247, 251, 0.86);
        }

        @media (max-width: 960px) {
          .content {
            grid-template-columns: 1fr;
          }

          .intro {
            max-width: none;
          }
        }

        @media (max-width: 640px) {
          .hero {
            padding: 24px;
          }

          h1 {
            font-size: 2.3rem;
          }

          p {
            font-size: 0.98rem;
          }
        }
      `}</style>
    </main>
  );
}

export default AdminPage;
