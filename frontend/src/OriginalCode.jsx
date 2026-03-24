import { useState } from 'react';

export default function OriginalCode() {
  const [activeTab, setActiveTab] = useState('frontend');

  const originalCode = {
    frontend: `// AutoECR Full Stack Starter (Frontend + Backend)
// =============================================
// Tech Stack:
// Frontend: React + Tailwind
// Backend: FastAPI (Python)
// Processing: Pandas

// ================= FRONTEND =================
// File: src/App.jsx
import { useState } from "react";
import UploadPage from "./UploadPage";

export default function App() {
  return (
    <div className="flex h-screen">
      <div className="w-64 bg-gray-900 text-white p-4">
        <h1 className="text-xl font-bold">AutoECR</h1>
      </div>
      <div className="flex-1 p-6">
        <UploadPage />
      </div>
    </div>
  );
}

// File: src/UploadPage.jsx
import { useState } from "react";

export default function UploadPage() {
  const [file, setFile] = useState(null);

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("file", file);

    await fetch("http://localhost:8000/upload", {
      method: "POST",
      body: formData,
    });

    alert("Uploaded Successfully");
  };

  return (
    <div>
      <h2 className="text-xl mb-4">Upload File</h2>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload} className="ml-4 bg-blue-600 text-white px-4 py-2">
        Upload
      </button>
    </div>
  );
}`,
    backend: `// ================= BACKEND =================
// File: main.py
from fastapi import FastAPI, UploadFile, File
import pandas as pd
import os

app = FastAPI()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())

    process_file(file_path)

    return {"message": "File processed"}

// ================= PROCESSING ENGINE =================
def process_file(file_path):
    xls = pd.ExcelFile(file_path)
    all_data = []

    for sheet in xls.sheet_names:
        df = xls.parse(sheet)
        df.columns = [str(c).lower() for c in df.columns]

        def find(keys):
            for col in df.columns:
                for k in keys:
                    if k in col:
                        return col
            return None

        uan = find(["uan", "pf"])
        name = find(["name"])
        basic = find(["basic"])

        if not (uan and name and basic):
            continue

        temp = pd.DataFrame({
            "UAN": df[uan],
            "Member Name": df[name],
            "Basic Pay": pd.to_numeric(df[basic], errors="coerce"),
            "Month": sheet
        })

        all_data.append(temp)

    df_all = pd.concat(all_data)

    df_all = df_all.dropna()
    df_all["Member Name"] = df_all["Member Name"].str.upper()
    df_all["UAN"] = df_all["UAN"].astype(str).str.split(".").str[0]

    df_all = df_all[df_all["Basic Pay"] > 0]

    df_all["PF Salary"] = df_all["Basic Pay"].apply(lambda x: min(x, 6500))
    df_all["EPF"] = (df_all["PF Salary"] * 0.12).round(0).astype(int)

    df_all["EPS Contribution"] = (df_all["EPF"] * 8.33 / 12).round(0).astype(int)
    df_all["ER Share"] = df_all["EPF"] - df_all["EPS Contribution"]

    df_all["Gross Wages"] = df_all["Basic Pay"].astype(int)
    df_all["EPF Wages"] = df_all["PF Salary"].astype(int)
    df_all["EPS Wages"] = df_all["PF Salary"].astype(int)
    df_all["EDLI Wages"] = df_all["PF Salary"].astype(int)
    df_all["EE Share"] = df_all["EPF"]

    df_all["NCP Days"] = 0
    df_all["Refund"] = 0

    cols = [
        "UAN","Member Name","Gross Wages","EPF Wages","EPS Wages",
        "EDLI Wages","EE Share","EPS Contribution","ER Share","NCP Days","Refund"
    ]

    df_all = df_all[cols + ["Month"]]

    os.makedirs("output", exist_ok=True)

    # CSV
    for m, g in df_all.groupby("Month"):
        g[cols].to_csv(f"output/ECR_{m}.csv", index=False)

        # TXT
        with open(f"output/ECR_{m}.txt", "w") as f:
            for _, row in g[cols].iterrows():
                line = "#~#".join([str(x) for x in row])
                f.write(line + "\\n")

    # Summary
    summary = df_all.groupby("Month").agg({
        "Gross Wages": "sum",
        "EE Share": "sum"
    }).reset_index()

    summary.to_excel("output/Summary.xlsx", index=False)

// ================= README =================
// 1. Run backend: uvicorn main:app --reload
// 2. Run frontend: npm start
// 3. Upload Excel → outputs generated in /output folder`
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Original AutoECR Code Structure</h2>
      
      <div className="bg-white rounded-lg shadow">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('frontend')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'frontend'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Frontend Code
            </button>
            <button
              onClick={() => setActiveTab('backend')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'backend'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Backend Code
            </button>
          </nav>
        </div>

        {/* Code Display */}
        <div className="p-6">
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 text-sm font-mono whitespace-pre">
              {originalCode[activeTab]}
            </pre>
          </div>
        </div>

        {/* Info Section */}
        <div className="border-t border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-3">About Original Structure</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• This was the original monolithic structure in <code className="bg-gray-100 px-2 py-1 rounded">AutoOcr.jsx</code></p>
            <p>• Contains both frontend and backend code in a single file</p>
            <p>• Basic functionality without error handling or progress tracking</p>
            <p>• Now refactored into proper project structure with enhanced features</p>
          </div>
        </div>
      </div>
    </div>
  );
}
