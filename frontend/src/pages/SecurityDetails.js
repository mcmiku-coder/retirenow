import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
    Shield, HardDrive, Key, RefreshCw, Download, ChevronLeft
} from 'lucide-react';
import PageHeader from '../components/PageHeader';

const SecurityDetails = () => {
    const navigate = useNavigate();
    const { t, language, switchLanguage } = useLanguage();

    const securitySections = [
        {
            id: 'local-encryption',
            icon: HardDrive,
            title: t('infoPage.securityModal.localEncryptionTitle'),
            desc: t('infoPage.securityModal.localEncryptionDesc'),
            iconColor: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10'
        },
        {
            id: 'master-key',
            icon: Key,
            title: t('infoPage.securityModal.masterKeyTitle'),
            desc: t('infoPage.securityModal.masterKeyDesc'),
            iconColor: 'text-blue-500',
            bgColor: 'bg-blue-500/10'
        },
        {
            id: 'password-reset',
            icon: RefreshCw,
            title: t('infoPage.securityModal.passwordResetTitle'),
            desc: t('infoPage.securityModal.passwordResetDesc'),
            iconColor: 'text-orange-500',
            bgColor: 'bg-orange-500/10'
        },
        {
            id: 'privacy',
            icon: Download,
            title: t('infoPage.securityModal.privacyTitle'),
            desc: t('infoPage.securityModal.privacyDesc'),
            iconColor: 'text-purple-500',
            bgColor: 'bg-purple-500/10'
        }
    ];

    return (
        <div className="flex-grow bg-background pb-20 pt-8 flex flex-col relative overflow-x-hidden">
            {/* Language Selector - Top Right Absolute */}
            <div className="absolute top-6 right-6 z-50">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-200 dark:border-slate-800 w-[100px] justify-center shadow-sm">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => switchLanguage('en')} // Note: switchLanguage needs to be extracted from useLanguage
                        className={`h-7 px-3 text-xs font-medium rounded-md transition-all ${language === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                    >
                        EN
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => switchLanguage('fr')}
                        className={`h-7 px-3 text-xs font-medium rounded-md transition-all ${language === 'fr' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                    >
                        FR
                    </Button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 w-full">
                {/* Navigation */}
                <Button
                    variant="ghost"
                    onClick={() => navigate('/information')}
                    className="mb-8 group flex items-center gap-2 text-muted-foreground hover:text-foreground pl-0"
                >
                    <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    {t('nav.back')}
                </Button>

                {/* Header Section */}
                <div className="text-center mb-12 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-sans text-foreground">
                        {t('infoPage.securityModal.title')}
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        {t('infoPage.securityModal.architecture')}
                    </p>
                </div>

                <div className="grid gap-6">
                    {securitySections.map((section) => {
                        const Icon = section.icon;
                        return (
                            <Card key={section.id} className="border-border bg-card/50 backdrop-blur-sm overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
                                <CardContent className="p-8">
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className={`shrink-0 p-4 rounded-2xl ${section.bgColor} ${section.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                                            <Icon className="h-8 w-8" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-2xl font-bold text-foreground mb-3 font-sans">
                                                {section.title}
                                            </h3>
                                            <p className="text-muted-foreground text-lg leading-relaxed">
                                                {section.desc}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>


            </div>
        </div>
    );
};

export default SecurityDetails;
