import { useNavigate } from "react-router-dom";
import { FiHeadphones } from "react-icons/fi";

export default function FloatingSupportButton({ modelName, issueTitle }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/user/report", {
      state: {
        prefillSubject: issueTitle
          ? `${modelName} - ${issueTitle}`
          : modelName
          ? `Troubleshooting Assistance: ${modelName}`
          : "Troubleshooting Assistance",
      },
    });
  };

  return (
    <button
      onClick={handleClick}
      className="
        fixed bottom-6 right-6 z-50 
        bg-red-600 text-white px-5 py-4 rounded-full shadow-xl 
        flex items-center gap-2 font-semibold 
        hover:bg-red-700 active:scale-95 transition-all duration-300
        hover:shadow-2xl
        animate-float
      "
    >
      <FiHeadphones className="text-xl" />
      Contact Support
    </button>
  );
}
