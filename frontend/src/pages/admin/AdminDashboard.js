import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { LayoutDashboard, Users, TrendingUp, Database } from 'lucide-react';
import PageHeader from '../../components/PageHeader';

/**
 * AdminDashboard - Overview page for admin section
 * 
 * Shows quick stats and navigation cards
 */
export default function AdminDashboard({ stats }) {
    const quickStats = [
        {
            label: 'Total Users',
            value: stats?.total_users || 0,
            icon: Users,
            color: 'text-blue-500'
        },
        {
            label: 'Instruments',
            value: stats?.total_instruments || 8,
            icon: TrendingUp,
            color: 'text-green-500'
        },
        {
            label: 'Database',
            value: stats?.database || 'MongoDB',
            icon: Database,
            color: 'text-purple-500'
        }
    ];

    return (
        <div className="min-h-screen py-12 px-4">
            <div className="w-full max-w-[95%] mx-auto">
                <PageHeader
                    title="Admin Dashboard"
                    subtitle='Overview of "Can I Quit?" service'
                />

                {/* Quick Stats */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    {quickStats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <Card key={stat.label}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {stat.label}
                                    </CardTitle>
                                    <Icon className={`h-4 w-4 ${stat.color}`} />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{stat.value}</div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Welcome Message */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LayoutDashboard className="h-5 w-5" />
                            Welcome to Admin Panel
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">
                            Use the navigation on the left to manage different aspects of the application:
                        </p>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-blue-500" />
                                <span><strong>Users:</strong> View and manage registered users</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-green-500" />
                                <span><strong>Instruments:</strong> Manage the global investment catalog</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Database className="h-4 w-4 text-purple-500" />
                                <span><strong>Templates:</strong> Coming soon</span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                {/* Security Notice */}
                <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                        <strong>🔒 Security Note:</strong> User financial data (income, costs, savings) is encrypted
                        client-side with each user's password. As administrator, you can only see email addresses and
                        usage statistics - financial data remains private and inaccessible (zero-knowledge encryption).
                    </p>
                </div>
            </div>
        </div>
    );
}
