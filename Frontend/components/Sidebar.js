import React from 'react';
import { Users, MapPin, Radio, LayoutDashboard, Settings, Menu, X } from 'lucide-react';

const Sidebar = ({ isOpen, onToggle, activeMenu, onMenuChange }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Client Management', icon: Users },
    { id: 'devices', label: 'Device Management', icon: Radio },
    { id: 'maps', label: 'Map Overview', icon: MapPin },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={`bg-gray-900 text-white transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'}`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-800">
        <h1 className={`font-bold text-xl transition-opacity duration-200 ${!isOpen && 'opacity-0 w-0'}`}>
          IoT Admin
        </h1>
        <button 
          onClick={onToggle} 
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="mt-8">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onMenuChange(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-800 transition-colors relative ${
                isActive ? 'bg-gray-800' : ''
              }`}
              title={!isOpen ? item.label : ''}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
              )}
              
              <Icon size={20} className={isActive ? 'text-blue-400' : 'text-gray-400'} />
              
              <span className={`transition-opacity duration-200 ${
                !isOpen ? 'opacity-0 w-0' : 'opacity-100'
              } ${isActive ? 'text-white font-medium' : 'text-gray-300'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info - Only show when expanded */}
      {isOpen && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="text-xs text-gray-400">
            <p className="font-semibold text-gray-300 mb-1">System Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>All Systems Operational</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;