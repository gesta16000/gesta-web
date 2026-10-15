'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useTheme } from 'next-themes';
import { 
  LayoutDashboard, Building2, FileText, LogOut, ShieldCheck, Bell, 
  Sun, Moon, Euro, Wallet, Shield, Archive 
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  
  // État pour stocker le rôle de l'utilisateur
  const [userRole, setUserRole] = useState<string | null>(null);

  // Récupérer le rôle au chargement de la sidebar
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

  // Liste des liens. On ajoute une propriété 'allowedRoles' pour les liens restreints.
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
      allowedRoles: ['admin', 'ecriture'] // ← Restreint aux admins et rédacteurs
    },
    { href: '/alertes', label: 'Alertes & Actions', icon: Bell },
  ];

  return (
    <div className="flex h-screen w-64 flex-col bg-slate-900 dark:bg-slate-950 text-white shadow-xl transition-colors">
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
      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => {
          // Si le lien a des rôles autorisés et que l'utilisateur n'en fait pas partie, on ne l'affiche pas
          if (link.allowedRoles && !link.allowedRoles.includes(userRole || '')) {
            return null;
          }

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