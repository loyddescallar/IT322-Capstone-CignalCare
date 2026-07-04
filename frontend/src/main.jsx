import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import App from "./App";
import "./index.css";
import LoadingScreen from "./components/LoadingScreen";

const AUTH_PAGES = ["/login", "/register", "/admin-login"];

function AppWithLoading() {
  const location = useLocation();
  const [loading, setLoading] = useState(!AUTH_PAGES.includes(location.pathname));

  useEffect(() => {
    if (AUTH_PAGES.includes(location.pathname)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(() => setLoading(false), 800);

    return () => clearTimeout(timeout);
  }, [location.pathname]);

  if (loading) return <LoadingScreen />;

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AppWithLoading />
  </BrowserRouter>
);
