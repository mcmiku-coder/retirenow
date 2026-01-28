import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import PageHeader from '../../components/PageHeader';
import { FileText } from 'lucide-react';

/**
 * AdminTemplates - Placeholder for future template management
 */
export default function AdminTemplates() {
    return (
        <div className="min-h-screen py-12 px-4">
            <div className="w-full max-w-[95%] mx-auto">
                <PageHeader
                    title="Templates"
                    subtitle="Template management (coming soon)"
                />

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Templates
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-12">
                            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
                            <p className="text-muted-foreground">
                                Template management functionality will be added here.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
