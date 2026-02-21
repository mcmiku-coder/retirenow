import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
    ArrowLeft, Info, FileSpreadsheet, Sigma,
    Combine, LayoutDashboard, History, Coins,
    TrendingUp, Activity, BarChart3, Settings2
} from 'lucide-react';
import PageHeader from '../components/PageHeader';

const MonteCarloDetails = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, language } = useLanguage();

    // Get simulation results from location state
    const mcProjections = location.state?.mcProjections;
    // Handle both direct stats or nested details.stats
    const stats = mcProjections?.stats || mcProjections?.details?.stats;

    if (!stats) {
        return (
            <div className="flex-grow bg-background flex items-center justify-center p-8">
                <Card className="max-w-md w-full border-slate-800 bg-slate-900/50">
                    <CardContent className="pt-6 text-center space-y-4">
                        <Info className="h-12 w-12 text-blue-400 mx-auto" />
                        <h2 className="text-xl font-bold text-white">No Simulation Data found</h2>
                        <p className="text-slate-400">Please run a simulation first to view the engine details.</p>
                        <Button onClick={() => navigate('/result')} variant="outline" className="w-full">
                            Back to Simulation
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { assetStats, historyInfo, settings, covMatrix, corrMatrix } = stats;

    const MatrixTable = ({ matrix, title, type = 'correlation' }) => {
        const assetMap = stats.assetMap || [];
        const labels = assetStats?.map(a => {
            const pName = a.portfolioName || a.id || 'N/A';
            // Only show portfolio name if it's different from the instrument name
            if (a.name && pName !== a.name) {
                return `${a.name} (${pName})`;
            }
            return a.name || pName;
        }) || assetMap;

        return (
            <div className="bg-slate-950 p-6 rounded-lg overflow-x-auto border border-slate-800">
                <h4 className="text-slate-200 mb-4 font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
                    {type === 'correlation' ? <Combine className="h-4 w-4 text-indigo-400" /> : <Sigma className="h-4 w-4 text-indigo-400" />}
                    {title}
                </h4>
                <table className="w-full text-xs text-left table-fixed">
                    <thead>
                        <tr className="border-b border-slate-700 text-slate-400">
                            <th className="px-2 py-2 w-[140px] align-bottom">Asset Name</th>
                            {labels.map((label, i) => (
                                <th key={i} className="px-1 py-2 text-center text-[10px] break-words leading-tight align-bottom" title={label}>
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {matrix.map((row, i) => (
                            <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                                <td className="px-2 py-3 font-medium text-slate-300">{labels[i]}</td>
                                {row.map((val, j) => {
                                    return (
                                        <td key={j} className="px-2 py-3 font-mono text-center text-white">
                                            {type === 'correlation' ? val.toFixed(4) : (val * 12 * 10000).toFixed(1)}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {type === 'covariance' && <p className="text-[10px] text-slate-500 mt-2 italic">* Les valeurs de covariance sont annualisées (Mensuel x 12) et multipliées par 10 000. Sur la diagonale, elles représentent le carré de la volatilité annuelle (ex: 12% vol donne 144.0).</p>}
            </div>
        );
    };

    return (
        <div className="flex-grow bg-background pb-20 pt-8 flex flex-col">
            <div className="w-full mb-2">
                <PageHeader
                    title={language === 'fr' ? 'Détails du Moteur MC' : 'MC Engine Details'}
                    subtitle={language === 'fr' ? 'Paramètres, Statistiques et Corrélations' : 'Parameters, Stats & Correlations'}
                    leftContent={
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/result')}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-lg font-medium"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            {language === 'fr' ? 'Retour aux résultats' : 'Back to Results'}
                        </Button>
                    }
                />
            </div>

            <div className="max-w-6xl mx-auto px-4 w-full space-y-8">

                {/* 1. Simulation Identity & Settings */}
                <div className="grid md:grid-cols-4 gap-4">
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Settings2 className="h-3 w-3" />
                                {language === 'fr' ? 'Itérations' : 'Iterations'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{(settings?.iterations || 0).toLocaleString()}</div>
                            <p className="text-xs text-slate-500 mt-1">{language === 'fr' ? 'Chemins simulés' : 'Paths simulated'}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Activity className="h-3 w-3 text-emerald-400" />
                                {language === 'fr' ? 'Pas de Temps' : 'Time Step'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{language === 'fr' ? 'Mensuel' : (settings?.step || 'Monthly')}</div>
                            <p className="text-xs text-slate-500 mt-1">{language === 'fr' ? 'Fréquence discrète' : 'Discrete frequency'}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <History className="h-3 w-3 text-blue-400" />
                                {language === 'fr' ? 'Historique' : 'History Length'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{historyInfo?.sampleSize || 0} {language === 'fr' ? 'mois' : 'months'}</div>
                            <p className="text-xs text-slate-500 mt-1">{language === 'fr' ? 'Taille du jeu de données aligné' : 'Aligned dataset size'}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <BarChart3 className="h-3 w-3 text-purple-400" />
                                {language === 'fr' ? 'Horizon' : 'Horizon'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">
                                {Math.round(settings?.horizonMonths / 12)} {language === 'fr' ? 'ans' : 'years'}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{settings?.horizonMonths} {language === 'fr' ? 'mois' : 'months'}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* 2. History Insight (shown first) */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl text-emerald-400">
                            <FileSpreadsheet className="h-6 w-6" />
                            {language === 'fr' ? 'Historique des Données' : 'Data History Insight'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-slate-950 rounded-lg overflow-x-auto border border-slate-800">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="border-b border-slate-700 text-slate-400">
                                        <th className="px-4 py-3">{language === 'fr' ? 'Instrument' : 'Instrument'}</th>
                                        <th className="px-4 py-3 text-center">{language === 'fr' ? 'Date Début' : 'Start Date'}</th>
                                        <th className="px-4 py-3 text-center">{language === 'fr' ? 'Date Fin' : 'End Date'}</th>
                                        <th className="px-4 py-3 text-center">{language === 'fr' ? 'Mois' : 'Months'}</th>
                                        <th className="px-4 py-3">{language === 'fr' ? 'Intégrité' : 'Data Integrity'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assetStats?.map(asset => (
                                        <tr key={asset.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-300">{asset.name}</div>
                                                <div className="text-[10px] text-slate-500 italic">({asset.portfolioName})</div>
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-xs">{asset.startDate}</td>
                                            <td className="px-4 py-3 text-center font-mono text-xs">{asset.endDate}</td>
                                            <td className="px-4 py-3 text-center text-blue-400 font-semibold">{asset.historyCount}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500"
                                                            style={{ width: `${Math.min(100, (asset.historyCount / 300) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">{language === 'fr' ? 'Vérifié' : 'Verified'}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Asset Characteristics (shown second) */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl text-blue-400">
                            <LayoutDashboard className="h-6 w-6" />
                            {language === 'fr' ? 'Caractéristiques des Instruments' : 'Instrument Characteristics'}
                        </CardTitle>
                        <p className="text-xs text-slate-500 italic mt-1">
                            ({language === 'fr'
                                ? 'basé sur les périodes et données historiques mentionnées ci-dessus'
                                : 'based on the historical periods and data mentioned above'})
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-slate-950 rounded-lg overflow-x-auto border border-slate-800">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="border-b border-slate-700 text-slate-400 italic">
                                        <th className="px-4 py-3">ID / Name</th>
                                        <th className="px-4 py-3">Asset Class</th>
                                        <th className="px-4 py-3 text-center">Currency</th>
                                        <th className="px-4 py-3 text-right">Avg Return (μ)</th>
                                        <th className="px-4 py-3 text-right">Volatility (σ)</th>
                                        <th className="px-4 py-3 text-right">Max Drawdown</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assetStats?.map(asset => (
                                        <tr key={asset.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-white">{asset.name}</div>
                                                <div className="text-xs text-slate-500 font-mono italic">
                                                    {asset.portfolioName || asset.id}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                                    {asset.assetClass}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="font-mono text-emerald-400/90 text-xs flex items-center justify-center gap-1">
                                                    <Coins className="h-3 w-3" />
                                                    {asset.quotationCurrency}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-green-400 font-semibold">{asset.meanReturnAnnual.toFixed(2)}%</td>
                                            <td className="px-4 py-3 text-right text-red-400/80">{asset.volatilityAnnual.toFixed(2)}%</td>
                                            <td className="px-4 py-3 text-right text-amber-500/80"><div className="font-semibold">{asset.maxDrawdown.toFixed(2)}%</div>{asset.maxDrawdownPeriod && (<div className="text-[10px] text-slate-500 italic mt-0.5">{asset.maxDrawdownPeriod}</div>)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Matrices */}
                <div className="grid md:grid-cols-1 gap-8">
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-xl text-indigo-400">
                                <Sigma className="h-6 w-6" />
                                {language === 'fr' ? 'Relations Statistique' : 'Statistical Relationships'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {corrMatrix && (
                                <MatrixTable
                                    matrix={corrMatrix}
                                    title={language === 'fr' ? 'Matrice de Corrélation' : 'Correlation Matrix (p)'}
                                    type="correlation"
                                />
                            )}

                            {stats.covMatrix && (
                                <MatrixTable
                                    matrix={stats.covMatrix}
                                    title={language === 'fr' ? 'Matrice de Covariance' : 'Covariance Matrix (Σ)'}
                                    type="covariance"
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Summary Card */}
                <Card className="bg-blue-500/5 border-blue-500/20">
                    <CardContent className="pt-6">
                        <div className="flex gap-4 items-start">
                            <Info className="h-6 w-6 text-blue-400 shrink-0" />
                            <div className="space-y-2">
                                <h4 className="font-semibold text-blue-300 uppercase tracking-widest text-xs">
                                    Interpretation Note
                                </h4>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    {language === 'fr'
                                        ? "Ces statistiques sont calculées sur la base des rendements logarithmiques historiques (Log Returns). La simulation utilise le modèle GBM (Geometric Brownian Motion) avec rééquilibrage annuel. La matrice de corrélation assure que les mouvements d'actifs sont synchronisés de manière réaliste."
                                        : "These statistics are calculated based on historical Log Returns. The simulation utilizes the GBM (Geometric Brownian Motion) model with annual rebalancing. The correlation matrix ensures that asset movements are realistically synchronized."}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
};

export default MonteCarloDetails;
