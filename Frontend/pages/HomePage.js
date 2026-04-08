import Link from "next/link";
import Header from "../components/Header";
import RoleCard from "../components/RoleCard";

function HomePage() {
  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, #06111f 0%, #0d2239 50%, #123657 100%)",
        minHeight: "100vh",
        color: "white",
      }}
    >
      <Header />
      <main
        style={{
          minHeight: "calc(100vh - 74px)",
          padding: "80px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(2rem, 4vw, 3.25rem)",
            marginBottom: "18px",
          }}
        >
          Welcome to Tracker
        </h2>
        <p
          style={{
            maxWidth: "640px",
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.82)",
            marginBottom: "36px",
          }}
        >
          Choose the portal that matches your role to create your account and
          continue into the smart IoT tracking workspace.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          <Link href="/ClientSignIn">
            <RoleCard
              title="Client Account"
              description="Register to monitor your assets and view tracking updates."
            />
          </Link>

          <Link href="/AdminSignIn">
            <RoleCard
              title="Administrator Account"
              description="Create an admin account to manage devices and platform activity."
            />
          </Link>
        </div>
      </main>
    </div>
  );
}

export default HomePage;
