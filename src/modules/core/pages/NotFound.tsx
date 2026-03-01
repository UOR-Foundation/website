import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // If the path is an OAuth callback, let the platform handle it
    // by doing a hard navigation instead of showing 404
    if (location.pathname.startsWith("/~oauth")) {
      window.location.href = location.pathname + location.search + location.hash;
      return;
    }
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname, location.search, location.hash]);

  // Don't render 404 UI for OAuth paths — we're redirecting
  if (location.pathname.startsWith("/~oauth")) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
