import Navbar from "./Navbar";
import Footer from "./Footer";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col font-body">
      <Navbar />
      <main className="flex-1 pt-16 md:pt-[4.5rem]">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
