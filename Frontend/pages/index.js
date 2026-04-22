import Head from "next/head";
import Link from "next/link";
import RoleCard from "../components/RoleCard";

const quickStats = [
  { label: "Role-based access", value: "Admin + Client" },
  { label: "Tracking view", value: "Live + History" },
  { label: "Device coverage", value: "Multi-asset" },
];

export default function HomePage() {
  return (
    <>
      <Head>
        <title>IoT Tracker | Home</title>
        <meta
          name="description"
          content="Smart IoT tracker platform for monitoring devices, routes, and alerts."
        />
      </Head>

      <main className="page">
        <section className="hero">
          <div className="ambientGlow ambientGlowTop" />
          <div className="ambientGlow ambientGlowBottom" />
          <div className="gridTexture" />
          <div className="overlay" />

          <div className="content">
            <div className="brandBlock">
              <span className="eyebrow">Smart Monitoring Platform</span>
              <h1>Track devices and movement from one connected workspace.</h1>
              <p className="lead">
                The Smart IoT Multipurpose Tracker brings together secure access,
                live location visibility, and device oversight in a single
                platform designed for both clients and administrators.
              </p>

              <div className="ctaRow">
                <Link href="/ClientLogin" className="primaryButton">
                  Client Sign In
                </Link>
                <Link href="/ClientSignIn" className="secondaryButton">
                  Create Account
                </Link>
              </div>

              <div className="statsGrid">
                {quickStats.map((stat) => (
                  <div key={stat.label} className="statCard">
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="accessPanel">
              <div className="panelHeader">
                <span className="panelLabel">Choose Access</span>
                <h2>Enter the workspace that matches your role</h2>
                <p>
                  Continue as a client to follow assigned assets, or sign in as
                  an administrator to manage the full tracking environment.
                </p>
              </div>

              <div className="roleGrid">
                <Link href="/ClientLogin" className="cardLink">
                  <RoleCard
                    eyebrow="Client"
                    title="Client Workspace"
                    description="Access your dashboard, check assigned devices, and review current movement updates."
                    meta="Personal tracking access"
                    accent="primary"
                  />
                </Link>

                <Link href="/AdminLogin" className="cardLink">
                  <RoleCard
                    eyebrow="Administrator"
                    title="Admin Workspace"
                    description="Manage users, devices, monitoring activity, and the wider tracking operations."
                    meta="Platform management access"
                    accent="secondary"
                  />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        .page {
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
            rgba(4, 12, 24, 0.5),
            rgba(7, 26, 48, 0.18)
          );
        }

        .content {
          position: relative;
          z-index: 1;
          width: min(1180px, 100%);
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
          gap: 44px;
          align-items: center;
        }

        .brandBlock {
          color: #f4f7fb;
          max-width: 640px;
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
          margin: 0 0 20px;
          font-size: clamp(2.7rem, 5vw, 4.9rem);
          line-height: 1.03;
          letter-spacing: -0.045em;
        }

        .lead {
          margin: 0;
          max-width: 580px;
          font-size: 1.05rem;
          line-height: 1.85;
          color: rgba(244, 247, 251, 0.88);
        }

        .ctaRow {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          margin-top: 30px;
        }

        .primaryButton,
        .secondaryButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 54px;
          padding: 0 22px;
          border-radius: 16px;
          font-size: 0.98rem;
          font-weight: 700;
          transition: transform 0.2s ease, box-shadow 0.2s ease,
            border-color 0.2s ease, background-color 0.2s ease;
        }

        .primaryButton {
          background: #f4f8fc;
          color: #123a63;
          box-shadow: 0 16px 28px rgba(3, 12, 24, 0.18);
        }

        .secondaryButton {
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: rgba(255, 255, 255, 0.08);
          color: #f4f7fb;
        }

        .primaryButton:hover,
        .secondaryButton:hover {
          transform: translateY(-2px);
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 32px;
        }

        .statCard {
          padding: 18px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(8px);
        }

        .statCard span {
          display: block;
          margin-bottom: 10px;
          color: rgba(244, 247, 251, 0.7);
          font-size: 0.82rem;
        }

        .statCard strong {
          font-size: 1rem;
          color: #ffffff;
        }

        .accessPanel {
          padding: 34px;
          border-radius: 30px;
          background: linear-gradient(
            180deg,
            rgba(248, 250, 252, 0.96) 0%,
            rgba(241, 246, 251, 0.93) 100%
          );
          color: #10233a;
          box-shadow: 0 24px 60px rgba(3, 12, 24, 0.22);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.45);
        }

        .panelHeader {
          margin-bottom: 24px;
        }

        .panelLabel {
          display: inline-block;
          margin-bottom: 12px;
          color: #315980;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        h2 {
          margin: 0 0 12px;
          font-size: 2rem;
          line-height: 1.18;
        }

        .panelHeader p {
          margin: 0;
          color: #516477;
          line-height: 1.75;
        }

        .roleGrid {
          display: grid;
          gap: 18px;
        }

        .cardLink {
          display: block;
        }

        @media (max-width: 980px) {
          .content {
            grid-template-columns: 1fr;
            gap: 28px;
          }

          .brandBlock {
            max-width: none;
          }
        }

        @media (max-width: 720px) {
          .statsGrid {
            grid-template-columns: 1fr;
          }

          .accessPanel {
            padding: 26px 22px;
            border-radius: 24px;
          }
        }

        @media (max-width: 640px) {
          .page,
          .hero {
            min-height: 100dvh;
          }

          .hero {
            padding: 24px;
          }

          h1 {
            font-size: 2.55rem;
          }

          h2 {
            font-size: 1.65rem;
          }

          .lead,
          .panelHeader p {
            font-size: 0.98rem;
          }
        }
      `}</style>
    </>
  );
}
