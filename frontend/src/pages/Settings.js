
import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import PageHeader from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Download, Upload, ShieldCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { exportBackup, importBackup } from '../utils/backup';
import { Input } from '../components/ui/input';

const Settings = () => {
    const { user, masterKey } = useAuth();
    const { language } = useLanguage();
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    const handleExport = async () => {
        if (!user || !masterKey) return;
        setLoading(true);
        try {
            await exportBackup(user.email, masterKey);
            toast.success(language === 'fr' ? 'Sauvegarde téléchargée avec succès' : 'Backup downloaded successfully');
        } catch (error) {
            console.error(error);
            toast.error(language === 'fr' ? 'Échec de la sauvegarde' : 'Backup failed');
        } finally {
            setLoading(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (window.confirm(language === 'fr'
            ? 'Ceci écrasera toutes vos données actuelles. Êtes-vous sûr ?'
            : 'This will overwrite all your current data. Are you sure?')) {

            setLoading(true);
            try {
                await importBackup(file, user.email, masterKey);
                toast.success(language === 'fr' ? 'Données restaurées avec succès' : 'Data restored successfully');
                // Optional: Reload page to reflect changes
                setTimeout(() => window.location.reload(), 1500);
            } catch (error) {
                console.error(error);
                toast.error(language === 'fr'
                    ? 'Échec de la restauration (fichier invalide ou mauvaise clé)'
                    : 'Restore failed (invalid file or wrong key)');
            } finally {
                setLoading(false);
                // Clear input
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        } else {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex-grow bg-background pb-20">
            <PageHeader
                title={language === 'fr' ? 'Paramètres' : 'Settings'}
                subtitle={language === 'fr' ? 'Gérez vos données et votre compte' : 'Manage your data and account'}
            />

            <main className="container mx-auto px-6 py-8">
                <div className="grid gap-8 max-w-4xl mx-auto">

                    {/* Security Status Card */}
                    <Card className="border-green-500/20 bg-green-500/5">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="h-8 w-8 text-green-500" />
                                <div>
                                    <CardTitle className="text-xl">
                                        {language === 'fr' ? 'Sécurité Active' : 'Security Active'}
                                    </CardTitle>
                                    <CardDescription className="text-green-600/80">
                                        {language === 'fr'
                                            ? 'Vos données sont chiffrées de bout en bout avec votre clé maître.'
                                            : 'Your data is end-to-end encrypted with your master key.'}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Backup & Restore Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{language === 'fr' ? 'Sauvegarde et Restauration' : 'Backup & Restore'}</CardTitle>
                            <CardDescription>
                                {language === 'fr'
                                    ? 'Téléchargez une copie chiffrée de vos données ou restaurez une sauvegarde précédente.'
                                    : 'Download an encrypted copy of your data or restore from a previous backup.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Export */}
                                <div className="flex-1 p-6 border rounded-lg bg-muted/20 flex flex-col items-center text-center gap-4">
                                    <div className="p-3 bg-blue-500/10 rounded-full">
                                        <Download className="h-8 w-8 text-blue-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-medium text-lg">{language === 'fr' ? 'Exporter les données' : 'Export Data'}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {language === 'fr'
                                                ? 'Créez un fichier de sauvegarde chiffré.'
                                                : 'Create an encrypted backup file.'}
                                        </p>
                                    </div>
                                    <Button onClick={handleExport} disabled={loading} className="w-full mt-auto">
                                        {loading ? '...' : (language === 'fr' ? 'Télécharger la sauvegarde' : 'Download Backup')}
                                    </Button>
                                </div>

                                {/* Import */}
                                <div className="flex-1 p-6 border rounded-lg bg-muted/20 flex flex-col items-center text-center gap-4">
                                    <div className="p-3 bg-amber-500/10 rounded-full">
                                        <Upload className="h-8 w-8 text-amber-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-medium text-lg">{language === 'fr' ? 'Restaurer les données' : 'Restore Data'}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {language === 'fr'
                                                ? 'Importer depuis un fichier de sauvegarde.'
                                                : 'Import from a backup file.'}
                                        </p>
                                    </div>
                                    <div className="w-full mt-auto">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            accept=".json"
                                            className="hidden"
                                        />
                                        <Button onClick={handleImportClick} variant="outline" disabled={loading} className="w-full">
                                            {loading ? '...' : (language === 'fr' ? 'Importer une sauvegarde' : 'Import Backup')}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-amber-500/10 text-amber-600 rounded-md text-sm">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                <p>
                                    {language === 'fr'
                                        ? 'Note : Les fichiers de sauvegarde sont chiffrés avec votre clé actuelle. Vous ne pouvez les restaurer qu\'en étant connecté à ce compte.'
                                        : 'Note: Backup files are encrypted with your current key. You can only restore them while logged into this account.'}
                                </p>
                            </div>

                        </CardContent>
                    </Card>

                    {/* Account Section (Placeholders for Password Reset) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{language === 'fr' ? 'Compte' : 'Account'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground">
                                {language === 'fr' ? 'Connecté en tant que :' : 'Logged in as:'} <span className="font-medium text-foreground">{user?.email}</span>
                            </div>
                            {/* Future Password Reset Button can go here */}
                        </CardContent>
                    </Card>

                </div>
            </main>
        </div>
    );
};

export default Settings;
