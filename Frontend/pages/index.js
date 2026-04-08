import Head from "next/head";
import { useRouter } from "next/router";

export default function HomePage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>IoT Tracker | Sign In</title>
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
              <h1>IoT Multipurpose Tracker</h1>
              <p>
                Monitor connected devices, view location activity, and access
                your tracking tools from one secure workspace.
              </p>
            </div>

            <div className="card">
              <span className="cardLabel">Choose Access</span>
              <h2>Sign in to continue</h2>
              <p>
                Select the portal that matches your role to access the correct
                dashboard and features.
              </p>

              <div className="actions">
                <button
                  type="button"
                  className="primaryButton"
                  onClick={() => router.push("/ClientSignIn")}
                >
                  Client Portal
                </button>

                <button
                  type="button"
                  className="secondaryButton"
                  onClick={() => router.push("/AdminSignIn")}
                >
                  Administrator
                </button>
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
            rgba(4, 12, 24, 0.46),
            rgba(7, 26, 48, 0.18)
          );
        }

        .content {
          position: relative;
          z-index: 1;
          width: min(1120px, 100%);
          display: grid;
          grid-template-columns: 1.2fr 0.9fr;
          gap: 40px;
          align-items: center;
        }

        .brandBlock {
          color: #f4f7fb;
          max-width: 620px;
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
          font-size: clamp(2.5rem, 5vw, 4.5rem);
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .brandBlock p {
          margin: 0;
          max-width: 560px;
          font-size: 1.05rem;
          line-height: 1.75;
          color: rgba(244, 247, 251, 0.88);
        }

        .card {
          padding: 36px 32px;
          border-radius: 24px;
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

        .cardLabel {
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
          font-size: 1.9rem;
          line-height: 1.2;
        }

        .card p {
          margin: 0 0 28px;
          color: #516477;
          line-height: 1.7;
        }

        .actions {
          display: grid;
          gap: 14px;
        }

        .primaryButton,
        .secondaryButton {
          width: 100%;
          min-height: 54px;
          border-radius: 14px;
          border: 1px solid transparent;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease,
            border-color 0.2s ease, background-color 0.2s ease;
        }

        .primaryButton {
          background: #123a63;
          color: #ffffff;
          box-shadow: 0 14px 28px rgba(18, 58, 99, 0.22);
        }

        .secondaryButton {
          background: #ffffff;
          color: #123a63;
          border-color: #c9d6e2;
        }

        .primaryButton:hover,
        .secondaryButton:hover {
          transform: translateY(-1px);
        }

        .primaryButton:hover {
          box-shadow: 0 18px 32px rgba(18, 58, 99, 0.3);
        }

        .secondaryButton:hover {
          background: #f7fafc;
          border-color: #9ab1c6;
        }

        @media (max-width: 900px) {
          .content {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .brandBlock {
            max-width: none;
          }

          .hero {
            padding: 24px;
          }

          .ambientGlowTop {
            width: 280px;
            height: 280px;
          }

          .ambientGlowBottom {
            width: 300px;
            height: 300px;
          }
        }

        @media (max-width: 640px) {
          .page,
          .hero {
            min-height: 100dvh;
          }

          .card {
            padding: 28px 22px;
            border-radius: 20px;
          }

          h1 {
            font-size: 2.4rem;
          }

          h2 {
            font-size: 1.6rem;
          }

          .brandBlock p,
          .card p {
            font-size: 0.98rem;
          }
        }
      `}</style>
    </>
  );
}
