import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { boxModels } from "../data/troubleshootData";
import { FiChevronRight } from "react-icons/fi";

export default function TroubleshootModel() {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const model = boxModels.find((m) => m.id === modelId);
  const [selectedIssue, setSelectedIssue] = useState(null);

  if (!model) return <div>Model Not Found</div>;

  const issue = model.issues.find((i) => i.id === selectedIssue);

  return (
    <div className="w-full bg-white min-h-screen px-4 sm:px-8 lg:px-20 py-10">
      {/* Back */}
      <Link
        to="/troubleshoot"
        className="text-red-500 text-sm mb-4 block hover:underline"
      >
        ← Back
      </Link>

      {/* Header */}
      <div className="flex items-center gap-6 mb-10">
        {model.image && (
          <img
            src={model.image}
            alt={model.name}
            className="w-20 h-20 object-contain rounded-lg border shadow-sm"
          />
        )}
        <h1 className="text-4xl font-bold text-red-600 tracking-tight">
          {model.name}
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ========================= LEFT PANEL ========================= */}
        <div
          className={`transition-all duration-700 ease-in-out 
            ${selectedIssue ? "lg:w-[40%]" : "lg:w-[55%]"} w-full`}
        >
          <div className="space-y-4">
            {model.issues.map((iss) => (
              <button
                key={iss.id}
                onClick={() => setSelectedIssue(iss.id)}
                className={`
                  group flex items-center justify-between w-full 
                  px-7 py-7 rounded-2xl cursor-pointer relative overflow-hidden
                  backdrop-blur-md 
                  bg-gradient-to-br from-gray-100/60 to-white/80
                  border border-gray-300 shadow-[0_4px_14px_rgba(0,0,0,0.08)]
                  transition-all duration-500 ease-in-out

                  ${
                    selectedIssue === iss.id
                      ? "ring-2 ring-red-500 scale-[1.03] shadow-[0_6px_20px_rgba(255,0,0,0.25)]"
                      : "hover:scale-[1.02] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
                  }
                `}
              >
                {/* Hover Glow */}
                <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition duration-500 rounded-2xl"></span>

                {/* TEXT */}
                <div className="flex flex-col text-left relative z-10">
                  <p className="text-xl font-bold text-gray-900">
                    {iss.shortTitle}
                  </p>
                  <p className="text-sm text-gray-600">{iss.description}</p>
                </div>

                {/* ICON */}
                <FiChevronRight
                  className={`text-2xl text-gray-500 transition-transform duration-500 relative z-10 
                  ${selectedIssue === iss.id ? "rotate-90" : ""}`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* ========================= RIGHT PANEL ========================= */}
        <div
          className={`
            transition-all duration-700 ease-in-out rounded-xl border border-gray-200
            bg-white shadow-xl p-7 origin-right transform overflow-hidden
            ${
              selectedIssue
                ? "lg:w-[55%] w-full opacity-100 translate-x-0 scale-100"
                : "lg:w-0 w-full opacity-0 translate-x-10 scale-95 pointer-events-none"
            }
          `}
        >
          {issue && (
            <div className="animate-fadeIn">
              <button
                onClick={() => setSelectedIssue(null)}
                className="text-blue-600 text-sm mb-4 hover:underline"
              >
                ← Back to Issues
              </button>

              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                {issue.shortTitle}
              </h2>

              {/* Sections */}
              {issue.sections.map((section, idx) => (
                <div key={idx} className="mb-8">
                  <h3 className="text-xl font-semibold mb-3 text-gray-800">
                    {section.title}
                  </h3>
                  <ol className="list-decimal ml-6 space-y-2 text-gray-700 leading-relaxed">
                    {section.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              ))}

              <p className="text-gray-600 italic mb-6">{issue.note}</p>

              {/* CONTACT SUPPORT BUTTON */}
              <div className="text-center mt-8">
                <p className="text-gray-700 mb-3 font-medium">
                  If issue persists, you may contact us for further assistance
                </p>

                <button
                  onClick={() =>
                    navigate("/report-problem", {
                      state: {
                        prefillSubject: `${model.name} - ${issue.shortTitle}`,
                      },
                    })
                  }
                  className="
                    px-10 py-3 
                    rounded-full font-bold text-white 
                    bg-gradient-to-r from-pink-600 to-red-600
                    shadow-md hover:shadow-lg 
                    transform hover:scale-105 active:scale-95
                    transition-all duration-300
                  "
                >
                  CONTACT US
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
