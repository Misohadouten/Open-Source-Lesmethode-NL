'use client';

import { Bell, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { btn } from '@/lib/buttonStyles';
import { useAuth } from '@/hooks/useAuth';
import { fetchConceptenTerControle } from '@/lib/conceptWachtrij';
import type { LessenSerieDto } from '@/lib/lessenserieApi';

const Header: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [pending, setPending] = useState<LessenSerieDto[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.docentId) {
      setPending([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingQueue(true);
      try {
        const items = await fetchConceptenTerControle(user.docentId as string);
        if (!cancelled) setPending(items);
      } catch {
        if (!cancelled) setPending([]);
      } finally {
        if (!cancelled) setLoadingQueue(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.docentId]);

  const handleLogout = async () => {
    try {
      window.location.href = '/api/auth/logout';
    } catch (error) {
      console.error('Logout failed:', error);
      router.push('/login');
    }
  };

  const preview = pending.slice(0, 5);
  const count = pending.length;

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
            aria-label="Beoordelingswachtrij"
          >
            <Bell size={20} className="text-gray-600" />
            {count > 0 && (
              <span className="absolute top-1 right-1 min-w-[1.125rem] h-[1.125rem] px-1 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 z-50 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Bell size={16} className="text-[#E4AE7E]" />
                  Te beoordelen
                </h3>
                {count > 0 && (
                  <span className="bg-[#E4AE7E] text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                    {count} wachtend
                  </span>
                )}
              </div>

              <div className="max-h-[25rem] overflow-y-auto">
                {loadingQueue ? (
                  <p className="p-5 text-sm text-gray-500">Wachtrij laden...</p>
                ) : preview.length === 0 ? (
                  <p className="p-5 text-sm text-gray-500">
                    Geen concepten van collega&apos;s die op jouw beoordeling wachten.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {preview.map((item) => (
                      <li key={item.id} className="p-4 hover:bg-gray-50/80 transition-colors">
                        <p className="text-sm font-semibold text-gray-900">{item.titel}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Door {item.eigenaar?.naam ?? 'onbekende docent'}
                        </p>
                        <Link
                          href="/concepten"
                          onClick={() => setShowNotifications(false)}
                          className={`mt-3 w-full ${btn.secondary} text-xs py-2`}
                        >
                          Openen in Concepten
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="p-3 bg-gray-50 border-t border-gray-100">
                <Link
                  href="/concepten"
                  onClick={() => setShowNotifications(false)}
                  className={`block w-full text-center ${btn.ghost} text-xs py-2`}
                >
                  Bekijk volledige wachtrij
                </Link>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Uitloggen"
        >
          <LogOut size={20} className="text-[#E4AE7E]" />
        </button>
      </div>
    </header>
  );
};

export default Header;
