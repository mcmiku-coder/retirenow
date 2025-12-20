import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { saveUserData, getUserData } from '../utils/database';
import { Calendar } from 'lucide-react';
import { NavigationButtons } from '../components/NavigationButtons';

const PersonalInfo = () => {
  const navigate = useNavigate();
  const { user, password } = useAuth();
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [residence, setResidence] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !password) {
      navigate('/');
      return;
    }

    // Load existing data if any
    const loadData = async () => {
      try {
        const data = await getUserData(user.email, password);
        if (data) {
          setBirthDate(data.birthDate || '');
          setGender(data.gender || '');
          setResidence(data.residence || '');
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, [user, password, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!birthDate || !gender || !residence) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        birthDate,
        gender,
        residence
      };
      
      await saveUserData(user.email, password, userData);
      toast.success('Information saved securely');
      navigate('/retirement-overview');
    } catch (error) {
      toast.error('Failed to save data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" data-testid="personal-info-page">
      <div className="max-w-2xl w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">Personal Information</h1>
            <p className="text-muted-foreground" data-testid="page-subtitle">
              Let's start by gathering some basic information about you. All data is encrypted and stored securely on your device only.
            </p>
          </div>
          <NavigationButtons backPath="/" showHome={false} />
        </div>

        <form onSubmit={handleSubmit} className="bg-card border rounded-lg p-8 space-y-6">
          <div>
            <Label htmlFor="birthDate">Birth Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="birth-date-input"
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select value={gender} onValueChange={setGender} required>
              <SelectTrigger data-testid="gender-select">
                <SelectValue placeholder="Select your gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male" data-testid="gender-male">Male</SelectItem>
                <SelectItem value="female" data-testid="gender-female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="residence">Country of Residence</Label>
            <Select value={residence} onValueChange={setResidence} required>
              <SelectTrigger data-testid="residence-select">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Switzerland" data-testid="residence-switzerland">Switzerland</SelectItem>
                <SelectItem value="France" data-testid="residence-france">France</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            data-testid="next-btn"
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Next - Retirement Overview'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default PersonalInfo;
