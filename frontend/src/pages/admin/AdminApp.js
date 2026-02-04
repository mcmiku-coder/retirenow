import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminInstruments from './AdminInstruments';
import AdminTemplates from './AdminTemplates';
import AdminConfigPage from './AdminConfigPage';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

/**
 * AdminApp - Admin section wrapper with token-based authentication
 * 
 * Manages admin authentication using JWT tokens.
 * Admins are regular users with role="admin".
 */
export default function AdminApp() {
    const [token, setToken] = useState(null);
    const [adminUser, setAdminUser] = useState(null);
    const [stats, setStats] = useState(null);

    const handleLogin = (authToken, user) => {
        setToken(authToken);
        setAdminUser(user);
        // Store in sessionStorage for persistence during session
        sessionStorage.setItem('admin_token', authToken);
        sessionStorage.setItem('admin_user', JSON.stringify(user));
    };

    const handleLogout = () => {
        setToken(null);
        setAdminUser(null);
        setStats(null);
        sessionStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_user');
    };

    // Check for existing session on mount
    useEffect(() => {
        const storedToken = sessionStorage.getItem('admin_token');
        const storedUser = sessionStorage.getItem('admin_user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setAdminUser(JSON.parse(storedUser));
        }
    }, []);

    // Fetch stats when token is available
    useEffect(() => {
        if (token) {
            fetchStats();
        }
    }, [token]);

    const fetchStats = async () => {
        try {
            const response = await axios.post(
                `${BACKEND_URL}/api/admin/stats`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    // If not authenticated, show login
    if (!token || !adminUser) {
        return (
            <Routes>
                <Route path="/*" element={<AdminLogin onLogin={handleLogin} />} />
            </Routes>
        );
    }

    // If authenticated, show admin layout with routes
    return (
        <AdminLayout onLogout={handleLogout} adminUser={adminUser}>
            <Routes>
                <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/dashboard" element={<AdminDashboard token={token} adminUser={adminUser} stats={stats} />} />
                <Route path="/users" element={<AdminUsers token={token} adminUser={adminUser} />} />
                <Route path="/instruments" element={<AdminInstruments token={token} adminUser={adminUser} />} />
                <Route path="/templates" element={<AdminTemplates />} />
                <Route path="/config" element={<AdminConfigPage />} />
            </Routes>
        </AdminLayout>
    );
}
