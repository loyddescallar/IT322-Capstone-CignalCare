import { useParams, useNavigate } from "react-router-dom";
import { boxModels } from "../data/troubleshootData";
import Navbar from "../components/Navbar";

export default function TroubleshootIssue() {
  const { modelId, issueId } = useParams();
  const navigate = useNavigate();

  const model = boxModels.find(m => m.id === modelId);
  const issue = model.issues.find(i => i.id === issueId);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-4xl mx-auto p-6">
        <button onClick={() => navigate(-1)} className="text-cignalRed mb-4">← Back</button>

        <h1 className="text-3xl font-bold text-cignalRed">{issue.title}</h1>

        {issue.image && (
          <img src={issue.image} className="mt-6 w-full rounded-lg shadow" alt="Issue visual" />
        )}

        <div className="mt-6 space-y-4">
          {issue.steps.map((step, index) => (
            <div key={index} className="p-4 bg-slate-100 rounded shadow">
              <p className="font-bold">STEP {index + 1}</p>
              <p>{step}</p>
              <FloatingSupportButton />

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
