import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../utils/apiConfig';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';


const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verify = async () => {
            const token = searchParams.get('token');
            if (!token) {
                setStatus('error');
                setMessage(t('auth.verificationFailed'));
                return;
            }

            try {
                await axios.post(`${API_BASE_URL}/api/auth/verify`, { token });
                setStatus('success');
                setMessage(t('auth.verificationSuccess'));
            } catch (error) {
                console.error('Verification failed', error);
                setStatus('error');
                setMessage(error.response?.data?.detail || t('auth.verificationFailed'));
            }
        };

        verify();
    }, [searchParams, t]);

    return (
        <div className="flex-grow flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-card border rounded-lg p-8 text-center shadow-lg">
                {status === 'verifying' && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                        <h2 className="text-xl font-semibold">{t('auth.verifying')}</h2>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-4">
                        <CheckCircle className="h-16 w-16 text-green-500" />
                        <h2 className="text-2xl font-bold text-green-600">{t('common.success')}</h2>
                        <p className="text-muted-foreground">{message}</p>
                        <Button
                            className="mt-4 w-full"
                            onClick={() => navigate('/')}
                        >
                            {t('auth.loginBtn')}
                        </Button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center gap-4">
                        <XCircle className="h-16 w-16 text-red-500" />
                        <h2 className="text-2xl font-bold text-red-600">{t('common.error')}</h2>
                        <p className="text-muted-foreground">{message}</p>
                        <Button
                            variant="outline"
                            className="mt-4 w-full"
                            onClick={() => navigate('/')}
                        >
                            {t('nav.home')}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
