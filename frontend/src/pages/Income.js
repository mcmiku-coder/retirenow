import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { saveIncomeData, getIncomeData, getUserData } from '../utils/database';
import { Trash2, Plus, HelpCircle } from 'lucide-react';
import WorkflowNavigation from '../components/WorkflowNavigation';

const Income = () => {
  const navigate = useNavigate();
  const { user, password } = useAuth();
  const { t, language } = useLanguage();

  // Income name translation
  const getIncomeName = (key) => {
    if (key === 'Salary' || key === 'Net Salary') {
      return t('income.salary');
    }
    return t(`income.${key.toLowerCase()}`) || key;
  };

  const [rows, setRows] = useState([
    { id: 1, name: 'Salary', amount: '', frequency: 'Monthly', category: '', startDate: '', endDate: '', locked: true },
    { id: 2, name: 'AVS', amount: '', frequency: 'Monthly', category: '', startDate: '', endDate: '', locked: true },
    { id: 3, name: 'LPP', amount: '', frequency: 'Monthly', category: '', startDate: '', endDate: '', locked: true },
    { id: 4, name: '3a', amount: '', frequency: 'One-time', category: '', startDate: '', endDate: '', locked: true }
  ]);
  const [nextId, setNextId] = useState(5);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !password) {
      navigate('/');
      return;
    }

    // Load existing data or pre-fill with retirement dates
    const loadData = async () => {
      try {
        const data = await getIncomeData(user.email, password);
        if (data && data.length > 0) {
          setRows(data);
          const maxId = Math.max(...data.map(r => r.id));
          setNextId(maxId + 1);
        } else {
          // Pre-fill dates based on retirement data
          const userData = await getUserData(user.email, password);
          if (userData) {
            const today = new Date().toISOString().split('T')[0];

            // Calculate retirement date
            const birthDate = new Date(userData.birthDate);
            const retirementDate = new Date(birthDate);
            retirementDate.setFullYear(retirementDate.getFullYear() + 65);
            retirementDate.setMonth(retirementDate.getMonth() + 1);
            const retirementDateStr = retirementDate.toISOString().split('T')[0];

            // Use the theoretical death date from API (already in ISO format)
            const deathDateStr = userData.theoreticalDeathDate || retirementDateStr; // Fallback to retirement if not set

            setRows([
              { id: 1, name: 'Salary', amount: '', frequency: 'Monthly', category: '', startDate: today, endDate: retirementDateStr, locked: true }
            ]);
            setNextId(2);
          }
        }
      } catch (error) {
        console.error('Error loading income data:', error);
      }
    };
    loadData();
  }, [user, password, navigate]);

  const updateRow = (id, field, value) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        // Disable endDate if frequency is One-time
        if (field === 'frequency' && value === 'One-time') {
          updated.endDate = '';
        }
        return updated;
      }
      return row;
    }));
  };

  const resetToDefaults = async () => {
    const userData = await getUserData(user.email, password);
    if (userData) {
      const today = new Date().toISOString().split('T')[0];

      const birthDate = new Date(userData.birthDate);
      const retirementDate = new Date(birthDate);
      retirementDate.setFullYear(retirementDate.getFullYear() + 65);
      retirementDate.setMonth(retirementDate.getMonth() + 1);
      const retirementDateStr = retirementDate.toISOString().split('T')[0];

      // Use the theoretical death date from API
      const deathDateStr = userData.theoreticalDeathDate || retirementDateStr;

      setRows([
        { id: 1, name: 'Salary', amount: '', frequency: 'Monthly', category: '', startDate: today, endDate: retirementDateStr, locked: true }
      ]);
      setNextId(2);
      toast.success(t('income.resetSuccess'));
    }
  };

  const addRow = () => {
    setRows([...rows, {
      id: nextId,
      name: '',
      amount: '',
      frequency: 'Monthly',
      category: '',
      startDate: '',
      endDate: '',
      locked: false
    }]);
    setNextId(nextId + 1);
  };

  const deleteRow = (id) => {
    setRows(rows.filter(row => row.id !== id));
    toast.success(t('income.incomeDeleted'));
  };

  const validateRows = () => {
    for (const row of rows) {
      // Check if row is partially filled
      const hasAnyData = row.amount || row.startDate || row.endDate || (row.category && !row.locked);

      if (hasAnyData) {
        if (!row.amount) {
          toast.error(language === 'fr'
            ? `Veuillez saisir un montant ou supprimer la ligne: ${getIncomeName(row.name) || 'ligne ' + row.id}`
            : `Please enter an amount or delete the row: ${getIncomeName(row.name) || 'row ' + row.id}`);
          return false;
        }
        if (!row.startDate) {
          toast.error(`${t('income.startDate')} - ${getIncomeName(row.name) || 'row ' + row.id}`);
          return false;
        }
        if (row.frequency !== 'One-time' && !row.endDate) {
          toast.error(`${t('income.endDate')} - ${getIncomeName(row.name) || 'row ' + row.id}`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateRows()) {
      return;
    }

    setLoading(true);
    try {
      await saveIncomeData(user.email, password, rows);
      toast.success(t('income.saveSuccess'));
      navigate('/costs');
    } catch (error) {
      toast.error(t('income.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Get translated frequency label
  const getFrequencyLabel = (freq) => {
    switch (freq) {
      case 'Monthly': return t('income.monthly');
      case 'Yearly': return t('income.yearly');
      case 'One-time': return t('income.oneTime');
      default: return freq;
    }
  };

  return (
    <div className="min-h-screen py-12 px-4" data-testid="income-page">
      <div className="max-w-6xl mx-auto">
        <WorkflowNavigation />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">{t('income.title')}</h1>
            <p className="text-muted-foreground" data-testid="page-subtitle">
              {t('income.subtitle')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-card border rounded-lg p-6 mb-6 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">{t('income.name')}</th>
                  <th className="text-left p-2 font-semibold">{t('income.amount')}</th>
                  <th className="text-left p-2 font-semibold">{t('income.frequency')}</th>
                  <th className="text-left p-2 font-semibold">{t('income.startDate')}</th>
                  <th className="text-left p-2 font-semibold">{t('income.endDate')}</th>
                  <th className="text-left p-2 font-semibold w-12">{t('income.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="p-2">
                      {row.locked ? (
                        <Input
                          data-testid={`income-name-${index}`}
                          value={getIncomeName(row.name)}
                          disabled={true}
                          className="min-w-[120px]"
                        />
                      ) : (
                        <Input
                          data-testid={`income-name-${index}`}
                          value={row.name}
                          onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                          className="min-w-[120px]"
                        />
                      )}
                    </td>
                    <td className="p-2">
                      <Input
                        data-testid={`income-amount-${index}`}
                        type="number"
                        value={row.amount}
                        onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                        placeholder="0"
                        className="min-w-[100px]"
                      />
                    </td>
                    <td className="p-2">
                      <RadioGroup
                        value={row.frequency}
                        onValueChange={(value) => updateRow(row.id, 'frequency', value)}
                        className="flex gap-2"
                      >
                        <div className="flex items-center gap-1">
                          <RadioGroupItem value="Yearly" id={`yearly-${row.id}`} data-testid={`income-freq-yearly-${index}`} />
                          <Label htmlFor={`yearly-${row.id}`} className="text-sm">{t('income.yearly')}</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <RadioGroupItem value="Monthly" id={`monthly-${row.id}`} data-testid={`income-freq-monthly-${index}`} />
                          <Label htmlFor={`monthly-${row.id}`} className="text-sm">{t('income.monthly')}</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <RadioGroupItem value="One-time" id={`onetime-${row.id}`} data-testid={`income-freq-onetime-${index}`} />
                          <Label htmlFor={`onetime-${row.id}`} className="text-sm">{t('income.oneTime')}</Label>
                        </div>
                      </RadioGroup>
                    </td>
                    <td className="p-2">
                      <Input
                        data-testid={`income-start-${index}`}
                        type="date"
                        value={row.startDate}
                        onChange={(e) => updateRow(row.id, 'startDate', e.target.value)}
                        className="min-w-[140px]"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        data-testid={`income-end-${index}`}
                        type="date"
                        value={row.endDate}
                        onChange={(e) => updateRow(row.id, 'endDate', e.target.value)}
                        disabled={row.frequency === 'One-time'}
                        className="min-w-[140px]"
                      />
                    </td>
                    <td className="p-2">
                      <Button
                        data-testid={`income-delete-${index}`}
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRow(row.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Button
              data-testid="add-income-btn"
              type="button"
              variant="outline"
              onClick={addRow}
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('income.addIncome')}
            </Button>

            <Button
              data-testid="reset-btn"
              type="button"
              variant="outline"
              onClick={resetToDefaults}
              className="mt-4 ml-4"
            >
              {t('income.reset')}
            </Button>
          </div>

          <Button
            data-testid="next-btn"
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? t('common.loading') : t('income.continue')}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Income;
