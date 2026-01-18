import React from 'react';

const PageHeader = ({ title, subtitle, rightContent }) => {
  return (
    <div className="w-full border-y border-primary/40 py-4 mb-6">
      <div className="w-[80%] mx-auto px-4 relative flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>
        {rightContent && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            {rightContent}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
