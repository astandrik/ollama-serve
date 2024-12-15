import React from "react";
import { Link, useLocation } from "react-router-dom";

export const Layout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const location = useLocation();

  return (
    <div className="app-container">
      <nav className="app-nav">
        <div className="nav-links">
          <Link to="/" className={location.pathname === "/" ? "active" : ""}>
            Code Assistant
          </Link>
          <Link
            to="/metrics"
            className={location.pathname === "/metrics" ? "active" : ""}
          >
            System Metrics
          </Link>
        </div>
      </nav>
      <main className="code-api">{children}</main>
    </div>
  );
};
