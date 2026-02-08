import React from 'react';

const DetailedTooltipContent = ({ data, language, isPdf = false }) => {
    if (!data) return null;

    // Adjust styles for PDF mode vs Web mode
    const containerClass = isPdf
        ? "bg-white text-black p-3 rounded shadow-lg border border-gray-300 text-xs w-full"
        : "bg-gray-800 text-white p-3 rounded shadow-lg border border-gray-700 text-xs w-full";

    const headerClass = isPdf
        ? "flex justify-between items-center bg-gray-100 p-2 -mx-3 -mt-3 mb-2 border-b border-gray-300 rounded-t"
        : "flex justify-between items-center bg-gray-900/50 p-2 -mx-3 -mt-3 mb-2 border-b border-gray-700 rounded-t";

    const headerTextClass = isPdf ? "font-bold text-sm text-gray-800 pl-1" : "font-bold text-sm text-gray-100 pl-1";

    const labelClass = isPdf ? "text-gray-600 font-normal" : "text-gray-400 font-normal";
    const borderClass = isPdf ? "border-b border-gray-300" : "border-b border-gray-600";
    const topBorderClass = isPdf ? "border-t border-gray-300" : "border-t border-gray-600";


    return (
        <div className={containerClass}>
            {/* Header Row: Year left, Balances right */}
            <div className={headerClass}>
                <p className={headerTextClass}>{language === 'fr' ? `Année ${data.year}` : `Year ${data.year}`}</p>

                <div className="flex gap-4">
                    <div className={`flex items-center gap-2 font-bold ${data.annualBalance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        <span className={labelClass}>{language === 'fr' ? 'Annuel:' : 'Annual:'}</span>
                        <span>{Math.round(data.annualBalance || (data.income - data.costs)).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 font-bold text-blue-500">
                        <span className={labelClass}>{language === 'fr' ? 'Cumulé:' : 'Cumul:'}</span>
                        <span>{Math.round(data.cumulativeBalance).toLocaleString()}</span>
                    </div>
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
        </div>
    );
};

export default DetailedTooltipContent;
