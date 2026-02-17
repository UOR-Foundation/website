import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu, X, Heart } from "lucide-react";
import uorIcon from "@/assets/uor-icon.png";

const navItems = [
  { label: "About", href: "/about" },
  { label: "The Standard", href: "/standard" },
  { label: "Our Community", href: "/research" },
  { label: "Your Projects", href: "/projects" },
];

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
        scrolled
          ? "bg-background/60 backdrop-blur-xl border-b border-border/10"
          : "bg-transparent"
      }`}
    >
      <div className="container flex items-center justify-between h-20 md:h-24">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src={uorIcon}
            alt="UOR Foundation"
            className="w-8 h-8 object-contain transition-transform duration-300 group-hover:scale-105"
            style={{ imageRendering: "auto" }}
          />
          <span className="font-display text-base font-semibold tracking-tight">
            The UOR Foundation
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`nav-pill ${location.pathname === item.href ? "nav-pill-active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center">
          <a
            href="https://www.uor.foundation/donate"
            target="_blank"
            rel="noopener noreferrer"
            className="!py-2 !px-5 !text-sm inline-flex items-center rounded-full font-medium transition-all duration-300 ease-out text-white hover:shadow-lg"
            style={{ backgroundColor: 'hsl(216, 77%, 27%)' }}
          >
            <Heart size={14} fill="white" strokeWidth={0} className="mr-1" />
            Donate
          </a>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-foreground transition-transform duration-200 active:scale-90"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${
          mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-background/95 backdrop-blur-xl border-b border-border px-6 py-5">
          <nav className="flex flex-col gap-2.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`nav-pill text-center ${location.pathname === item.href ? "nav-pill-active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
