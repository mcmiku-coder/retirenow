import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft } from 'lucide-react';

const RetirementBenefitsHelp = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    return (
        <div className="flex-grow py-8">
            <PageHeader
                title={t('retirementBenefitsHelp.title')}
                subtitle={t('retirementBenefitsHelp.subtitle')}
                leftContent={
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="text-white hover:text-primary hover:bg-white/10"
                    >
                        <ArrowLeft className="h-6 w-6 mr-2" />
                        {t('common.back')}
                    </Button>
                }
            />
            <div className="max-w-7xl mx-auto px-4">
                <div className="bg-card border rounded-lg p-6">
                    <p className="text-muted-foreground">
                        {t('retirementBenefitsHelp.contentPlaceholder')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RetirementBenefitsHelp;
