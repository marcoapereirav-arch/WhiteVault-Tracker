import React, { useState, useRef } from 'react';
import { Icons } from './Icons';
import { AppState } from '../types';

type View = 'DASHBOARD' | 'ACCOUNTS' | 'TRANSACTIONS' | 'SUBSCRIPTIONS' | 'CATEGORIES' | 'SETTINGS';

interface SidebarProps {
  state: AppState;
  currentView: View;
  isDesktopSidebarExpanded: boolean;
  isMobileMenuOpen: boolean;
  onViewChange: (view: View) => void;
  onToggle: () => void;
  onCloseMobile: () => void;
  onNameChange: (name: string) => void;
  navItems: { id: string; icon: any; label: string }[];
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  state,
  currentView,
  isDesktopSidebarExpanded,
  isMobileMenuOpen,
  onViewChange,
  onToggle,
  onCloseMobile,
  onNameChange,
  navItems,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleNameSave = () => {
    setIsEditingName(false);
    if (tempName.trim() && tempName !== state.user.name) {
      onNameChange(tempName.trim());
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`${isDesktopSidebarExpanded ? 'w-72' : 'w-20'} bg-white border-r border-black/5 hidden md:flex flex-col relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300`}>
        <button
          onClick={onToggle}
          className="absolute -right-3 top-10 bg-white border border-black/10 rounded-full p-1 shadow-sm hover:bg-stone transition-colors z-50 flex items-center justify-center"
        >
          {isDesktopSidebarExpanded
            ? <Icons.ChevronLeft className="w-4 h-4 text-graphite" />
            : <Icons.ChevronRight className="w-4 h-4 text-graphite" />
          }
        </button>

        <div className="h-20 border-b border-black/5 flex items-center justify-center shrink-0">
          {isDesktopSidebarExpanded ? (
            <h1 className="text-3xl font-display font-bold text-onyx tracking-tight">WhiteVault<span className="text-lg align-top text-alloy">™</span></h1>
          ) : (
            <h1 className="text-3xl font-display font-bold text-onyx tracking-tight">W<span className="text-lg align-top text-alloy">™</span></h1>
          )}
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as View)}
              className={`w-full flex items-center ${isDesktopSidebarExpanded ? 'justify-start space-x-4 px-4' : 'justify-center'} py-4 border-l-2 transition-all group ${currentView === item.id ? 'border-alloy bg-stone text-onyx' : 'border-transparent text-graphite hover:bg-stone hover:text-onyx'}`}
              title={!isDesktopSidebarExpanded ? item.label : undefined}
            >
              <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-alloy' : 'text-gray-400 group-hover:text-onyx'}`} />
              {isDesktopSidebarExpanded && <span className="font-display font-medium tracking-wide text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className={`p-6 border-t border-black/5 bg-stone flex ${isDesktopSidebarExpanded ? 'items-center gap-4' : 'flex-col items-center justify-center'} shrink-0`}>
          <div className="w-10 h-10 bg-onyx flex items-center justify-center text-white font-display font-bold text-lg overflow-hidden rounded-full shrink-0">
            {state.user.avatarUrl ? (
              <img src={state.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              state.user.name.charAt(0)
            )}
          </div>
          {isDesktopSidebarExpanded && (
            <div className="overflow-hidden">
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave();
                    else if (e.key === 'Escape') setIsEditingName(false);
                  }}
                  className="text-sm font-bold text-onyx font-display bg-transparent border-b border-alloy outline-none w-full"
                  autoFocus
                />
              ) : (
                <p
                  className="text-sm font-bold text-onyx font-display cursor-pointer hover:text-alloy transition-colors truncate"
                  onClick={() => {
                    setTempName(state.user.name);
                    setIsEditingName(true);
                  }}
                >
                  {state.user.name}
                </p>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-onyx/50 backdrop-blur-sm md:hidden" onClick={onCloseMobile}>
          <div className="w-3/4 h-full bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-black/5 flex justify-between items-center bg-stone">
              <h1 className="text-2xl font-display font-bold text-onyx">WhiteVault<span className="text-xs text-alloy">™</span></h1>
              <button onClick={onCloseMobile}><Icons.Close className="w-6 h-6 text-onyx" /></button>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onViewChange(item.id as View); onCloseMobile(); }}
                  className={`w-full flex items-center space-x-4 px-4 py-4 border-l-2 transition-all ${currentView === item.id ? 'border-alloy bg-stone text-onyx' : 'border-transparent text-graphite'}`}
                >
                  <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-alloy' : 'text-gray-400'}`} />
                  <span className="font-display font-medium tracking-wide text-sm">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
});
