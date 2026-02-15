
import React from 'react';
import { AppView } from '../types';

interface NavbarProps {
  currentView: AppView;
  setView: (v: AppView) => void;
  isAdmin: boolean;
  setIsAdmin: (a: boolean) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, setView, isAdmin, setIsAdmin }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10 px-4 py-3">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setView('home')}
        >
          <div className="w-10 h-10 bg-gradient-to-tr from-amber-400 to-pink-500 rounded-full flex items-center justify-center text-xl shadow-lg shadow-pink-500/20">
            🎭
          </div>
          <span className="font-festive text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-pink-300">
            Tombola d'Adar
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView(currentView === 'home' ? 'admin' : 'home')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              currentView === 'admin' 
                ? 'bg-amber-500 text-slate-900' 
                : 'text-amber-200 hover:bg-white/5'
            }`}
          >
            {currentView === 'admin' ? (
              <><i className="fas fa-home mr-2"></i>Public</>
            ) : (
              <><i className="fas fa-crown mr-2"></i>Admin</>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
