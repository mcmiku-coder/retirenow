import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import PageHeader from '../../components/PageHeader';
import { toast } from 'sonner';
import { Users, Shield, Trash2, Check, X, MapPin } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL;

// Helper function to format date/time
const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    try {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return isoString;
    }
};

// Helper function to format page name
const formatPageName = (path) => {
    if (!path) return '-';
    const pageNames = {
        '/': 'Home',
        '/information': 'Info',
        '/personal-info': 'Personal Info',
        '/retirement-overview': 'Retirement',
        '/income': 'Income',
        '/costs': 'Costs',
        '/scenario': 'Scenario',
        '/result': 'Result',
        '/scenario-result': 'Result'
    };
    return pageNames[path] || path;
};

/**
 * AdminUsers - User management page
 * 
 * Shows registered users with stats and delete functionality
 */
export default function AdminUsers({ token }) {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // Get users
            const usersResponse = await axios.post(`${BACKEND_URL}/api/admin/users`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(usersResponse.data.users || []);

            // Get stats
            const statsResponse = await axios.post(`${BACKEND_URL}/api/admin/stats`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(statsResponse.data);
        } catch (error) {
            console.error('Load data error:', error);
            const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
            toast.error(`Failed to load data: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId, email) => {
        if (!window.confirm(`Are you sure you want to delete user ${email}? This action cannot be undone.`)) {
            return;
        }

        try {
            await axios.delete(`${BACKEND_URL}/api/admin/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('User deleted successfully');
            // Remove user from local state immediately
            setUsers(users.filter(u => u.user_id !== userId));
            // Reload stats
            loadData();
        } catch (error) {
            console.error('Delete error:', error);
            toast.error(error.response?.data?.detail || 'Failed to delete user');
        }
    };

    const handleToggleAdmin = async (userId, currentRole, email) => {
        const action = currentRole === 'admin' ? 'remove admin rights from' : 'promote to admin';
        if (!window.confirm(`Are you sure you want to ${action} ${email}?`)) {
            return;
        }

        try {
            const response = await axios.post(
                `${BACKEND_URL}/api/admin/users/${userId}/toggle-admin`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success(response.data.message);
            // Reload data to reflect changes
            loadData();
        } catch (error) {
            console.error('Toggle admin error:', error);
            toast.error(error.response?.data?.detail || 'Failed to update user role');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen py-12 px-4">
                <div className="w-full max-w-[95%] mx-auto">
                    <PageHeader title="Users" subtitle="Loading..." />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12 px-4">
            <div className="w-full max-w-[95%] mx-auto">
                <PageHeader
                    title="User Management"
                    subtitle="View and manage registered users"
                />

                {/* Stats Cards */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Registered Users
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats?.total_users || 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Database
                            </CardTitle>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-medium">{stats?.database || 'N/A'}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Users Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Registered Users ({users.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {users.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                No users registered yet
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="text-left p-3 font-semibold">#</th>
                                            <th className="text-left p-3 font-semibold">Email</th>
                                            <th className="text-center p-3 font-semibold">Admin</th>
                                            <th className="text-left p-3 font-semibold">Created</th>
                                            <th className="text-center p-3 font-semibold">Logins</th>
                                            <th className="text-left p-3 font-semibold">Last Login</th>
                                            <th className="text-left p-3 font-semibold">Info (IP/Loc)</th>
                                            <th className="text-center p-3 font-semibold">Pages</th>
                                            <th className="text-left p-3 font-semibold">Last Page</th>
                                            <th className="text-left p-3 font-semibold">Deepest Page</th>
                                            <th className="text-center p-3 font-semibold">Verified</th>
                                            <th className="text-right p-3 font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user, index) => (
                                            <tr key={user.user_id} className="border-b hover:bg-muted/30">
                                                <td className="p-3 text-muted-foreground">{index + 1}</td>
                                                <td className="p-3 font-medium">{user.email}</td>
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={user.role === 'admin'}
                                                        onChange={() => handleToggleAdmin(user.user_id, user.role, user.email)}
                                                        className="h-4 w-4 cursor-pointer accent-primary"
                                                        title={user.role === 'admin' ? 'Remove admin rights' : 'Promote to admin'}
                                                    />
                                                </td>
                                                <td className="p-3 text-muted-foreground text-xs">
                                                    {user.created_at ? formatDateTime(user.created_at) : '-'}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                                                        {user.login_count || 0}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-muted-foreground text-xs">
                                                    {user.last_login ? formatDateTime(user.last_login) : '-'}
                                                </td>
                                                <td className="p-3 text-xs">
                                                    <div className="flex flex-col gap-1">
                                                        {user.last_ip && <span className="text-muted-foreground">IP: {user.last_ip}</span>}
                                                        {user.last_location && (
                                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                                <MapPin className="h-3 w-3" />
                                                                <span>{user.last_location}</span>
                                                            </div>
                                                        )}
                                                        {user.last_device_type && (
                                                            <span className={`inline-flex w-fit items-center px-1.5 py-0.5 rounded ${user.last_device_type === 'Mobile' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-300'}`}>
                                                                {user.last_device_type}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center font-mono text-xs">
                                                    {user.total_pages_viewed || 0}
                                                </td>
                                                <td className="p-3">
                                                    {user.last_page_visited ? (
                                                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded">
                                                            {formatPageName(user.last_page_visited)}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="p-3">
                                                    {user.deepest_page ? (
                                                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-400 rounded">
                                                            {formatPageName(user.deepest_page)}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {user.is_verified ? (
                                                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                                                    ) : (
                                                        <X className="h-5 w-5 text-red-500 mx-auto" opacity={0.5} />
                                                    )}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDeleteUser(user.user_id, user.email)}
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Security Notice */}
                <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                        <strong>🔒 Security Note:</strong> User financial data (income, costs, savings) is encrypted
                        client-side with each user's password. As administrator, you can only see email addresses -
                        financial data remains private and inaccessible (zero-knowledge encryption).
                    </p>
                </div>
            </div>
        </div>
    );
}
