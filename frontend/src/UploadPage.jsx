import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, FileText, Download, Loader2, FileJson, ArrowRight, Sparkles } from "lucide-react";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [downloadLinks, setDownloadLinks] = useState([]);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
        setError("Please select a valid Excel file (.xlsx or .xls)");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
      setDownloadLinks([]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setDownloadLinks([]);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProcessing(true);
      setProgress(25);

      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return 90;
          return prev + 15;
        });
      }, 400);

      const response = await fetch("https://payrollsync.onrender.com/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      setProgress(100);

      if (result.success) {
        // Use files_generated from the upload response directly
        // This ensures we only show files from THIS upload, not old leftovers
        const generatedFiles = result.files_generated.map(filename => {
          let type = "Excel";
          if (filename.endsWith('.csv')) type = "CSV";
          else if (filename.endsWith('.txt')) type = "TEXT";
          return { filename, type };
        });
        setDownloadLinks(generatedFiles);
        setSuccess(result.message);
      } else {
        setError(result.message || "Processing failed");
        if (result.errors && result.errors.length > 0) {
          setError(result.errors.join(", "));
        }
      }

      setProcessing(false);
      setUploading(false);

    } catch (err) {
      setError(err.message);
      setUploading(false);
      setProcessing(false);
    }
  };

  const downloadFile = (filename) => {
    window.open(`https://payrollsync.onrender.com/download/${filename}`, '_blank');
  };

  const getFileIcon = (type) => {
    if (type === 'CSV') return <FileJson className="text-emerald-500" size={28} />;
    if (type === 'Text') return <FileText className="text-blue-500" size={28} />;
    return <FileSpreadsheet className="text-indigo-500" size={28} />;
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 w-full">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 flex items-center justify-between"
      >
        <div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-slate-800 tracking-tight font-display mb-3 text-glow bg-clip-text text-transparent bg-gradient-to-r from-indigo-800 to-purple-800">
            Salary Intelligence
          </h2>
          <p className="text-slate-500 text-lg lg:text-xl font-medium max-w-2xl leading-relaxed">
            Upload your monthly payroll data to effortlessly generate compliance-ready ECR portals.
          </p>
        </div>
      </motion.div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        <div className="lg:col-span-8 space-y-8">
          
          {/* Upload Dropzone */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-[2rem] p-1 relative overflow-hidden group border border-white/60 bg-white/70"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="bg-white/50 backdrop-blur-3xl rounded-[1.8rem] p-8 lg:p-12 border border-white/40 shadow-inner relative z-10 mx-auto">
              <div 
                className={`relative border-2 border-dashed rounded-[1.5rem] p-12 transition-all duration-500 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden ${
                  isHovered ? 'border-indigo-400 bg-indigo-50/70 shadow-[0_0_40px_rgba(99,102,241,0.15)] ring-4 ring-indigo-500/10 transform scale-[1.01]' : 'border-slate-300/80 bg-slate-50/50 hover:border-indigo-300'
                } ${file ? 'border-indigo-500 bg-indigo-50/90 ring-4 ring-indigo-500/20' : ''}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => !uploading && !processing && fileInputRef.current?.click()}
              >
                {isHovered && !file && (
                   <motion.div 
                     layoutId="dropzone-bg"
                     className="absolute inset-0 bg-gradient-to-br from-indigo-100/40 to-purple-100/40 opacity-50"
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                   />
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={uploading || processing}
                />
                
                <AnimatePresence mode="wait">
                  {file ? (
                    <motion.div 
                      key="file"
                      initial={{ scale: 0.8, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.8, opacity: 0, y: -10 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="flex flex-col items-center relative z-10"
                    >
                      <div className="p-5 bg-white rounded-full shadow-xl shadow-emerald-500/20 mb-6 border border-emerald-100 relative">
                        <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20"></div>
                        <FileSpreadsheet size={48} className="text-emerald-500 relative z-10" />
                      </div>
                      <p className="text-2xl font-bold text-slate-800 font-display">{file.name}</p>
                      <p className="text-sm font-medium text-slate-500 mt-2 bg-white/70 px-4 py-1 rounded-full shadow-sm">
                        {(file.size / 1024).toFixed(1)} KB Ready
                      </p>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="mt-6 text-sm text-red-500 hover:text-white font-semibold px-6 py-2 rounded-full border border-red-200 hover:bg-red-500 hover:border-red-500 transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-red-500/20"
                      >
                        Change File
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="upload"
                      initial={{ scale: 0.8, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.8, opacity: 0, y: -10 }}
                      className="flex flex-col items-center relative z-10"
                    >
                      <div className={`p-6 rounded-full mb-6 transition-colors duration-500 ${isHovered ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 transform -translate-y-2' : 'bg-indigo-100/80 text-indigo-600'}`}>
                        <UploadCloud size={48} strokeWidth={isHovered ? 2 : 1.5} />
                      </div>
                      <p className="text-2xl font-bold text-slate-700 font-display">
                        Drop your Excel file here
                      </p>
                      <p className="text-slate-500 mt-3 font-medium bg-white/60 px-5 py-2 rounded-full text-sm">
                        Supports <span className="font-bold text-indigo-600">.xlsx</span> and <span className="font-bold text-indigo-600">.xls</span>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading || processing}
                  className={`relative overflow-hidden group flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-white transition-all duration-300 ${
                    !file || uploading || processing 
                      ? 'bg-slate-300 cursor-not-allowed shadow-none text-slate-500' 
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-[0_8px_30px_rgba(99,102,241,0.3)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.5)] hover:-translate-y-1 transform active:scale-95'
                  }`}
                >
                  {file && !uploading && !processing && (
                    <div className="absolute inset-0 -translate-x-full group-hover:animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent z-0"></div>
                  )}

                  <span className="relative z-10 flex items-center gap-2">
                    {uploading ? (
                      <><Loader2 size={20} className="animate-spin" /> Uploading...</>
                    ) : processing ? (
                      <><Loader2 size={20} className="animate-spin" /> Processing Data...</>
                    ) : (
                      <>Process Intelligence <ArrowRight size={20} /></>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Progress Section */}
          <AnimatePresence>
            {(uploading || processing || progress > 0) && !success && !error && (
              <motion.div 
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="glass-card rounded-[2rem] p-8 overflow-hidden relative border border-white/60"
              >
                <div className="absolute -right-20 -top-20 w-40 h-40 bg-indigo-500/20 blur-3xl rounded-full"></div>
                
                <div className="flex justify-between items-end mb-6 relative z-10">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 font-display flex items-center gap-2">
                      <Sparkles className="text-indigo-500 animate-pulse" size={20} />
                      {uploading ? 'Transmitting data securely' : 'Synthesizing EPFO variables'}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 mt-2">Running cloud algorithms on your dataset...</p>
                  </div>
                  <span className="text-3xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                    {progress}%
                  </span>
                </div>
                
                <div className="w-full bg-slate-100/80 rounded-full h-4 overflow-hidden border border-white shadow-inner relative z-10 backdrop-blur-sm">
                  <motion.div 
                    className="h-full rounded-full relative bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "circOut", duration: 0.8 }}
                  >
                    <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }}></div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status Messages */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                className="bg-red-50/90 backdrop-blur-md border border-red-200 rounded-[2rem] p-6 flex gap-5 items-start mt-8 shadow-lg shadow-red-500/10"
              >
                <div className="bg-white p-3 rounded-2xl text-red-500 shadow-sm border border-red-100 flex-shrink-0">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-red-800 font-bold text-lg font-display">System Alert</h3>
                  <p className="text-red-600 mt-1.5 font-medium leading-relaxed">{error}</p>
                </div>
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="bg-emerald-50/90 backdrop-blur-md border border-emerald-200 rounded-[2rem] p-6 flex gap-5 items-start mt-8 shadow-lg shadow-emerald-500/10 relative overflow-hidden"
              >
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-400/20 blur-2xl rounded-full"></div>
                <div className="bg-white p-3 rounded-2xl text-emerald-500 shadow-sm border border-emerald-100 flex-shrink-0 relative z-10">
                  <CheckCircle2 size={24} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-emerald-800 font-bold text-lg font-display">Operation Successful</h3>
                  <p className="text-emerald-700 mt-1.5 font-medium leading-relaxed">{success}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Download Results */}
          <AnimatePresence>
            {downloadLinks.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="glass-card rounded-[2rem] p-8 lg:p-10 mt-8 relative overflow-hidden border border-white/60 bg-white/70"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>
                
                <h3 className="text-2xl font-bold text-slate-800 font-display mb-8 flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Download size={24} />
                  </div>
                  Generated Assets
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                  {downloadLinks.map((file, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 200 }}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/80 hover:bg-white border border-white hover:border-indigo-200 rounded-[1.5rem] transition-all duration-300 shadow-[0_4px_15px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_15px_30px_-5px_rgba(99,102,241,0.15)] gap-4"
                    >
                      <div className="flex items-center gap-5">
                        <div className="p-4 bg-slate-50 rounded-2xl shadow-inner border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                          {getFileIcon(file.type)}
                        </div>
                        <div>
                          <p className="font-bold text-lg text-slate-800 group-hover:text-indigo-900 transition-colors font-display tracking-tight">{file.filename}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-md">{file.type}</span>
                            <span className="text-sm font-medium text-slate-500">Ready for Portal</span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => downloadFile(file.filename)}
                        className="w-full sm:w-auto bg-white hover:bg-indigo-600 text-indigo-600 hover:text-white border-2 border-indigo-100 hover:border-indigo-600 px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-sm focus:ring-4 focus:ring-indigo-500/20 flex items-center justify-center gap-2"
                      >
                        <Download size={18} strokeWidth={2.5} />
                        Save File
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Info Sidebar */}
        <div className="lg:col-span-4 mt-8 lg:mt-0">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel border border-white/60 rounded-[2rem] p-8 sticky top-8 shadow-xl bg-white/60"
          >
            <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] blur-lg opacity-20 -z-10"></div>
            
            <h3 className="text-2xl font-bold text-indigo-950 font-display mb-8 flex items-center gap-3 border-b border-white pb-5">
               <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-500/30">
                 <AlertCircle size={22} />
               </div>
               Workflow Rules
            </h3>
            
            <ul className="space-y-6">
              {[
                { title: 'Upload Format', desc: 'Securely upload your monthly payroll Excel sheet (.xlsx, .xls).' },
                { title: 'Required Fields', desc: 'Ensure columns exactly match: UAN, Name, Basic Pay.' },
                { title: 'Data Segregation', desc: 'Multiple tabs are intelligently processed as distinct monthly records.' },
                { title: 'Compliance Outputs', desc: 'Download the finalized ECR Text files to immediately upload to the EPFO portal.' }
              ].map((rule, idx) => (
                <li key={idx} className="flex gap-4 group">
                  <div className="bg-white text-indigo-700 w-10 h-10 rounded-2xl flex items-center justify-center font-bold font-display text-lg shadow-sm border border-indigo-100 group-hover:scale-110 group-hover:rotate-6 transition-transform shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-md">{rule.title}</h4>
                    <p className="text-slate-500 text-sm mt-1 leading-relaxed font-medium">{rule.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            
            <div className="mt-10 pt-8 border-t border-white leading-relaxed">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-white shadow-sm">
                <p className="text-sm font-semibold text-indigo-900 flex gap-2">
                  <Sparkles size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                  <span>The platform applies the ₹6,500 PF Cap and precisely splits EPS (8.33%) & EPF (3.67%).</span>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
