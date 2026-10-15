'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useTheme } from 'next-themes';
import { 
  LayoutDashboard, Building2, FileText, LogOut, ShieldCheck, Bell, 
  Sun, Moon, Euro, Wallet, Shield, Archive, Menu, X 
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const getUserRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (data) {
          setUserRole(data.role);
        }
      }
    };
    getUserRole();
  }, []);

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
    { 
      href: '/clotures', 
      label: 'Clôtures & Exports', 
      icon: Archive, 
      allowedRoles: ['admin', 'ecriture']
    },
    { href: '/alertes', label: 'Alertes & Actions', icon: Bell },
  ];

  const NavContent = () => (
    <>
      {/* Logo + Toggle thème */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
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
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {links.map((link) => {
          if (link.allowedRoles && !link.allowedRoles.includes(userRole || '')) {
            return null;
          }

          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)} // Ferme le menu sur mobile après clic
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
          onClick={() => setIsMobileMenuOpen(false)}
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
    </>
  );

  return (
    <>
      {/* BOUTON MOBILE (visible uniquement sur mobile) */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-900 dark:bg-slate-950 text-white shadow-lg border border-slate-700"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* OVERLAY (fond sombre quand menu ouvert sur mobile) */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR MOBILE (drawer qui glisse) */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 dark:bg-slate-950 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Bouton fermer (X) */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="h-6 w-6" />
        </button>
        
        <div className="pt-16"> {/* Espace pour le bouton X */}
          <NavContent />
        </div>
      </div>

      {/* SIDEBAR DESKTOP (fixe, visible toujours) */}
      <div className="hidden md:flex h-screen w-64 flex-col bg-slate-900 dark:bg-slate-950 text-white shadow-xl transition-colors">
        <NavContent />
      </div>
    </>
  );
}