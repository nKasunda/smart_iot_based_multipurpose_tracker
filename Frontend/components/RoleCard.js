import React from "react";

function RoleCard({ eyebrow, title, description, meta, accent = "primary" }) {
  const isPrimary = accent === "primary";

  return (
    <div className={`card ${isPrimary ? "primary" : "secondary"}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="footer">
        <span>{meta}</span>
        <span className="arrow">Open</span>
      </div>

      <style jsx>{`
        .card {
          width: min(100%, 340px);
          min-height: 240px;
          padding: 28px;
          border-radius: 28px;
          color: #10233a;
          border: 1px solid rgba(255, 255, 255, 0.42);
          box-shadow: 0 24px 50px rgba(3, 12, 24, 0.22);
          backdrop-filter: blur(12px);
          cursor: pointer;
          transition: transform 0.25s ease, box-shadow 0.25s ease,
            border-color 0.25s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 28px 58px rgba(3, 12, 24, 0.28);
          border-color: rgba(154, 177, 198, 0.95);
        }

        .primary {
          background: linear-gradient(
            180deg,
            rgba(248, 250, 252, 0.98) 0%,
            rgba(239, 246, 252, 0.94) 100%
          );
        }

        .secondary {
          background: linear-gradient(
            180deg,
            rgba(244, 248, 252, 0.96) 0%,
            rgba(234, 242, 249, 0.92) 100%
          );
        }

        .eyebrow {
          display: inline-flex;
          align-self: flex-start;
          margin-bottom: 14px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(18, 58, 99, 0.08);
          color: #315980;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        h3 {
          margin: 0 0 12px;
          font-size: 1.6rem;
          line-height: 1.15;
        }

        p {
          margin: 0;
          color: #5f7285;
          line-height: 1.75;
          font-size: 0.98rem;
        }

        .footer {
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid rgba(154, 177, 198, 0.42);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #315980;
          font-size: 0.9rem;
          font-weight: 700;
        }

        .arrow {
          color: #123a63;
        }
      `}</style>
    </div>
  );
}

export default RoleCard;
