import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, TrendingUp, Palette, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../context/LanguageContext';

/**
 * AdminLayout - Vertical sidebar navigation for admin section
 * 
 * Features:
 * - Fixed left sidebar with "Can I Quit" logo
 * - Vertical navigation
 * - Language toggle and logout on same line at bottom
 */
export default function AdminLayout({ children, onLogout }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { language, switchLanguage } = useLanguage();

    const navItems = [
        {
            path: '/admin/dashboard',
            icon: LayoutDashboard,
            label: 'Dashboard',
            description: 'Overview & stats'
        },
        {
            path: '/admin/users',
            icon: Users,
            label: 'Users',
            description: 'Manage users'
        },
        {
            path: '/admin/instruments',
            icon: TrendingUp,
            label: 'Instruments',
            description: 'Global catalog'
        },
        {
            path: '/admin/config',
            icon: Palette,
            label: 'White Label',
            description: 'Design & content'
        }
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen flex bg-background">
            {/* Fixed Left Sidebar */}
            <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 flex flex-col fixed left-0 top-0 bottom-0 z-50">
                {/* Logo Header */}
                <div className="p-6 border-b border-slate-700">
                    <div
                        className="flex items-center gap-2 font-bold text-[1.8rem] cursor-pointer hover:opacity-80 transition-opacity mb-2"
                        onClick={() => navigate('/')}
                    >
                        <span className="text-white">Can I</span>
                        <span className="text-blue-400">Quit</span>
                    </div>
                    <p className="text-sm text-slate-400">Admin Panel</p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);

                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`
                                    w-full flex items-start gap-3 p-3 rounded-lg transition-all
                                    ${active
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                                    }
                                `}
                            >
                                <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                                <div className="text-left">
                                    <div className="font-medium">{item.label}</div>
                                    <div className={`text-xs ${active ? 'text-blue-100' : 'text-slate-500'}`}>
                                        {item.description}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom Section: Language Toggle & Logout on same line */}
                <div className="p-4 border-t border-slate-700">
                    <div className="flex items-center gap-2">
                        {/* Language Toggle */}
                        <div className="flex-1 flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => switchLanguage('en')}
                                className={`flex-1 h-8 px-3 text-xs font-medium rounded-md transition-all ${language === 'en'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                    }`}
                            >
                                EN
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => switchLanguage('fr')}
                                className={`flex-1 h-8 px-3 text-xs font-medium rounded-md transition-all ${language === 'fr'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                    }`}
                            >
                                FR
                            </Button>
                        </div>

                        {/* Logout Icon Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-slate-300 hover:text-white hover:bg-slate-700/50"
                            onClick={onLogout}
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content - with left margin to account for fixed sidebar */}
            <main className="flex-1 ml-64 overflow-auto">
                {children}
            </main>
        </div>
    );
}
