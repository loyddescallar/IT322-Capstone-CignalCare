// src/pages/UserDashboard.jsx
import Navbar from "../components/Navbar";
import { useState, useEffect } from "react";
import { prepaidPlans } from "../data/prepaidPlans";

import {
  CreditCardIcon,
  TvIcon,
  WifiIcon,
  StarIcon,
  FilmIcon,
  CpuChipIcon,
  PhoneIcon,
  BanknotesIcon,
  GlobeAltIcon,
  SparklesIcon,
  MapPinIcon,
} from "@heroicons/react/24/solid";

// LOAD PLANS
const LOAD_PLANS = [
  { amount: "200", label: "Load 200", details: "Balanced value and duration.", icon: CreditCardIcon },
  { amount: "300", label: "Load 300", details: "Great for regular monthly viewing.", icon: StarIcon },
  { amount: "450", label: "Load 450", details: "Great for regular monthly viewing.", icon: StarIcon },
  { amount: "500", label: "Load 500", details: "Extended access with premium channels.", icon: TvIcon },
  { amount: "600", label: "Load 600", details: "Extra-long viewing for the family.", icon: FilmIcon },
  { amount: "800", label: "Load 800", details: "Entry prepaid load for light viewing.", icon: CreditCardIcon },
  { amount: "1000", label: "Load 1000", details: "Maximum validity + full experience.", icon: WifiIcon },
];

// ABOUT TILES
const ABOUT_TILES = [
  { title: "Coverage", text: "Nationwide service reaching all Filipino homes.", icon: MapPinIcon },
  { title: "Entertainment", text: "A wide variety of channels for all ages.", icon: FilmIcon },
  { title: "Technology", text: "Digital-quality signal built for modern viewing.", icon: CpuChipIcon },
  { title: "Support", text: "Responsive customer care assistance nationwide.", icon: PhoneIcon },
];

// CATEGORY FILTERS
const CHANNEL_CATEGORIES = [
  "All",
  "Entertainment",
  "Movies",
  "News",
  "Sports",
  "Kids",
  "Educational",
  "Religious",
  "Shopping",
  "Radio",
  "Others",
];

export default function UserDashboard() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredChannels =
    selectedPlan && activeCategory !== "All"
      ? selectedPlan.channels.filter((ch) => ch.category === activeCategory)
      : selectedPlan?.channels || [];

  // ENABLE ALL CSS ANIMATIONS
  useEffect(() => {
    const elements = document.querySelectorAll(
      ".fade-up, .slide-in-left, .slide-in-right, .stagger > *"
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("show");
        });
      },
      { threshold: 0.2 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">

        {/* HEADER */}
        <section className="fade-up">
          <h1 className="text-4xl font-bold text-cignalRed">Welcome to Descallar Satellite Services</h1>
          <p className="text-slate-600 max-w-xl mt-2">

Manage your account, view load plans, and access Cignal Customer Care features designed for your convenience — all in one place.
          </p>
        </section>

        {/* DIVIDER */}
        <div className="w-full h-[2px] bg-cignalRed opacity-60 fade-up" />

        {/* VIDEO COMMERCIAL SECTION */}
        <section className="fade-up mt-10">
          <h2 className="text-2xl font-bold text-cignalRed mb-4">
            Cignal Prepaid Ultimate HD
          </h2>

          <div className="w-full rounded-2xl overflow-hidden shadow-xl bg-black hover:scale-[1.01] transition-transform duration-500">
            <video
              className="w-full h-auto"
              src="/video/user_background.mp4"
              autoPlay
              muted
              loop
              playsInline
            />
          </div>
        </section>

        {/* DIVIDER */}
        <div className="w-full h-[2px] bg-cignalRed opacity-60 fade-up mt-10" />

        {/* LOAD PLANS */}
        <section className="fade-up">
          <h2 className="text-sm font-semibold tracking-[0.25em] text-cignalRed uppercase fade-up">
            Our Best Value Prepaid Load
          </h2>

          <p className="text-slate-600 mt-1 max-w-2xl fade-up">
            Click a load to see the channels included.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 stagger">
            {LOAD_PLANS.map((plan, index) => {
              const Icon = plan.icon;
              const planData = prepaidPlans[plan.amount];

              return (
                <div
                  key={plan.amount}
                  className="fade-up"
                  style={{ animationDelay: `${index * 0.12}s` }}
                  onClick={() => {
                    if (planData?.channels?.length) {
                      setSelectedPlan(planData);
                      setActiveCategory("All");
                    } else {
                      alert(`${plan.label} channel lineup not added yet.`);
                    }
                  }}
                >
                  <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-rose-400 to-pink-500 p-[1px] shadow hover:shadow-lg hover:-translate-y-1 transition cursor-pointer">
                    <div className="rounded-[1.1rem] bg-white px-4 py-4 relative h-full flex flex-col justify-between">
                      <Icon className="absolute right-3 top-3 h-6 w-6 text-cignalRed floating-icon" />

                      <div>
                        <p className="text-[10px] font-semibold text-cignalRed uppercase">{plan.label}</p>
                        <p className="text-2xl font-bold">₱{plan.amount}</p>
                      </div>

                      <p className="text-xs text-slate-600 mt-3">{plan.details}</p>

                      {planData?.channels?.length > 0 && (
                        <p className="mt-2 text-[11px] font-semibold text-cignalRed hover-tilt">
                          View channels included →
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* DIVIDER */}
        <div className="w-full h-[2px] bg-cignalRed opacity-60 fade-up" />

        {/* ABOUT US TITLE + BIG BANNER */}
        <section className="w-full mt-10 space-y-10">
          <h2 className="text-center text-3xl font-bold text-cignalRed mb-4 fade-up">
            ABOUT US
          </h2>

          <div className="relative w-full max-w-5xl mx-auto rounded-xl overflow-hidden shadow-xl slide-in-left">
            <img src="/images/Cignal-Web-About_Us-Banner.jpg" className="w-full h-auto object-cover" />
            <div className="w-full bg-cignalRed py-3">
              <h3 className="text-center text-white font-bold text-lg">ABOUT US</h3>
            </div>
          </div>

          <div className="mt-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[auto,1fr] gap-10 items-center">
            <div className="slide-in-left flex justify-center lg:justify-end">
              <img src="/images/CignalLogo1.png" className="h-32 sm:h-40 w-auto hover-tilt" />
            </div>

            <p className="text-slate-700 text-base sm:text-lg leading-relaxed slide-in-right">
              Launched in 2009, Cignal is the Philippines’ premier DTH satellite provider using
              Broadcast Satellite Technology. We broadcast premium TV content nationwide.
            </p>
          </div>
        </section>

        {/* DIVIDER */}
        <div className="w-full h-[2px] bg-cignalRed opacity-60 fade-up" />

        {/* RED BANNER */}
        <section className="relative w-full rounded-2xl overflow-hidden shadow-lg fade-up hover-zoom">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500"
            style={{
              backgroundImage: "url('/images/Cignal23 (1).jpg')",
              filter: "brightness(0.35)",
            }}
          />

          <div className="relative z-10 text-center text-white py-20 space-y-6">
            <h2 className="text-lg sm:text-2xl font-semibold leading-relaxed max-w-4xl mx-auto fade-up">
              Cignal transmits 104 SD and 30 HD channels, including free-to-air and a
              varied mix of 17 audio channels. We also offer on-demand viewing via
              Pay-Per-View subscription offers, as well as online streaming via our
              Cignal Play website and app.
              <br />
              <br />
              <span className="text-xl font-bold">
                In 2018, Cignal TV gained over 2,000,000 subscribers, making it the most
                subscribed Pay-TV provider in the Philippines!
              </span>
            </h2>
          </div>
        </section>

        {/* CIGNAL LOGO + PARAGRAPH */}
        <section className="mt-12 flex flex-col lg:flex-row items-start gap-8 fade-up">
          <img
            src="/images/CignalLogo1.png"
            alt="Cignal Logo"
            className="h-32 sm:h-40 w-auto hover-tilt"
          />

          <p className="text-slate-700 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto lg:mx-0">
            Cignal, a game changer in the Philippine media industry, is owned and operated by Cignal TV Inc.,
            a subsidiary of MediaQuest Holdings. MediaQuest Holdings is the media arm of the PLDT Group of Companies.
          </p>
        </section>

        {/* DIVIDER */}
        <div className="w-full h-[2px] bg-cignalRed opacity-60 fade-up" />

        {/* ABOUT TILES */}
        <section className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger">
            {ABOUT_TILES.map((tile, i) => {
              const Icon = tile.icon;

              return (
                <div key={tile.title} className="fade-up" style={{ animationDelay: `${i * 0.15}s` }}>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition flex items-start gap-3">
                    <Icon className="h-7 w-7 text-cignalRed floating-icon" />

                    <div>
                      <p className="text-xs font-semibold uppercase text-cignalRed tracking-wide">
                        {tile.title}
                      </p>
                      <p className="text-sm text-slate-700 mt-1">{tile.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* COMMITMENT BAND */}
        <section className="fade-up rounded-2xl bg-gradient-to-r from-cignalRed via-red-600 to-rose-500 text-white p-8 shadow-lg">
          <h2 className="text-xl sm:text-2xl font-semibold text-center sm:text-left fade-up">
            Our Commitment to Better TV
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3 stagger">
            <div className="fade-up" style={{ animationDelay: "0.05s" }}>
              <div className="bg-white/10 rounded-xl p-4 border border-white/20 flex gap-3">
                <BanknotesIcon className="h-8 w-8 floating-icon" />
                <div>
                  <p className="text-xs uppercase font-semibold text-red-100">Affordable</p>
                  <p className="text-sm mt-1">Flexible prepaid options for every budget.</p>
                </div>
              </div>
            </div>

            <div className="fade-up" style={{ animationDelay: "0.2s" }}>
              <div className="bg-white/10 rounded-xl p-4 border border-white/20 flex gap-3">
                <GlobeAltIcon className="h-8 w-8 floating-icon" />
                <div>
                  <p className="text-xs uppercase font-semibold text-red-100">Accessible</p>
                  <p className="text-sm mt-1">Available nationwide with multiple ways to load.</p>
                </div>
              </div>
            </div>

            <div className="fade-up" style={{ animationDelay: "0.35s" }}>
              <div className="bg-white/10 rounded-xl p-4 border border-white/20 flex gap-3">
                <SparklesIcon className="h-8 w-8 floating-icon" />
                <div>
                  <p className="text-xs uppercase font-semibold text-red-100">Quality</p>
                  <p className="text-sm mt-1">Crystal-clear signal and reliable performance.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* CHANNEL MODAL */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[999] show">
          <div className="bg-white w-[94%] max-w-3xl p-6 rounded-2xl shadow-2xl relative slide-in-right show">
            <button
              onClick={() => setSelectedPlan(null)}
              className="absolute right-4 top-4 text-gray-500 hover:text-black text-xl"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold text-cignalRed mb-2">
              {selectedPlan.name} — Included Channels
            </h2>

            <p className="text-sm text-slate-600 mb-4">
              Filter by category or explore the full channel lineup.
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {CHANNEL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`
                    px-3 py-1 rounded-full text-xs font-semibold border transition
                    ${
                      activeCategory === cat
                        ? "bg-cignalRed text-white border-cignalRed shadow-sm"
                        : "bg-white text-cignalRed border-cignalRed/40 hover:bg-cignalRed/10"
                    }
                  `}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1">
              {filteredChannels.map((channel, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 hover:-translate-y-[3px] hover:shadow-lg transition"
                >
                  <p className="text-sm font-bold">{channel.name}</p>
                  <p className="text-[11px] text-gray-600">{channel.category}</p>
                </div>
              ))}

              {filteredChannels.length === 0 && (
                <div className="col-span-full text-center text-sm text-gray-500 py-6">
                  No channels found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
