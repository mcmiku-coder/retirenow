import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { getScenarioData } from '../utils/database';
import PageHeader from '../components/PageHeader';

const CapitalManagementSetup = () => {
    const navigate = useNavigate();
    const { user, password } = useAuth();
    const { t, language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [investedItems, setInvestedItems] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            if (user?.email && password) {
                try {
                    const scenarioData = await getScenarioData(user.email, password);
                    if (scenarioData) {
                        const allItems = [
                            ...(scenarioData.incomes || []),
                            ...(scenarioData.costs || []),
                            ...(scenarioData.currentAssets || []),
                            ...(scenarioData.desiredOutflows || [])
                        ];

                        // Filter items where strategy is 'Invested'
                        const filtered = allItems.filter(item => item.strategy === 'Invested');
                        setInvestedItems(filtered);
                    }
                } catch (error) {
                    console.error("Error loading scenario data", error);
                } finally {
                    setLoading(false);
                }
            }
        };

        loadData();
    }, [user, password]);

    // Format amount as CHF
    const formatAmount = (amount) => {
        return `CHF ${parseFloat(amount || 0).toLocaleString()}`;
    };

    if (loading) {
        return <div className="p-8 text-center">{language === 'fr' ? 'Chargement...' : 'Loading...'}</div>;
    }

    return (
        <div className="min-h-screen py-6" data-testid="capital-management-page">
            <div className="max-w-[1400px] mx-auto mb-6 px-4">
            </div>

            <PageHeader
                title={language === 'fr' ? 'Gestion du capital' : 'Capital management setup'}
                subtitle={language === 'fr'
                    ? 'Définissez la stratégie pour vos actifs investis'
                    : 'Setup the strategy for your invested items'}
            />

            <div className="max-w-[1400px] mx-auto px-4">

                <Card>
                    <CardHeader>
                        <CardTitle>{language === 'fr' ? 'Éléments investis' : 'Invested items'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {investedItems.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                                {language === 'fr'
                                    ? 'Aucun élément marqué comme "Investi" dans la revue des données.'
                                    : 'No items marked as "Invested" found in data review.'}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="text-left p-3 font-semibold">{t('scenario.name')}</th>
                                            <th className="text-right p-3 font-semibold">{language === 'fr' ? 'Montant' : 'Amount'}</th>
                                            <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Tag Cluster' : 'Cluster Tag'}</th>
                                            <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Stratégie' : 'Strategy'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {investedItems.map((item, index) => (
                                            <tr key={index} className="border-b hover:bg-muted/30">
                                                <td className="p-3 font-medium">{item.name}</td>
                                                <td className="text-right p-3 text-muted-foreground">
                                                    {formatAmount(item.adjustedAmount || item.amount)}
                                                </td>
                                                <td className="p-3">{item.clusterTag || '-'}</td>
                                                <td className="p-3">{item.strategy}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="mt-8 flex justify-end gap-4">
                            <Button
                                variant="outline"
                                onClick={() => navigate('/data-review')}
                            >
                                {language === 'fr' ? 'Retour' : 'Back'}
                            </Button>
                            <Button
                                onClick={() => navigate('/result')}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {language === 'fr' ? 'Continuer vers le verdict' : 'Continue to Verdict'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default CapitalManagementSetup;
