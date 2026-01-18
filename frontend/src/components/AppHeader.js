import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import WorkflowNavigation from './WorkflowNavigation';

const AppHeader = () => {
    const { language, switchLanguage } = useLanguage();
    const navigate = useNavigate();

    return (
        <header className="w-full h-24 flex justify-between items-center px-6 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div
                className="flex items-center gap-2 font-bold text-4xl cursor-pointer hover:opacity-80 transition-opacity w-[250px]"
                onClick={() => navigate('/')}
            >
                <span className="text-foreground">Can I</span>
                <span className="text-primary">Quit</span>
            </div>

            <div className="flex-1 flex justify-center">
                <WorkflowNavigation />
            </div>

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
        </header>
    );
};

export default AppHeader;
