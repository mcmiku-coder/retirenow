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
    const { t, language } = useLanguage();

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
        <div className="min-h-screen bg-background pb-20 pt-8 flex flex-col">
            <div className="w-full mb-8">
                <PageHeader
                    title={t('infoPage.securityModal.title')}
                    subtitle={t('infoPage.securityModal.architecture')}
                    leftContent={
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/information')}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-lg font-medium"
                        >
                            <ChevronLeft className="h-5 w-5" />
                            {t('nav.back')}
                        </Button>
                    }
                />
            </div>

            <div className="max-w-4xl mx-auto px-4 w-full">
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

                <div className="mt-12 p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col items-center text-center">
                    <Shield className="h-12 w-12 text-emerald-500 mb-4" />
                    <h4 className="text-xl font-bold text-foreground mb-2">
                        {t('infoPage.securityTitle')}
                    </h4>
                    <p className="text-muted-foreground max-w-2xl">
                        {t('infoPage.securityDesc')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SecurityDetails;
