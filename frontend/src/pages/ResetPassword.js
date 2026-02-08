

import React, { useState } from 'react';
import { API_BASE_URL } from '../utils/apiConfig';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
    const { language } = useLanguage();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!token) {
        return (
            <div className="flex-grow bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-red-500">{language === 'fr' ? 'Lien Invalide' : 'Invalid Link'}</CardTitle>
                        <CardDescription>
                            {language === 'fr'
                                ? 'Le lien de réinitialisation est manquant ou invalide.'
                                : 'The reset link is missing or invalid.'}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full" onClick={() => navigate('/')}>
                            {language === 'fr' ? 'Retour à l\'accueil' : 'Return to Home'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error(language === 'fr' ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match');
            return;
        }

        if (password.length < 8) {
            toast.error(language === 'fr' ? 'Le mot de passe doit faire au moins 8 caractères' : 'Password must be at least 8 characters');
            return;
        }

        // ...

        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    new_password: password
                })
            });

            if (response.ok) {
                setSuccess(true);
                toast.success(language === 'fr' ? 'Mot de passe réinitialisé avec succès' : 'Password reset successfully');
            } else {
                const data = await response.json();
                toast.error(data.detail || (language === 'fr' ? 'Échec de la réinitialisation' : 'Reset failed'));
            }

        } catch (error) {
            console.error('Password reset error:', error);
            toast.error(language === 'fr' ? 'Une erreur est survenue' : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex-grow bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-green-500">{language === 'fr' ? 'Succès' : 'Success'}</CardTitle>
                        <CardDescription>
                            {language === 'fr'
                                ? 'Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.'
                                : 'Your password has been reset. You can now log in.'}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full" onClick={() => navigate('/')}>
                            {language === 'fr' ? 'Se connecter' : 'Log In'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex-grow bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>{language === 'fr' ? 'Réinitialiser le mot de passe' : 'Reset Password'}</CardTitle>
                    <CardDescription>
                        {language === 'fr'
                            ? 'Choisissez un nouveau mot de passe sécurisé.'
                            : 'Choose a new secure password.'}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">{language === 'fr' ? 'Nouveau mot de passe' : 'New Password'}</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={8}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm">{language === 'fr' ? 'Confirmer le mot de passe' : 'Confirm Password'}</Label>
                            <div className="relative">
                                <Input
                                    id="confirm"
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    minLength={8}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading ? '...' : (language === 'fr' ? 'Réinitialiser' : 'Reset Password')}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default ResetPassword;
