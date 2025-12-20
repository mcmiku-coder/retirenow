import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { getUserData } from '../utils/database';
import { saveUserData } from '../utils/database';
import axios from 'axios';
import { Calendar, Heart, TrendingUp } from 'lucide-react';
import { NavigationButtons } from '../components/NavigationButtons';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RetirementOverview = () => {
  const navigate = useNavigate();
  const { user, password, token } = useAuth();
  const [retirementData, setRetirementData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !password) {
      navigate('/');
      return;
    }

    const loadRetirementData = async () => {
      try {
        const userData = await getUserData(user.email, password);
        if (!userData || !userData.birthDate) {
          navigate('/personal-info');
          return;
        }

        // Call API to calculate life expectancy
        const response = await axios.post(
          `${API}/life-expectancy`,
          {
            birth_date: userData.birthDate,
            gender: userData.gender
          },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        setRetirementData(response.data);
        
        // Save the calculated dates back to user data for use in other pages
        const updatedUserData = {
          ...userData,
          retirementLegalDate: response.data.retirement_legal_date, // ISO format
          theoreticalDeathDate: response.data.theoretical_death_date, // ISO format
          lifeExpectancyYears: response.data.life_expectancy_years
        };
        await saveUserData(user.email, password, updatedUserData);
      } catch (error) {
        toast.error('Failed to calculate retirement data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadRetirementData();
  }, [user, password, token, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Calculating your retirement outlook...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" data-testid="retirement-overview-page">
      <div className="max-w-4xl w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">Retirement Overview</h1>
            <p className="text-muted-foreground" data-testid="page-subtitle">
              Based on your personal information and statistical data, here's what your retirement timeline looks like.
            </p>
          </div>
          <NavigationButtons backPath="/personal-info" />
        </div>

        {retirementData && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card data-testid="retirement-date-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  Your Retirement Legal Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold" data-testid="retirement-date">
                  {retirementData.retirement_legal_date}
                </p>
              </CardContent>
            </Card>

            <Card data-testid="life-expectancy-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="h-5 w-5" />
                  Life Expectancy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold" data-testid="life-expectancy">
                  {Math.round(retirementData.life_expectancy_years)} years
                </p>
                <p className="text-sm text-muted-foreground mt-1">from today</p>
              </CardContent>
            </Card>

            <Card data-testid="death-date-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5" />
                  Theoretical End Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold" data-testid="death-date">
                  {retirementData.theoretical_death_date}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Button
          data-testid="next-btn"
          onClick={() => navigate('/income')}
          className="w-full"
        >
          Next - Income
        </Button>
      </div>
    </div>
  );
};

export default RetirementOverview;
