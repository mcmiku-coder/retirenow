import React from 'react';
import { Input } from './ui/input';

const DateInputWithShortcuts = ({
    value,
    onChange,
    retirementDate,
    legalDate,
    deathDate,
    mode = 'start', // 'start' or 'end'
    className,
    ...props
}) => {
    const getToday = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const setDate = (date) => {
        // Replicates the event object structure expected by onChange handlers
        onChange({ target: { value: date } });
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <Input
                type="date"
                value={value || ''}
                onChange={onChange}
                className="w-[140px]"
                {...props}
            />
            <div className="flex gap-1 items-center shrink-0">
                {mode === 'start' && (
                    <button
                        onClick={() => setDate(getToday())}
                        className="flex items-center justify-center w-6 h-6 text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-bold transition-colors"
                        title="Today"
                        type="button"
                    >
                        T
                    </button>
                )}

                <button
                    onClick={() => setDate(legalDate)}
                    className="flex items-center justify-center w-6 h-6 text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded font-bold transition-colors"
                    title={`Legal Retirement: ${legalDate}`}
                    type="button"
                >
                    LR
                </button>

                {retirementDate && (
                    <button
                        onClick={() => setDate(retirementDate)}
                        className="flex items-center justify-center w-6 h-6 text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded font-bold transition-colors"
                        title={`Selected Retirement: ${retirementDate}`}
                        type="button"
                    >
                        SR
                    </button>
                )}

                {mode === 'end' && deathDate && (
                    <button
                        onClick={() => setDate(deathDate)}
                        className="flex items-center justify-center w-6 h-6 text-[10px] bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 border border-slate-500/30 rounded font-bold transition-colors"
                        title={`Estimated Death Date: ${deathDate}`}
                        type="button"
                    >
                        D
                    </button>
                )}
            </div>
        </div>
    );
};

export default DateInputWithShortcuts;
