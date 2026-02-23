import React from 'react';

const DetailedTooltipContent = ({ data, language, isPdf = false, p1Name, p2Name }) => {
    if (!data) return null;

    // Adjust styles for PDF mode vs Web mode
    const containerClass = isPdf
        ? "bg-white text-black p-3 rounded shadow-lg border border-gray-300 text-xs w-full min-w-[650px]"
        : "bg-gray-800 text-white p-3 rounded shadow-lg border border-gray-700 text-xs w-full min-w-[690px]";

    const headerClass = isPdf
        ? "flex justify-between items-center bg-gray-100 p-2 -mx-3 -mt-3 mb-2 border-b border-gray-300 rounded-t"
        : "flex justify-between items-center bg-gray-900/50 p-2 -mx-3 -mt-3 mb-2 border-b border-gray-700 rounded-t";

    const headerTextClass = isPdf ? "font-bold text-sm text-gray-800 pl-1" : "font-bold text-sm text-gray-100 pl-1";

    const labelClass = isPdf ? "text-gray-600 font-normal" : "text-gray-400 font-normal";
    const borderClass = isPdf ? "border-b border-gray-300" : "border-b border-gray-600";
    const topBorderClass = isPdf ? "border-t border-gray-300" : "border-t border-gray-600";

    const renderItemWithBadge = (rawKey, val) => {
        const [displayName, personType] = rawKey.split('@@');

        let badge = null;
        if (personType === 'p1') {
            badge = (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ml-2 ${isPdf ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                    {p1Name || 'Max'}
                </span>
            );
        } else if (personType === 'p2') {
            badge = (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ml-2 ${isPdf ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    }`}>
                    {p2Name || 'Mary'}
                </span>
            );
        } else if (personType === 'shared') {
            badge = (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ml-2 ${isPdf ? 'bg-gray-100 text-gray-700 border border-gray-200' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                    {language === 'fr' ? 'Commun' : 'Shared'}
                </span>
            );
        } else if (personType === 'consolidated') {
            badge = (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ml-2 ${isPdf ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                    {language === 'fr' ? 'Consolidé' : 'Consolidated'}
                </span>
            );
        }

        return (
            <div key={rawKey} className="flex justify-between gap-4 items-center">
                <div className="flex items-center overflow-hidden">
                    <span className="truncate">{displayName}</span>
                    {badge}
                </div>
                <span className="shrink-0">{Math.round(val).toLocaleString()}</span>
            </div>
        );
    };

    return (
        <div className={containerClass}>
            {/* Header Row: Year left, Baseline/MC-P5 right */}
            <div className={headerClass}>
                <p className={headerTextClass}>
                    {language === 'fr' ? `Fin de l'année ${data.year}` : `End of year ${data.year}`}
                </p>

                <div className="flex gap-8">
                    <div className="flex items-center gap-2 font-bold text-gray-100">
                        <span className={labelClass}>{language === 'fr' ? 'Base line' : 'Base line'}</span>
                        <span className="text-yellow-500">{Math.round(data.cumulativeBalance).toLocaleString()} CHF</span>
                    </div>
                    {data.mc5 !== undefined && (
                        <div className="flex flex-col border-l border-gray-600 pl-4">
                            <div className="flex items-center gap-2 font-bold text-gray-100">
                                <span className={labelClass}>MC-P5</span>
                                <span className="text-blue-400">{Math.round(data.mc5).toLocaleString()} CHF</span>
                            </div>
                            {data.mc5_realized > 0 && (
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                    <span>({language === 'fr' ? 'Inv:' : 'Inv:'} {Math.round(data.mc5_invested || 0).toLocaleString()} + {language === 'fr' ? 'Réalisé:' : 'Realized:'} {Math.round(data.mc5_realized).toLocaleString()})</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-6 mb-2 mt-3">
                <div className="flex-1">
                    <p className={`font-semibold text-green-600 mb-1 ${borderClass} pb-1`}>{language === 'fr' ? 'Revenus (CHF)' : 'Income (CHF)'}</p>
                    {Object.entries(data.incomeBreakdown || {}).map(([name, val]) => renderItemWithBadge(name, val))}
                    {data.activatedOwnings > 0 && (
                        <div className="flex justify-between gap-4 text-pink-500 font-medium">
                            <span>{language === 'fr' ? 'Avoirs activés' : 'Activated Ownings'}</span>
                            <span>{Math.round(data.activatedOwnings).toLocaleString()}</span>
                        </div>
                    )}
                    <div className={`${topBorderClass} mt-1 pt-1 flex justify-between font-bold`}>
                        <span>Total</span>
                        <span>{Math.round(data.income + (data.activatedOwnings || 0)).toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex-1">
                    <p className={`font-semibold text-red-500 mb-1 ${borderClass} pb-1`}>{language === 'fr' ? 'Dépenses (CHF)' : 'Costs (CHF)'}</p>
                    {Object.entries(data.costBreakdown || {}).map(([name, val]) => renderItemWithBadge(name, val))}
                    <div className={`${topBorderClass} mt-1 pt-1 flex justify-between font-bold`}>
                        <span>Total</span>
                        <span>{Math.round(data.costs).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Balance Section */}
            <div className={`${topBorderClass} mt-4 pt-3 flex flex-col gap-1`}>
                <p className="font-bold text-gray-300">
                    {language === 'fr' ? `${data.year} Balance (CHF)` : `${data.year} Balance (CHF)`}
                </p>
                <p className={`text-sm font-bold ${data.annualBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {Math.round(data.annualBalance).toLocaleString()}
                </p>
            </div>
        </div>
    );
};

export default DetailedTooltipContent;
