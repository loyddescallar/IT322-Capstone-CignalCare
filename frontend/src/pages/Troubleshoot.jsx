import { boxModels } from "../data/troubleshootData";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Troubleshoot() {
  const navigate = useNavigate();

  // Simple fade-in stagger animation
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setTimeout(() => setLoaded(true), 50);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-cignalRed mb-8">
          Troubleshoot Your Box
        </h1>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {boxModels.map((model, index) => (
            <div
              key={model.id}
              onClick={() => navigate(`/troubleshoot/${model.id}`)}
              className={`
                relative cursor-pointer rounded-2xl p-6 
                backdrop-blur-md bg-white/70 
                border border-gray-200 shadow-[0_4px_15px_rgba(0,0,0,0.08)]
                transition-all duration-500 ease-out transform 
                hover:scale-[1.05] hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)]
                hover:border-red-400 hover:bg-white/90

                ${loaded 
                  ? "opacity-100 translate-y-0" 
                  : "opacity-0 translate-y-5"
                }
              `}
              style={{
                transitionDelay: `${index * 80}ms`,
              }}
            >
              {/* Glow Effect */}
              <span className="
                absolute inset-0 rounded-2xl opacity-0 
                bg-gradient-to-br from-red-200/40 to-white/10 
                group-hover:opacity-100 transition duration-500
              "></span>

              {/* Box Image */}
              <img
                src={model.image}
                alt={model.name}
                className="w-full h-32 object-contain mb-4 relative z-10"
              />

              {/* Model Name */}
              <p className="font-semibold text-slate-800 relative z-10 text-lg">
                {model.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
  