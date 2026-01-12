import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import WorkflowNavigation from '../components/WorkflowNavigation';
import { Sliders } from 'lucide-react';

const RetirementInputs = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    return (
        <div className="min-h-screen py-8 px-4" data-testid="retirement-inputs-page">
            <div className="max-w-7xl mx-auto">
                {/* Workflow Navigation */}
                <WorkflowNavigation />

                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
                        <Sliders className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">
                        {t('retirementInputs.title')}
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        {t('retirementInputs.subtitle')}
                    </p>
                </div>

                <Card className="max-w-3xl mx-auto mb-8 text-center p-12">
                    <CardContent>
                        <p className="text-xl text-muted-foreground mb-4">
                            {/* Placeholder content */}
                            This section will contain inputs for savings, future inflows, and transmission objectives.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            (Content coming soon)
                        </p>
                    </CardContent>
                </Card>

                <div className="flex justify-center">
                    <Button
                        size="lg"
                        onClick={() => navigate('/scenario')}
                        className="px-8"
                    >
                        {t('retirementInputs.continue')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default RetirementInputs;
