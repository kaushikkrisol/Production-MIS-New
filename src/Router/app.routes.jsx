import React, { lazy, Suspense, useEffect, useState } from "react";
import { Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { ApprovalRoute, posRoutes, publicRoutes } from "./router.link";
import Header from "../InitialPage/Sidebar/Header";
import Sidebar from "../InitialPage/Sidebar/Sidebar";

const ThemeSettings = lazy(() => import("../InitialPage/themeSettings"));

const PageLoading = ({ message = "Loading..." }) => (
  <div className="page-wrapper">
    <div className="content text-center p-4">{message}</div>
  </div>
);

class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    const message = String(error?.message || error || "");
    const isChunkLoadError =
      /ChunkLoadError|Loading chunk|failed to fetch dynamically imported module/i.test(message);

    if (isChunkLoadError && !sessionStorage.getItem("chunk-reload-attempted")) {
      sessionStorage.setItem("chunk-reload-attempted", "1");
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return <PageLoading message="Could not load this screen. Refresh the page." />;
    }

    return this.props.children;
  }
}

const AppRoutes = () => {
  const data = useSelector((state) => state.toggle_header);
  const location = useLocation();
  const [loadThemeSettings, setLoadThemeSettings] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem("chunk-reload-attempted");
  }, [location.pathname]);

  useEffect(() => {
    const loadSettings = () => setLoadThemeSettings(true);

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(loadSettings, { timeout: 3000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(loadSettings, 1500);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const HeaderLayout = () => (
      <div className={`main-wrapper ${data ? "header-collapse" : ""}`}>
        <Header />
        <Sidebar />
      <ChunkErrorBoundary key={location.pathname}>
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </ChunkErrorBoundary>
      {loadThemeSettings && (
        <Suspense fallback={null}>
          <ThemeSettings />
        </Suspense>
      )}
    </div>
  );

  const CustomerApproval = () => (
    <div>
      <Outlet />
    </div>
  );

  const Pospages = () => (
    <div>
      <Header />
      <Suspense fallback={<PageLoading />}>
        <Outlet />
      </Suspense>
    </div>
  );

  return (
    <Routes>
      <Route path="/pos" element={<Pospages />}>
        {posRoutes.map((route, id) => (
          <Route path={route.path} element={route.element} key={id} />
        ))}
      </Route>
      <Route path="/" element={<HeaderLayout />}>
        {publicRoutes.map((route, id) => (
          <Route path={route.path} element={route.element} key={id} />
        ))}
      </Route>
      <Route path="/approval" element={<CustomerApproval />}>
        {ApprovalRoute.map((route, id) => (
          <Route path={route.path} element={route.element} key={id} />
        ))}
      </Route>
    </Routes>
  );
};

export default AppRoutes;
