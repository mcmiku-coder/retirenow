
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const ForgotPassword = () => {
    const { language } = useLanguage();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/api/auth/request-password-reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            // Always show success to prevent email enumeration
            setSubmitted(true);
            toast.success(language === 'fr'
                ? 'Un lien de réinitialisation a été envoyé si l\'adresse existe.'
                : 'A reset link has been sent if the email exists.');

        } catch (error) {
            console.error('Password reset request error:', error);
            // Even on error, we might want to show success or a generic error
            toast.error(language === 'fr'
                ? 'Une erreur est survenue.'
                : 'An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>{language === 'fr' ? 'Email Envoyé' : 'Email Sent'}</CardTitle>
                        <CardDescription>
                            {language === 'fr'
                                ? 'Vérifiez votre boîte de réception. Si un compte existe avec cette adresse, vous recevrez un lien de réinitialisation.'
                                : 'Check your inbox. If an account exists with this address, you will receive a reset link.'}
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

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>{language === 'fr' ? 'Mot de passe oublié' : 'Forgot Password'}</CardTitle>
                    <CardDescription>
                        {language === 'fr'
                            ? 'Entrez votre email pour recevoir un lien de réinitialisation.'
                            : 'Enter your email to receive a reset link.'}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading ? '...' : (language === 'fr' ? 'Envoyer le lien' : 'Send Link')}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full"
                            type="button"
                            onClick={() => navigate('/')}
                        >
                            {language === 'fr' ? 'Annuler' : 'Cancel'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default ForgotPassword;
