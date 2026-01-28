import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

/**
 * AdminLogin - Email/Password Authentication for Admin Access
 * 
 * Replaces the old admin key system with proper user authentication.
 * Admins are regular users with role="admin" in the database.
 */
export default function AdminLogin({ onLogin }) {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Login with email/password
            const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
                email,
                password
            });

            const { token, role, email: userEmail } = response.data;

            // Check if user is admin
            if (role !== 'admin') {
                toast.error('Admin access required. This account does not have admin privileges.');
                setLoading(false);
                return;
            }

            // Store admin session
            onLogin(token, { email: userEmail, role });
            toast.success('Admin login successful!');

        } catch (error) {
            console.error('Admin login error:', error);
            if (error.response?.status === 403) {
                toast.error('Admin access required');
            } else {
                toast.error(error.response?.data?.detail || 'Login failed');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Lock className="h-8 w-8 text-primary" />
                        <h1 className="text-3xl font-bold">Admin Access</h1>
                    </div>
                    <p className="text-muted-foreground">
                        Sign in with your admin account
                    </p>
                </div>

                {/* Login Form */}
                <div className="bg-card border rounded-lg p-8 shadow-lg">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email Input */}
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <div className="relative mt-2">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@example.com"
                                    required
                                    className="pl-10"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <Label htmlFor="password">Password</Label>
                            <div className="relative mt-2">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    className="pl-10 pr-10"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In as Admin'}
                        </Button>
                    </form>

                    {/* Back to Home */}
                    <div className="mt-6 text-center">
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/')}
                            className="text-sm"
                        >
                            ← Back to Home
                        </Button>
                    </div>
                </div>

                {/* Info Box */}
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
                    <p className="text-sm text-blue-200">
                        <strong>Note:</strong> Admin accounts are regular user accounts with elevated privileges.
                        If you don't have an admin account, contact the system administrator.
                    </p>
                </div>
            </div>
        </div>
    );
}
