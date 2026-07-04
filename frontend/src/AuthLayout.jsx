// src/components/AuthLayout.jsx
import Navbar from "./Navbar";

export default function AuthLayout({ children, showNavbar = true }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-transparent">
      {/* BACKGROUND VIDEO */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover -z-20"
      >
        <source src="/video/background.mp4" type="video/mp4" />
      </video>

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none -z-10" />

      {/* NAVBAR (if any) */}
      {showNavbar && <Navbar />}

      {/* MAIN CONTENT WRAPPER */}
      <div className="relative min-h-[calc(100vh-56px)] flex items-center px-6 md:px-10 lg:px-16 xl:px-24 2xl:px-32">
        <div className="w-full z-30">{children}</div>
      </div>
    </div>
  );
}
