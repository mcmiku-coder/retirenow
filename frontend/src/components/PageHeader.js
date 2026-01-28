import React from 'react';

const PageHeader = ({ title, subtitle, leftContent, rightContent }) => {
  return (
    <div className="w-full border-y border-blue-600/60 py-6 mb-10 bg-background/50 backdrop-blur-sm">
      <div className="w-full max-w-7xl mx-auto px-6 relative flex items-center justify-center min-h-[48px]">
        {leftContent && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 pl-6">
            {leftContent}
          </div>
        )}
        <div className="text-center px-24">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight font-sans">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg text-slate-400 mt-2 max-w-3xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {rightContent && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 pr-6">
            {rightContent}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
