// components/Sidebar.tsx
'use client'
import React from 'react';
import Link from 'next/link';
import { Home, BookOpen, Upload, Settings, FolderOpen, Library } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  activeItem?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem = 'Dashboard' }) => {
  const { user } = useAuth(false);
  const menuItems = [
    { name: 'Dashboard', icon: Home, href: '/' },
    { name: 'Materialen', icon: BookOpen, href: '/materialen' },
    { name: 'Concepten', icon: FolderOpen, href: '/concepten' },
    { name: 'Mijn uploads', icon: Upload, href: '/material-uploads' },
    { name: 'Bronnen', icon: Library, href: '/bronnen' },
    { name: 'Instellingen', icon: Settings, href: '/instellingen' },
  ];

  return (
    <div className="w-64 bg-white h-screen fixed left-0 top-0 border-r border-gray-200 flex flex-col">
      {/* Profile Section */}
      <Link href="/instellingen" className="p-6 border-b border-gray-200 block hover:bg-gray-50 transition-colors cursor-pointer">
        <div className="flex items-center space-x-3 mb-4">
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
            alt="Mijn profiel"
            className="w-16 h-16 rounded-full object-cover ring-2 ring-transparent hover:ring-[#E4AE7E] transition-all"
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">{user?.name ?? 'Gebruiker'}</h2>
            <span className="bg-[#E4AE7E] text-white text-xs px-2 py-0.5 rounded">DOCENT</span>
          </div>
          <p className="text-sm text-gray-600 mt-1 flex items-center">
            <span className="text-[#E4AE7E] mr-1">✉</span>
            {user?.email ?? ''}
          </p>
          <p className="mt-2 text-xs font-medium text-gray-500">Klik om je persoonlijke informatie te openen</p>
        </div>
      </Link>

      {/* Menu Section */}
      <div className="flex-1 py-6">
        <p className="px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          MENU
        </p>
        <nav className="px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.name === activeItem;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-[#E4AE7E] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;