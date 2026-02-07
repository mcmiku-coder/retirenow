import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Save, Lock } from 'lucide-react';
import WorkflowNavigation from './WorkflowNavigation';

const AppHeader = () => {
    const { language, switchLanguage } = useLanguage();
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <header className="w-full h-40 flex justify-between items-start pt-6 px-6 bg-background sticky top-0 z-50">
            <div
                className="flex items-center gap-2 font-bold text-[2.8rem] cursor-pointer hover:opacity-80 transition-opacity w-[250px]"
                onClick={() => navigate('/')}
            >
                <span className="text-foreground">Can I</span>
                <span className="text-primary">Quit</span>
            </div>

            <div className="flex-1 flex justify-center">
                {!['/terms', '/privacy', '/disclaimer', '/contact'].includes(location.pathname) && (
                    <WorkflowNavigation />
                )}
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800 w-[100px] justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => switchLanguage('en')}
                        className={`h-7 px-3 text-xs font-medium rounded-md transition-all ${language === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        EN
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => switchLanguage('fr')}
                        className={`h-7 px-3 text-xs font-medium rounded-md transition-all ${language === 'fr' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        FR
                    </Button>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/settings')}
                    className="h-9 w-9 p-0 rounded-lg bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all"
                    title={language === 'en' ? 'Manage Data & Settings' : 'Gérer les données et paramètres'}
                >
                    <Save className="h-4 w-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/admin')}
                    className="h-9 w-9 p-0 rounded-lg bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all"
                    title={language === 'en' ? 'Admin Access' : 'Accès administrateur'}
                >
                    <Lock className="h-4 w-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        logout();
                        navigate('/');
                    }}
                    className="h-9 w-9 p-0 rounded-lg bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all"
                    title={language === 'en' ? 'Logout' : 'Déconnexion'}
                >
                    <LogOut className="h-4 w-4" />
                </Button>
            </div>
        </header>
    );
};

export default AppHeader;
