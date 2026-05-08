import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle,
  FileText, Download, Loader2, FileJson, ArrowRight, Sparkles,
  ShieldCheck, Users, IndianRupee, BarChart3, X, FileX
} from "lucide-react";

const API = "https://payrollsync.onrender.com";

const FILE_CONFIGS = {
  csv:   { icon: <FileJson  className="text-emerald-500" size={28}/>, color: "emerald", label: "EPFO CSV",   desc: "Upload-ready CSV for EPFO portal" },
  txt:   { icon: <FileText  className="text-sky-500"     size={28}/>, color: "sky",     label: "ECR TXT",    desc: "#~# separated upload file" },
  xlsx:  { icon: <FileSpreadsheet className="text-indigo-500" size={28}/>, color: "indigo", label: "Audit XLSX", desc: "Audit Excel with 3 sheets" },
};

function getFileConfig(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  return FILE_CONFIGS[ext] || FILE_CONFIGS.xlsx;
}

function SummaryCard({ icon, label, value, color }) {
  const colors = {
    indigo: "from-indigo-500 to-indigo-600 shadow-indigo-500/30",
    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-500/30",
    violet: "from-violet-500 to-violet-600 shadow-violet-500/30",
    amber: "from-amber-500 to-amber-600 shadow-amber-500/30",
  };
  return (
    <div className="bg-white/80 rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] flex items-center gap-4">
      <div className={`p-3 rounded-2xl bg-gradient-to-br ${colors[color]} shadow-lg text-white shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-2xl font-extrabold text-slate-800 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

export default function UploadPage() {
  const [file, setFile]               = useState(null);
  const [uploading, setUploading]     = useState(false);
  const [progress, setProgress]       = useState(0);
  const [stage, setStage]             = useState("");
  const [error, setError]             = useState(null);
  const [result, setResult]           = useState(null);  // full API result
  const [isHovered, setIsHovered]     = useState(false);
  const fileInputRef = useRef(null);

  const reset = () => {
    setFile(null); setProgress(0); setError(null); setResult(null); setStage("");
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      setError("Please select a valid Excel file (.xlsx or .xls)");
      return;
    }
    setFile(f); setError(null); setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFileChange({ target: { files: [f] } });
  };

  const handleUpload = async () => {
    if (!file) { setError("Please select a file first."); return; }
    setUploading(true); setError(null); setResult(null); setProgress(0);

    const stages = [
      "Parsing Excel sheets…",
      "Detecting headers…",
      "Cleaning data…",
      "Calculating contributions…",
      "Generating ECR files…",
    ];
    let si = 0;
    setStage(stages[si]);
    const iv = setInterval(() => {
      setProgress(p => Math.min(p + 12, 88));
      si = Math.min(si + 1, stages.length - 1);
      setStage(stages[si]);
    }, 600);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
      clearInterval(iv);
      if (!res.ok) throw new Error(`Server error: ${res.statusText}`);
      const data = await res.json();
      setProgress(100);
      setStage("Done!");
      setResult(data);
    } catch (err) {
      clearInterval(iv);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = (filename) => {
    window.open(`${API}/download/${filename}`, "_blank");
  };

  const fmt = (n) => (n !== undefined && n !== null) ? n.toLocaleString("en-IN") : "—";

  return (
    <div className="max-w-5xl mx-auto pb-16 w-full">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/30">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">EPFO ECR Generator</span>
        </div>
        <h2 className="text-4xl lg:text-5xl font-extrabold text-slate-800 tracking-tight font-display mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600">
          Salary Intelligence
        </h2>
        <p className="text-slate-500 text-lg font-medium max-w-2xl leading-relaxed">
          Upload your monthly payroll Excel to instantly generate EPFO-compliant ECR upload files and audit reports.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">

          {/* Drop Zone */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div
              className={`relative border-2 border-dashed rounded-[1.8rem] p-10 transition-all duration-500 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden bg-white/70 backdrop-blur-md
                ${isHovered ? "border-indigo-400 bg-indigo-50/60 shadow-[0_0_40px_rgba(99,102,241,0.15)] ring-4 ring-indigo-500/10" : "border-slate-200 hover:border-indigo-300"}
                ${file ? "border-indigo-400 bg-indigo-50/80 ring-4 ring-indigo-500/15" : ""}
              `}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                type="file" ref={fileInputRef} className="hidden"
                accept=".xlsx,.xls" onChange={handleFileChange}
                disabled={uploading}
              />
              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div key="file"
                    initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative p-5 bg-white rounded-full shadow-xl shadow-emerald-500/20 mb-5 border border-emerald-100">
                      <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20"/>
                      <FileSpreadsheet size={48} className="text-emerald-500 relative z-10" />
                    </div>
                    <p className="text-xl font-bold text-slate-800">{file.name}</p>
                    <p className="text-sm text-slate-500 mt-1 bg-white/70 px-4 py-1 rounded-full">
                      {(file.size / 1024).toFixed(1)} KB · Ready to process
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); reset(); }}
                      className="mt-5 flex items-center gap-1 text-sm text-red-500 hover:text-white font-semibold px-5 py-2 rounded-full border border-red-200 hover:bg-red-500 hover:border-red-500 transition-all duration-300"
                    >
                      <X size={14}/> Remove File
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="empty"
                    initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex flex-col items-center"
                  >
                    <div className={`p-6 rounded-full mb-5 transition-all duration-500 ${isHovered ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 -translate-y-2" : "bg-indigo-100 text-indigo-600"}`}>
                      <UploadCloud size={48} strokeWidth={isHovered ? 2 : 1.5}/>
                    </div>
                    <p className="text-2xl font-bold text-slate-700">Drop your payroll Excel here</p>
                    <p className="text-slate-500 mt-2 text-sm bg-white/60 px-5 py-2 rounded-full">
                      Supports <span className="font-bold text-indigo-600">.xlsx</span> and <span className="font-bold text-indigo-600">.xls</span> · Drag & Drop or Click
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Process Button */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`relative overflow-hidden flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-white transition-all duration-300
                ${!file || uploading
                  ? "bg-slate-200 cursor-not-allowed text-slate-400"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 shadow-[0_8px_30px_rgba(99,102,241,0.35)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.5)] hover:-translate-y-1 active:scale-95"}
              `}
            >
              {uploading ? (
                <><Loader2 size={20} className="animate-spin"/> Processing…</>
              ) : (
                <>Generate ECR <ArrowRight size={20}/></>
              )}
            </button>
          </motion.div>

          {/* Progress */}
          <AnimatePresence>
            {uploading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4 }}
                className="bg-white/80 backdrop-blur-md rounded-[2rem] p-8 border border-white/60 shadow-lg overflow-hidden"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-indigo-500 animate-pulse" size={18}/>
                    <span className="font-bold text-slate-700">{stage}</span>
                  </div>
                  <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">{progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                    initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                    transition={{ ease: "circOut", duration: 0.7 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-50 border border-red-200 rounded-[2rem] p-6 flex gap-4 items-start shadow-lg shadow-red-500/10"
              >
                <div className="bg-white p-3 rounded-2xl text-red-500 border border-red-100 shrink-0">
                  <AlertCircle size={22}/>
                </div>
                <div>
                  <h3 className="font-bold text-red-800 text-lg">Processing Error</h3>
                  <p className="text-red-600 mt-1 font-medium">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success + Summary */}
          <AnimatePresence>
            {result && result.success && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                {/* Success banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-[2rem] p-6 flex gap-4 items-start shadow-lg shadow-emerald-500/10 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-400/20 blur-2xl rounded-full"/>
                  <div className="bg-white p-3 rounded-2xl text-emerald-500 border border-emerald-100 shrink-0 z-10">
                    <CheckCircle2 size={22}/>
                  </div>
                  <div className="z-10">
                    <h3 className="font-bold text-emerald-800 text-lg">ECR Generated Successfully</h3>
                    <p className="text-emerald-700 mt-1 font-medium">{result.message}</p>
                    {result.errors && result.errors.length > 0 && (
                      <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                        ⚠️ {result.errors.join(" · ")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats cards */}
                {result.summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SummaryCard icon={<Users size={20}/>}       label="Employees"   value={fmt(result.summary.total_employees)} color="indigo"/>
                    <SummaryCard icon={<IndianRupee size={20}/>} label="Gross Wages" value={"₹"+fmt(result.summary.total_gross)} color="emerald"/>
                    <SummaryCard icon={<BarChart3 size={20}/>}   label="EE Share"    value={"₹"+fmt(result.summary.total_ee_share)} color="violet"/>
                    <SummaryCard icon={<FileX size={20}/>}       label="Rejected"    value={result.summary.rejected_rows}       color="amber"/>
                  </div>
                )}

                {/* Download cards */}
                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-8 border border-white/60 shadow-lg">
                  <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                      <Download size={20}/>
                    </div>
                    Generated Output Files
                  </h3>
                  <div className="space-y-3">
                    {result.files_generated.map((fname, i) => {
                      const cfg = getFileConfig(fname);
                      const colors = {
                        emerald: "group-hover:bg-emerald-50 group-hover:border-emerald-200 hover:text-white hover:bg-emerald-600 hover:border-emerald-600",
                        sky:     "group-hover:bg-sky-50 group-hover:border-sky-200 hover:text-white hover:bg-sky-600 hover:border-sky-600",
                        indigo:  "group-hover:bg-indigo-50 group-hover:border-indigo-200 hover:text-white hover:bg-indigo-600 hover:border-indigo-600",
                      };
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 + 0.2, type: "spring", stiffness: 200 }}
                          className="group flex items-center justify-between p-5 bg-slate-50/80 hover:bg-white border border-slate-100 hover:border-indigo-200 rounded-2xl transition-all duration-300 hover:shadow-[0_8px_25px_-5px_rgba(99,102,241,0.15)]"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                              {cfg.icon}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-base">{fname}</p>
                              <p className="text-xs text-slate-400 mt-0.5 font-medium">{cfg.desc}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => downloadFile(fname)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold border-2 border-slate-200 text-slate-600 text-sm transition-all duration-300 ${colors[cfg.color] || colors.indigo}`}
                          >
                            <Download size={16}/> Download
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Partial failure */}
            {result && !result.success && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 flex gap-4 items-start shadow-lg"
              >
                <div className="bg-white p-3 rounded-2xl text-amber-500 border border-amber-100 shrink-0">
                  <AlertCircle size={22}/>
                </div>
                <div>
                  <h3 className="font-bold text-amber-800 text-lg">Processing Failed</h3>
                  <p className="text-amber-700 mt-1 font-medium">{result.message}</p>
                  {result.errors?.map((e, i) => (
                    <p key={i} className="text-sm text-amber-600 mt-1">• {e}</p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Info Sidebar */}
        <div className="lg:col-span-4">
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 sticky top-8 shadow-xl"
          >
            <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] blur-lg opacity-20 -z-10"/>
            <h3 className="text-xl font-bold text-indigo-950 mb-7 flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-500/30">
                <ShieldCheck size={18}/>
              </div>
              Compliance Rules
            </h3>

            <ul className="space-y-5">
              {[
                { title: "Smart Header Detection",   desc: "Scans top 50 rows to auto-detect UAN, Name & Salary columns — works with any format." },
                { title: "EPFO Wage Logic",          desc: "EPF Wages = Gross. EPS & EDLI capped at ₹15,000 per EPFO guidelines." },
                { title: "Contribution Formula",     desc: "EE = 12% × EPF Wages. ER = (8.33/12) × EE Share. EPS Cont = EE − ER." },
                { title: "Deduplication & Audit",    desc: "Duplicate rows (UAN + Salary) are flagged in the Audit XLSX Validation sheet." },
              ].map((r, i) => (
                <li key={i} className="flex gap-3 group">
                  <div className="bg-white text-indigo-700 w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm border border-indigo-100 group-hover:scale-110 group-hover:rotate-6 transition-transform shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{r.title}</h4>
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">{r.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100">
                <p className="text-xs font-semibold text-indigo-900 flex gap-2 leading-relaxed">
                  <Sparkles size={14} className="text-indigo-500 shrink-0 mt-0.5"/>
                  Generates 3 output files: EPFO CSV, #~# TXT upload file, and a 3-sheet Audit Excel with ECR data, validation report & summary.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
