// src/components/Header.js
import React from "react";

function Header() {
  return (
    <header style={styles.header}>
      <h1 style={styles.title}>Tracker</h1>
      <nav>
        <ul style={styles.navList}>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </nav>
    </header>

  );
}


const styles = {
  header: {
    backgroundColor: "#FFFF",
    padding: "10px",
    color: "#000080",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
     zIndex: 1000,
    
  },
  title: {
    margin: 0
  },
  navList: {
    listStyle: "none",
    display: "flex",
    gap: "20px",
    margin: 0,
    padding: 0
  }
};

export default Header;
