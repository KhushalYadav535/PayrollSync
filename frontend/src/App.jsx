import { useState } from "react";
import UploadPage from "./UploadPage";
import { FileUp, Sparkles, LayoutDashboard } from "lucide-react";

export default function App() {
  const [currentPage, setCurrentPage] = useState('upload');

  return (
    <div className="relative flex h-screen bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden bg-mesh z-0">
      
      {/* Animated Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob -z-10"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 -z-10"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000 -z-10"></div>
      
      {/* Sidebar - Glassmorphic */}
      <div className="w-72 glass-panel border-r border-white/80 p-6 flex-col justify-between hidden md:flex m-4 rounded-3xl shadow-xl z-10 relative">
        <div>
          <div className="flex items-center gap-3 mb-10 pl-2">
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white p-2.5 rounded-2xl shadow-lg shadow-indigo-500/30 transform transition duration-300 hover:rotate-12 hover:scale-105">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <h1 className="text-3xl font-extrabold font-display bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 tracking-tight text-glow">
              AutoECR
            </h1>
          </div>
          
          <nav className="space-y-2.5">
            <button
              onClick={() => setCurrentPage('upload')}
              className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-300 font-semibold tracking-wide ${
                currentPage === 'upload' 
                  ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] border border-indigo-200/50 relative overflow-hidden' 
                  : 'text-slate-500 hover:bg-white/50 hover:text-slate-800 hover:shadow-sm'
              }`}
            >
              {currentPage === 'upload' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-r-md" />}
              <FileUp size={20} className={currentPage === 'upload' ? 'text-indigo-600' : ''} />
              Process Salary
            </button>
          </nav>
        </div>

        <div className="bg-white/50 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden group hover:bg-white/70 transition-colors duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-100 to-transparent rounded-bl-full -z-10 opacity-70 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold tracking-tight">
            <LayoutDashboard size={18} className="text-indigo-600" />
            <span>Workflow Engine</span>
          </div>
          <ul className="space-y-3 text-sm text-slate-600 font-medium">
            <li className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.5)]" /> Excel Parse
            </li>
            <li className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-[0_0_8px_rgba(168,85,247,0.5)]" /> EPFO Validation
            </li>
            <li className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 shadow-[0_0_8px_rgba(236,72,153,0.5)]" /> ECR Generate
            </li>
          </ul>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto z-10 p-4 md:py-6 md:pr-6 md:pl-2">
        <div className="h-full rounded-3xl overflow-hidden glass shadow-2xl border border-white/50 relative">
          <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-6 lg:p-10">
            <UploadPage />
          </div>
        </div>
      </div>
    </div>
  );
}
