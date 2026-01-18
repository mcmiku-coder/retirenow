import React from 'react';
import { Home } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const RealEstate = () => {
    return (
        <div className="min-h-screen py-6">
            <div className="max-w-[1400px] mx-auto mb-6 px-4">
            </div>

            <PageHeader
                title="Housing Expenses Calculator"
                subtitle="Detailed side calculation for Rent/Mortgage"
            />

            <div className="max-w-4xl mx-auto px-4 text-center mt-12">
                <div className="bg-card border rounded-lg p-8 shadow-sm inline-block">
                    <Home className="w-16 h-16 text-primary mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Calculator Coming Soon</h2>
                    <p className="text-muted-foreground">This spin-off feature is currently under development.</p>
                </div>
            </div>
        </div>
    );
};

export default RealEstate;
