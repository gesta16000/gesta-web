'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useTheme } from 'next-themes';
import { 
  LayoutDashboard, Building2, FileText, LogOut, ShieldCheck, Bell, 
  Sun, Moon, Euro, Wallet, Shield 
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const links = [
    { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/prestataires', label: 'Prestataires', icon: Building2 },
    { href: '/contrats', label: 'Contrats', icon: FileText },
    { href: '/budgets', label: 'Budgets', icon: Euro },
    { href: '/depenses', label: 'Dépenses', icon: Wallet },
    { href: '/alertes', label: 'Alertes & Actions', icon: Bell },
  ];

  return (
    <div className="flex h-screen w-64 flex-col bg-slate-900 dark:bg-slate-950 text-white shadow-xl transition-colors">
      {/* Logo + Toggle thème */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {/* LOGO A ROND */}
          <img 
            src="/logo-a.png" 
            alt="Logo Angoulême" 
            className="h-10 w-10 rounded-full object-cover border-2 border-white dark:border-slate-700" 
          />
          <span className="text-lg font-bold tracking-wide">GESTA</span>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          title="Changer le thème"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Section Admin + Déconnexion */}
      <div className="border-t border-slate-800 p-3 space-y-1">
        <Link
          href="/admin"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
            pathname === '/admin' || pathname.startsWith('/admin/')
              ? 'bg-purple-600 text-white shadow-md shadow-purple-900/20'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Shield className="h-5 w-5" />
          Admin Dashboard
        </Link>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-5 w-5" />
          Déconnexion
        </button>
      </div>
    </div>
  );
}