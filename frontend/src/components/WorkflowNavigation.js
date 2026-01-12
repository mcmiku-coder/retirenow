import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Calendar, Wallet, PiggyBank, LineChart, Sliders, Target, FileText, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const WorkflowNavigation = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { language } = useLanguage();

    const steps = [
        { path: '/personal-info', icon: User, id: 1 },
        { path: '/retirement-overview', icon: Calendar, id: 2 },
        { path: '/income', icon: Wallet, id: 3 },
        { path: '/costs', icon: PiggyBank, id: 4 },
        { path: '/financial-balance', icon: LineChart, id: 5 },
        { path: '/retirement-inputs', icon: Sliders, id: 6 },
        { path: '/scenario', icon: Target, id: 7 },
        { path: '/result', icon: FileText, id: 8 },
    ];

    // Find current step index
    const currentIndex = steps.findIndex(step => step.path === location.pathname);

    const handleStepClick = (path, index) => {
        // Only allow navigation to previous steps or the current step
        // Or if we are in a later step (e.g. result), we can go back to any previous
        // Actually, usually in these wizards you can go back to anything you've visited.
        // Making it simple: allow click on any step for now, assuming the user follows the flow.
        // If we want to restrict forward navigation, we could check if index <= currentIndex + 1
        // But for "jump to page if it was already filled" requirement, we might need state.
        // For now, let's allow all clicks, as the user requested "click on these icons to jump".
        navigate(path);
    };

    return (
        <div className="w-full max-w-6xl mx-auto px-4" style={{ marginTop: '20px', marginBottom: '30px' }}>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 md:flex-nowrap">
                {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === currentIndex;
                    const isPast = index < currentIndex;
                    const isFuture = index > currentIndex;

                    return (
                        <div key={step.id} className="flex items-center">
                            {/* Connector Line (except for first item) */}
                            {index > 0 && (
                                <div className={`h-0.5 w-4 sm:w-8 mx-1 sm:mx-2 ${isPast || isActive ? 'bg-primary/50' : 'bg-muted'
                                    }`} />
                            )}

                            {/* Icon Bubble */}
                            <button
                                onClick={() => handleStepClick(step.path, index)}
                                className={`
                  relative flex items-center justify-center rounded-xl transition-all duration-300
                  ${isActive
                                        ? 'w-12 h-12 sm:w-14 sm:h-14 bg-primary text-primary-foreground shadow-lg scale-110 z-10'
                                        : 'w-10 h-10 sm:w-12 sm:h-12 bg-muted text-muted-foreground hover:bg-muted/80'
                                    }
                  ${isPast ? 'text-primary' : ''}
                `}
                                title={`Step ${step.id}`}
                            >
                                <Icon className={`${isActive ? 'h-6 w-6 sm:h-8 sm:w-8' : 'h-5 w-5 sm:h-6 sm:w-6'}`} />

                                {/* Step Number Badge (for active only) */}
                                {isActive && (
                                    <span className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 bg-background text-foreground text-xs font-bold rounded-full border-2 border-primary flex items-center justify-center">
                                        {step.id}
                                    </span>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WorkflowNavigation;
