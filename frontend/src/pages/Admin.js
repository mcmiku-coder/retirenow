import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import PageHeader from '../components/PageHeader';
import { toast } from 'sonner';
import { ArrowLeft, Users, Shield, Eye, EyeOff } from 'lucide-react';
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

const Admin = () => {
  const navigate = useNavigate();
  const [adminKey, setAdminKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!adminKey.trim()) {
      toast.error('Please enter the admin key');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/admin/login`, {
        admin_key: adminKey
      });

      if (response.data.success) {
        setIsAuthenticated(true);
        toast.success('Admin access granted');
        // Load users and stats
        await loadData();
      }
    } catch (error) {
      toast.error('Invalid admin key');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      // Get users
      const usersResponse = await axios.post(`${BACKEND_URL}/api/admin/users`, {
        admin_key: adminKey
      });
      setUsers(usersResponse.data.users || []);

      // Get stats
      const statsResponse = await axios.post(`${BACKEND_URL}/api/admin/stats`, {
        admin_key: adminKey
      });
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Load data error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
      toast.error(`Failed to load data: ${errorMessage}`);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminKey('');
    setUsers([]);
    setStats(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Admin Access</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Enter the admin secret key to access the dashboard
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="adminKey">Admin Secret Key</Label>
                <div className="relative mt-1">
                  <Input
                    id="adminKey"
                    type={showKey ? "text" : "password"}
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="Enter admin key..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Access Dashboard'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="w-full max-w-[95%] mx-auto">
        <PageHeader
          title="Admin Dashboard"
          subtitle='Manage your "Can I Quit?" service'
          rightContent={
            <Button variant="outline" onClick={handleLogout} className="bg-background/20 hover:bg-background/40 text-white border-white/20">
              Logout
            </Button>
          }
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
                      <th className="text-left p-3 font-semibold">Created</th>
                      <th className="text-center p-3 font-semibold">Logins</th>
                      <th className="text-left p-3 font-semibold">Last Login</th>
                      <th className="text-left p-3 font-semibold">Info</th>
                      <th className="text-center p-3 font-semibold">Pages</th>
                      <th className="text-left p-3 font-semibold">Last Page</th>
                      <th className="text-left p-3 font-semibold">Deepest Page</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr key={user.user_id} className="border-b hover:bg-muted/30">
                        <td className="p-3 text-muted-foreground">{index + 1}</td>
                        <td className="p-3 font-medium">{user.email}</td>
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
                            {user.last_device_type && (
                              <span className={`inline-flex w-fit items-center px-1.5 py-0.5 rounded ${user.last_device_type === 'Mobile' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-300'
                                }`}>
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
            mains private and inaccessible (zero-knowledge encryption).
          </p>
        </div>
      </div>
    </div>
  );
};

export default Admin;
