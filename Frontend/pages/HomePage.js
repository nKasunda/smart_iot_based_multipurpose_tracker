import Link from "next/link";
import RoleCard from "../components/RoleCard";

function HomePage() {
  return (
     <div
       style={{
        backgroundImage: "url('images/bg1.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
        color: "white"
      }}
    >
    <Header />
    <main style={{ padding: "200px", textAlign: "center" }}>
      <h2>Welcome to Tracker</h2>

      <div style={{ display: "flex", justifyContent: "center", gap: "40px" }}>
        <Link href="/client">
          <RoleCard title="Client Account" />
        </Link>

        <Link href="/admin">
          <RoleCard title="Administrator Account" />
        </Link>
      </div>
    </main>
    </div>
  );
}

export default HomePage;
