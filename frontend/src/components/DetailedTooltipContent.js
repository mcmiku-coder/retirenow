import React from 'react';

const DetailedTooltipContent = ({ data, language, isPdf = false }) => {
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
                        <div className="flex items-center gap-2 font-bold text-gray-100 border-l border-gray-600 pl-4">
                            <span className={labelClass}>MC-P5</span>
                            <span className="text-blue-400">{Math.round(data.mc5).toLocaleString()} CHF</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-6 mb-2 mt-3">
                <div className="flex-1">
                    <p className={`font-semibold text-green-600 mb-1 ${borderClass} pb-1`}>{language === 'fr' ? 'Revenus (CHF)' : 'Income (CHF)'}</p>
                    {Object.entries(data.incomeBreakdown || {}).map(([name, val]) => (
                        <div key={name} className="flex justify-between gap-4">
                            <span>{name}</span>
                            <span>{Math.round(val).toLocaleString()}</span>
                        </div>
                    ))}
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
                    {Object.entries(data.costBreakdown || {}).map(([name, val]) => (
                        <div key={name} className="flex justify-between gap-4">
                            <span>{name}</span>
                            <span>{Math.round(val).toLocaleString()}</span>
                        </div>
                    ))}
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
