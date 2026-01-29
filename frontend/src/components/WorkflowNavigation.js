import { useNavigate, useLocation } from 'react-router-dom';
import { User, CalendarClock, Wallet, CreditCard, PiggyBank, Landmark, Sliders, LineChart, Scale, Home } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const WorkflowNavigation = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLanguage();

    const steps = [
        { path: '/personal-info', icon: User, id: 1, labelKey: 'personalInfo.title' },
        { path: '/retirement-overview', icon: CalendarClock, id: 2, labelKey: 'retirementOverview.title' },
        { path: '/income', icon: Wallet, id: 3, labelKey: 'income.title' },
        {
            path: '/costs',
            icon: CreditCard,
            id: 4,
            labelKey: 'costs.title',
            branch: { path: '/real-estate', icon: Home, labelKey: 'Real Estate' }
        },
        { path: '/assets-savings', icon: PiggyBank, id: 5, labelKey: 'assetsAndSavings.title' },
        { path: '/retirement-inputs', icon: Landmark, id: 6, labelKey: 'retirementInputs.title' },
        {
            path: '/data-review',
            icon: Sliders,
            id: 7,
            labelKey: 'infoPage.step7Title',
            branch: { path: '/capital-setup', icon: LineChart, labelKey: 'infoPage.step8Title' }
        },
        { path: '/result', icon: Scale, id: 8, labelKey: 'result.title' },
    ];

    // Find current step index (checking main path or branch path)
    const currentIndex = steps.findIndex(step =>
        step.path === location.pathname || (step.branch && step.branch.path === location.pathname)
    );

    // Check if we are currently on a branch page
    const isCurrentOnBranch = steps.some(step => step.branch && step.branch.path === location.pathname);

    const handleStepClick = (path) => {
        navigate(path);
    };

    return (
        <div className="w-full flex items-center justify-center">
            <div className="flex flex-wrap items-start justify-center md:flex-nowrap pt-2">
                {steps.map((step, index) => {
                    const Icon = step.icon;
                    // Active state logic:
                    // If strictly on parent path -> parent active
                    // If strictly on branch path -> branch active
                    // If on branch, parent is NOT active (visual choice, or maybe partially active?)
                    // Let's keep it simple: exact match highlights the specific bubble.

                    const isParentActive = step.path === location.pathname;
                    const isBranchActive = step.branch && step.branch.path === location.pathname;

                    const isActive = isParentActive || isBranchActive; // Generally "active step" for connector logic
                    const isPast = index < currentIndex;

                    return (
                        <div key={step.id} className="flex items-center">
                            {/* Connector Line (except for first item) */}
                            {index > 0 && (
                                <div className={`h-0.5 w-6 sm:w-10 ${isPast || isActive ? 'bg-primary/50' : 'bg-muted'}`} />
                            )}

                            {/* Main Icon Button + Vertical Branch Wrapper */}
                            <div className="flex flex-col items-center relative">
                                {/* Main Icon Bubble */}
                                <button
                                    onClick={() => handleStepClick(step.path)}
                                    className={`
                                        relative flex items-center justify-center rounded-lg transition-all duration-300
                                        ${isParentActive
                                            ? 'w-10 h-10 sm:w-11 sm:h-11 bg-primary text-primary-foreground shadow-md scale-105 z-10'
                                            : 'w-8 h-8 sm:w-9 sm:h-9 bg-muted text-muted-foreground hover:bg-muted/80'
                                        }
                                        ${isPast && !isBranchActive ? 'text-primary' : ''}
                                    `}
                                    title={t(step.labelKey).replace(/^\d+\.\s*/, '')}
                                >
                                    <Icon className={`${isParentActive ? 'h-5 w-5 sm:h-6 sm:w-6' : 'h-4 w-4 sm:h-5 sm:w-5'}`} />

                                    {/* Step Number Badge (only on parent, if parent is active) */}
                                    {isParentActive && (
                                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-5 sm:h-5 bg-background text-foreground text-[10px] font-bold rounded-full border border-primary flex items-center justify-center">
                                            {step.id}
                                        </span>
                                    )}
                                </button>

                                {/* Vertical Branch (Spin-off) */}
                                {step.branch && (
                                    <div className="absolute top-full flex flex-col items-center z-0">
                                        {/* Vertical Connector - slight negative margin to ensure overlap */}
                                        <div className={`w-0.5 h-4 -mt-1 ${isBranchActive ? 'bg-primary' : 'bg-muted'}`} />

                                        {/* Branch Icon Bubble */}
                                        <button
                                            onClick={() => handleStepClick(step.branch.path)}
                                            className={`
                                                relative flex items-center justify-center rounded-lg transition-all duration-300
                                                ${isBranchActive
                                                    ? 'w-10 h-10 sm:w-11 sm:h-11 bg-primary text-primary-foreground shadow-md scale-105 z-10'
                                                    : 'w-8 h-8 sm:w-9 sm:h-9 bg-muted text-muted-foreground hover:bg-muted/80'
                                                }
                                            `}
                                            title={step.branch.labelKey}
                                        >
                                            <step.branch.icon className={`${isBranchActive ? 'h-5 w-5 sm:h-6 sm:w-6' : 'h-4 w-4 sm:h-5 sm:w-5'}`} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WorkflowNavigation;
