import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, Info, FileSpreadsheet, Sigma, GitMerge, Combine, AlertTriangle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { assetClassCorrelations, getAllProducts } from '../data/investmentProducts';

const MonteCarloAudit = () => {
    const navigate = useNavigate();
    const { t, language } = useLanguage();

    // Helper for "What does this mean?" boxes
    const ExplanationBox = ({ children }) => (
        <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
            <div className="flex gap-2 items-start">
                <Info className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <h4 className="font-semibold text-emerald-400 text-sm uppercase tracking-wider">
                        {language === 'fr' ? 'Qu\'est-ce que cela signifie ?' : 'What does this mean?'}
                    </h4>
                    <div className="text-sm leading-relaxed opacity-90">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );

    const products = getAllProducts();
    const assetClasses = Object.keys(assetClassCorrelations);

    return (
        <div className="flex-grow bg-background pb-20 pt-8 flex flex-col">
            <div className="w-full mb-2">
                <PageHeader
                    title={language === 'fr' ? 'Audit Technique: Simulation Monte-Carlo' : 'Technical Audit: Monte-Carlo Simulation'}
                    leftContent={
                        <Button
                            variant="ghost"
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-lg font-medium"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            {t('nav.back')}
                        </Button>
                    }
                />
            </div>

            <div className="max-w-5xl mx-auto px-4 w-full space-y-12">

                {/* Intro Section */}
                <div className="prose prose-invert max-w-none">
                    <p className="text-xl text-slate-300 leading-relaxed">
                        {language === 'fr'
                            ? "Ce document detains l'implémentation exacte du moteur de simulation Monte-Carlo utilisé dans cette application. Il est conçu pour offrir une transparence totale sur les modèles mathématiques, les hypothèses et les simplifications utilisées."
                            : "This document details the exact implementation of the Monte-Carlo simulation engine used in this application. It is designed to provide full transparency regarding the mathematical models, assumptions, and simplifications employed."}
                    </p>
                </div>

                {/* 1. Core Model */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl text-blue-400">
                            <Sigma className="h-8 w-8" />
                            {language === 'fr' ? '1. Modèle Mathématique (GBM)' : '1. Mathematical Model (GBM)'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <p className="text-slate-300">
                                {language === 'fr'
                                    ? "La simulation utilise le mouvement brownien géométrique (GBM) pour modéliser l'évolution des prix des actifs. La formule discrétisée pour chaque pas de temps (année) est :"
                                    : "The simulation uses Geometric Brownian Motion (GBM) to model the evolution of asset prices. The discretized formula for each time step (year) is:"}
                            </p>
                            <div className="p-4 bg-slate-950 rounded-lg font-mono text-amber-400 text-center text-lg border border-slate-800">
                                S(t+1) = S(t) × exp((μ - 0.5 × σ²) × Δt + σ × ε × √Δt)
                            </div>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400">
                                <li><strong>μ (Mu):</strong> {language === 'fr' ? 'Rendement attendu (dérive)' : 'Expected return (drift)'}</li>
                                <li><strong>σ (Sigma):</strong> {language === 'fr' ? 'Volatilité (écart-type)' : 'Volatility (standard deviation)'}</li>
                                <li><strong>Δt:</strong> {language === 'fr' ? 'Pas de temps (1 an)' : 'Time step (1 year)'}</li>
                                <li><strong>ε (Epsilon):</strong> {language === 'fr' ? 'Variable aléatoire (choc stochastique)' : 'Random variable (stochastic shock)'}</li>
                            </ul>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                            <h4 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                {language === 'fr' ? 'Simplification académique' : 'Academic Simplification'}
                            </h4>
                            <p className="text-sm text-yellow-200/80">
                                {language === 'fr'
                                    ? "Nous supposons que μ et σ sont constants dans le temps (homoscédasticité). Dans la réalité, la volatilité a tendance à se regrouper (clusters) et les rendements peuvent varier selon les régimes économiques."
                                    : "We assume μ and σ are constant over time (homoscedasticity). In reality, volatility tends to cluster, and returns can vary across economic regimes."}
                            </p>
                        </div>

                        <ExplanationBox>
                            {language === 'fr'
                                ? "Imaginez que le marché boursier est un marcheur ivre. Nous savons à quelle vitesse il marche en moyenne (rendement) et à quel point il titube (volatilité). Cette formule prédit où il pourrait être l'année prochaine en ajoutant un pas aléatoire basé sur son niveau d'ivresse habituel."
                                : "Imagine the stock market is a drunk walker. We know how fast he walks on average (return) and how much he stumbles (volatility). This formula predicts where he might be next year by adding a random step based on his usual level of stumbling."}
                        </ExplanationBox>
                    </CardContent>
                </Card>

                {/* 2. Distribution Types */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl text-purple-400">
                            <Combine className="h-8 w-8" />
                            {language === 'fr' ? '2. Distribution: Student-t vs Normale' : '2. Distribution: Student-t vs Normal'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <p className="text-slate-300">
                            {language === 'fr'
                                ? "Au lieu d'utiliser une distribution normale standard (courbe en cloche parfaite), nous utilisons une **distribution Student-t** avec 5 degrés de liberté (df=5)."
                                : "Instead of using a standard Normal distribution (perfect bell curve), we utilize a **Student-t distribution** with 5 degrees of freedom (df=5)."}
                        </p>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="p-4 bg-slate-950/50 rounded border border-slate-800">
                                <h4 className="font-semibold text-slate-200 mb-2">Normal Distribution</h4>
                                <p className="text-sm text-slate-400">
                                    {language === 'fr' ? "Sous-estime les événements extrêmes (Krachs). Les mouvements de +3σ ou -3σ sont statistiquement impossibles." : "Underestimates extreme events (Crashes). +3σ or -3σ moves are statistically nearly impossible."}
                                </p>
                            </div>
                            <div className="p-4 bg-purple-900/10 rounded border border-purple-500/20">
                                <h4 className="font-semibold text-purple-300 mb-2">Student-t (df=5) (Implemented)</h4>
                                <p className="text-sm text-purple-200/70">
                                    {language === 'fr' ? "Possède des \"queues lourdes\" (Fat Tails). Permet de générer des scénarios de crise plus fréquents et plus réalistes pour la planification financière." : "Features \"Fat Tails\". Generates more frequent and realistic crisis scenarios, which is crucial for robust financial planning."}
                                </p>
                            </div>
                        </div>

                        <ExplanationBox>
                            {language === 'fr'
                                ? "Les modèles standards supposent que les krachs boursiers monstres n'arrivent qu'une fois tous les millions d'années. Notre modèle 'Student-t' suppose qu'ils peuvent arriver quelques fois par siècle. C'est beaucoup plus sûr pour planifier votre retraite car cela inclut les 'Cygnes Noirs'."
                                : "Standard models assume massive market crashes essentially never happen (once in a million years). Our 'Student-t' model assumes they happen a few times a century. This is much safer for retirement planning because it accounts for 'Black Swan' events."}
                        </ExplanationBox>
                    </CardContent>
                </Card>


                {/* 3. Correlation Engine */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl text-indigo-400">
                            <GitMerge className="h-8 w-8" />
                            {language === 'fr' ? '3. Corrélations (Décomposition de Cholesky)' : '3. Correlations (Cholesky Decomposition)'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <p className="text-slate-300">
                            {language === 'fr'
                                ? "Pour simuler un portefeuille multi-actifs, nous ne pouvons pas simuler chaque actif isolément. Nous devons respecter leurs corrélations (ex: quand les actions chutent, les obligations montent souvent)."
                                : "To simulate a multi-asset portfolio, we cannot simulate each asset in isolation. We must respect their correlations (e.g., when Equities fall, Bonds often rise)."}
                        </p>

                        <div className="pl-4 border-l-2 border-indigo-500 space-y-2">
                            <h4 className="text-indigo-300 font-medium">Algorithm:</h4>
                            <ol className="list-decimal pl-5 space-y-1 text-slate-400 text-sm">
                                <li>Construct the Correlation Matrix (<strong>Σ</strong>) from asset types.</li>
                                <li>Apply <strong>Cholesky Decomposition</strong> to find Lower Triangular Matrix (<strong>L</strong>) such that L × Lᵀ = Σ.</li>
                                <li>Generate independent random vectors (<strong>Z</strong>).</li>
                                <li>Calculate correlated vectors (<strong>X</strong>) via matrix multiplication: <strong>X = L × Z</strong>.</li>
                            </ol>
                        </div>

                        <div className="bg-slate-950 p-6 rounded-lg overflow-x-auto border border-slate-800">
                            <h4 className="text-slate-200 mb-4 font-semibold text-sm uppercase tracking-wider">
                                {language === 'fr' ? 'Matrice de Corrélation Utilisée' : 'Implemented Correlation Matrix'}
                            </h4>
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="border-b border-slate-700 text-slate-400">
                                        <th className="px-2 py-2">Asset Class</th>
                                        {assetClasses.map(ac => <th key={ac} className="px-2 py-2">{ac}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {assetClasses.map(row => (
                                        <tr key={row} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                                            <td className="px-2 py-3 font-medium text-slate-300">{row}</td>
                                            {assetClasses.map(col => (
                                                <td key={col} className={`px-2 py-3 font-mono ${assetClassCorrelations[row][col] > 0.5 ? 'text-green-400' :
                                                        assetClassCorrelations[row][col] < 0 ? 'text-red-400' : 'text-slate-500'
                                                    }`}>
                                                    {assetClassCorrelations[row][col].toFixed(2)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                            <h4 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                {language === 'fr' ? 'Simplification' : 'Simplification'}
                            </h4>
                            <p className="text-sm text-yellow-200/80">
                                {language === 'fr'
                                    ? "La matrice de corrélation est statique. Elle ne change pas en période de crise (sauf via notre test de stress 'ad-hoc'). Les corrélations sont basées sur des grandes classes d'actifs (ex: 'Actions') et non sur les produits individuels spécifiques."
                                    : "The correlation matrix is static. It does not evolve during crises (except via our ad-hoc stress test). Correlations are based on broad Asset Classes (e.g., 'Equities') rather than the specific individual products."}
                            </p>
                        </div>

                        <ExplanationBox>
                            {language === 'fr'
                                ? "Si vous possédez des actions et de l'immobilier, ils ne bougent pas de la même manière au même moment. Cette matrice mathématique garantit que notre simulation respecte ce lien. Cela 'lisse' généralement votre risque : quand l'un perd, l'autre gagne peut-être, ce qui protège votre portefeuille."
                                : "If you own Stocks and Real Estate, they don't move exactly the same way at the same time. This mathematical matrix ensures our simulation respects that relationship. This usually 'smoothes' your risk: when one loses money, the other might gain, protecting your overall portfolio."}
                        </ExplanationBox>
                    </CardContent>
                </Card>

                {/* 4. Portfolio Data */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl text-cyan-400">
                            <FileSpreadsheet className="h-8 w-8" />
                            {language === 'fr' ? '4. Données Historiques & Paramètres' : '4. Historical Data & Parameters'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <p className="text-slate-300">
                            {language === 'fr'
                                ? "Les simulations sont calibrées sur des données historiques de 25 ans (2000-2025). Voici les paramètres de rendement et de volatilité utilisés pour chaque instrument :"
                                : "Simulations are calibrated on 25 years of historical data (2000-2025). Below are the return and volatility parameters used for each instrument:"}
                        </p>

                        <div className="bg-slate-950 p-6 rounded-lg overflow-x-auto border border-slate-800">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="border-b border-slate-700 text-slate-400">
                                        <th className="px-4 py-3">Product</th>
                                        <th className="px-4 py-3">Asset Class</th>
                                        <th className="px-4 py-3 text-right">Avg Return (μ)</th>
                                        <th className="px-4 py-3 text-right">Avg Volatility (σ)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(product => (
                                        <tr key={product.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                                            <td className="px-4 py-3 font-medium text-white">{product.name}</td>
                                            <td className="px-4 py-3 text-slate-400">{product.assetClass}</td>
                                            <td className="px-4 py-3 text-right text-green-400">{product.metrics.avgReturn}%</td>
                                            <td className="px-4 py-3 text-right text-red-400">{product.metrics.avgVolatility}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="pl-4 border-l-2 border-cyan-500 space-y-2">
                            <h4 className="text-cyan-300 font-medium">Rebalancing Assumption:</h4>
                            <p className="text-sm text-slate-400">
                                {language === 'fr'
                                    ? "La simulation suppose un **rééquilibrage annuel**. Cela signifie que chaque année, nous vendons les gagnants et achetons les perdants pour revenir à votre allocation cible initiale (ex: 50/50)."
                                    : "The simulation assumes **Annual Rebalancing**. This means every year, we sell winners and buy losers to return to your initial target allocation (e.g., 50/50)."}
                            </p>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
};

export default MonteCarloAudit;
