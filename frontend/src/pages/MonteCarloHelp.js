import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ArrowLeft, LineChart, Info, AlertCircle, TrendingUp, Target } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const MonteCarloHelp = () => {
    const navigate = useNavigate();
    const { t, language } = useLanguage();

    const sections = [
        {
            icon: LineChart,
            title: language === 'fr' ? 'Qu\'est-ce qu\'une simulation Monte-Carlo ?' : 'What is a Monte-Carlo simulation?',
            content: language === 'fr'
                ? 'Une simulation Monte-Carlo est une technique mathématique utilisée pour estimer les résultats possibles d\'un événement incertain. Contrairement à une projection déterministe (ligne droite), elle prend en compte la volatilité des marchés financiers.'
                : 'A Monte-Carlo simulation is a mathematical technique used to estimate the possible outcomes of an uncertain event. Unlike a deterministic projection (straight line), it accounts for the volatility of financial markets.'
        },
        {
            icon: TrendingUp,
            title: language === 'fr' ? 'Comment ça fonctionne ?' : 'How does it work?',
            content: language === 'fr'
                ? 'Le système génère des milliers de scénarios de marché aléatoires basés sur les rendements historiques et la volatilité. Chaque scénario représente une "vie" possible pour vos investissements.'
                : 'The system generates thousands of random market scenarios based on historical returns and volatility. Each scenario represents one possible "life" for your investments.'
        },
        {
            icon: Target,
            title: language === 'fr' ? 'Interpréter le résultat (5%)' : 'Interpreting the result (5%)',
            content: language === 'fr'
                ? 'Le montant affiché dans la simulation Monte-Carlo correspond généralement au scénario pessimiste (5ème percentile). Cela signifie qu\'il y a 95 % de chances que votre solde final soit supérieur à ce montant. C\'est une approche prudente pour assurer votre sécurité financière.'
                : 'The amount displayed in the Monte-Carlo simulation typically corresponds to the pessimistic scenario (5th percentile). This means there is a 95% chance that your final balance will be higher than this amount. It is a conservative approach to ensure your financial security.'
        },
        {
            icon: AlertCircle,
            title: language === 'fr' ? 'Pourquoi l\'utiliser ?' : 'Why use it?',
            content: language === 'fr'
                ? 'La retraite est un projet à long terme. Utiliser uniquement des rendements moyens (ex: 5% constants) peut être trompeur car une mauvaise année au début de la retraite peut avoir un impact dévastateur. Monte-Carlo vous aide à voir si votre plan est "robuste" face aux aléas.'
                : 'Retirement is a long-term project. Using only average returns (e.g., constant 5%) can be misleading because a bad year at the start of retirement can have a devastating impact. Monte-Carlo helps you see if your plan is "robust" against market fluctuations.'
        }
    ];

    return (
        <div className="flex-grow bg-background pb-8">
            <PageHeader
                title={t('result.monteCarloHelpTitle')}
                leftContent={
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="gap-2 hover:bg-muted/50 transition-colors text-slate-400 hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('nav.back')}
                    </Button>
                }
            />

            <div className="max-w-4xl mx-auto px-4">
                <div className="grid gap-6">
                    {sections.map((section, idx) => (
                        <Card key={idx} className="border-blue-500/20 bg-blue-900/5 overflow-hidden transition-all hover:border-blue-500/40">
                            <CardContent className="p-6">
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <section.icon className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold text-white">{section.title}</h3>
                                        <p className="text-muted-foreground leading-relaxed">
                                            {section.content}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="mt-8 flex justify-center">
                    <Button
                        variant="link"
                        onClick={() => navigate('/monte-carlo-audit')}
                        className="text-blue-400 hover:text-blue-300 underline-offset-4 flex items-center gap-2"
                    >
                        {language === 'fr'
                            ? "Voir comment la simulation Monte-Carlo a été appliquée dans cet outil"
                            : "See how the Monte-Carlo simulation was applied in this tool"}
                        <ArrowLeft className="h-4 w-4 rotate-180" />
                    </Button>
                </div>

                <div className="mt-8 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-4">
                    <Info className="h-6 w-6 text-amber-500 shrink-0" />
                    <p className="text-sm text-amber-200/80 italic">
                        {language === 'fr'
                            ? "Note : Ces simulations sont basées sur des modèles statistiques et des données historiques. Elles ne garantissent pas les rendements futurs."
                            : "Note: These simulations are based on statistical models and historical data. They do not guarantee future returns."}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MonteCarloHelp;
