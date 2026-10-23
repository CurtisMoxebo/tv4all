import React, { useState } from 'react';

export const App: React.FC = () => {
  const [count, setCount] = useState<number>(0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/70 border border-indigo-800/50 rounded-full">
          Tailwind CSS + React 18
        </span>

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            tv4all Streaming
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Single-source IPTV relay and broadcasting platform
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setCount(prev => prev + 1)}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium rounded-xl shadow-md transition-all duration-150 cursor-pointer"
          >
            Counter: {count}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
