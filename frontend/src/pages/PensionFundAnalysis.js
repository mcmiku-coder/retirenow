import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import PageHeader from '../components/PageHeader';
import { toast } from '../utils/toast';

const PensionFundAnalysis = () => {
    const navigate = useNavigate();
    const { user, masterKey } = useAuth();
    const { t, language } = useLanguage();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user || !masterKey) {
            navigate('/');
            return;
        }
    }, [user, masterKey, navigate]);

    const handleApply = async () => {
        setLoading(true);
        try {
            // Logic will be added in future prompts
            toast.success(language === 'fr' ? 'Données appliquées avec succès' : 'Data applied successfully');
            navigate('/retirement-inputs');
        } catch (error) {
            console.error('Error saving pension analysis:', error);
            toast.error(language === 'fr' ? 'Erreur lors de la sauvegarde' : 'Error during save');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-grow py-6 bg-background space-y-8">
            <PageHeader
                title={language === 'fr' ? 'Analyse de votre caisse de pension' : 'Pension Fund Analysis'}
                subtitle={language === 'fr' ? 'Calculez et simulez les prestations de votre caisse de pension' : 'Calculate and simulate your pension fund benefits'}
                showBack={true}
                onBack={() => navigate('/retirement-inputs')}
            />

            <div className="max-w-5xl mx-auto px-4 space-y-8">
                <Card className="bg-muted/30 border-slate-700/50">
                    <CardHeader>
                        <CardTitle className="text-xl">
                            {language === 'fr' ? 'Calculs et paramètres' : 'Calculations and Parameters'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="min-h-[300px] flex items-center justify-center text-muted-foreground italic">
                        {language === 'fr' 
                            ? 'Le contenu de cette page sera défini dans les prochains prompts.' 
                            : 'The content of this page will be defined in future prompts.'}
                    </CardContent>
                </Card>

                {/* Bottom Action Buttons */}
                <div className="flex justify-end gap-4 py-8">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={() => navigate('/retirement-inputs')}
                    >
                        {t('realEstate.cancel')}
                    </Button>
                    <Button
                        size="lg"
                        onClick={handleApply}
                        disabled={loading}
                        className="px-8"
                    >
                        {loading ? t('realEstate.saving') : t('realEstate.applySave')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PensionFundAnalysis;
