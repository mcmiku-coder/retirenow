import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Trash2, Plus, HelpCircle, User } from 'lucide-react';
import { getIncomeData, saveIncomeData, getUserData, getScenarioData } from '../utils/database';
import PageHeader from '../components/PageHeader';
import DateInputWithShortcuts from '../components/DateInputWithShortcuts';

const Income = () => {
  const navigate = useNavigate();
  const { user, masterKey } = useAuth();
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
  const [userData, setUserData] = useState(null);

  // Date shortcut states for Person 1
  const [p1WishedRetirementDate, setP1WishedRetirementDate] = useState('');
  const [p1RetirementLegalDate, setP1RetirementLegalDate] = useState('');
  const [p1DeathDate, setP1DeathDate] = useState('');

  // Date shortcut states for Person 2
  const [p2WishedRetirementDate, setP2WishedRetirementDate] = useState('');
  const [p2RetirementLegalDate, setP2RetirementLegalDate] = useState('');
  const [p2DeathDate, setP2DeathDate] = useState('');

  useEffect(() => {
    if (!user || !masterKey) {
      navigate('/');
      return;
    }

    // Load existing data or pre-fill with retirement dates
    const loadData = async () => {
      try {
        const data = await getIncomeData(user.email, masterKey);
        if (data && data.length > 0) {
          setRows(data);
          const maxId = Math.max(...data.map(r => r.id));
          setNextId(maxId + 1);
        }

        // Pre-fill dates based on retirement data
        const userDataResult = await getUserData(user.email, masterKey);
        const scenarioData = await getScenarioData(user.email, masterKey);

        if (userDataResult) {
          setUserData(userDataResult);
          const userData = userDataResult; // Local ref for the rest of the effect logic
          const today = new Date().toISOString().split('T')[0];

          // Person 1 Dates
          const p1BirthDate = new Date(userData.birthDate);
          const p1Legal = new Date(p1BirthDate);
          p1Legal.setUTCFullYear(p1Legal.getUTCFullYear() + 65);
          p1Legal.setUTCMonth(p1Legal.getUTCMonth() + 1);
          const p1LegalStrFallBack = p1Legal.toISOString().split('T')[0];
          const p1LegalStr = userData.retirementLegalDate || p1LegalStrFallBack;
          const p1DeathStr = userData.theoreticalDeathDate || p1LegalStr;

          setP1RetirementLegalDate(p1LegalStr);
          setP1DeathDate(p1DeathStr);
          setP1WishedRetirementDate(scenarioData?.wishedRetirementDate || p1LegalStr);

          // Person 2 Dates
          let p2LegalStr = '', p2DeathStr = '', p2WishedStr = '';
          if (userData.analysisType === 'couple' && userData.birthDate2) {
            const p2BirthDate = new Date(userData.birthDate2);
            const p2Legal = new Date(p2BirthDate);
            p2Legal.setUTCFullYear(p2Legal.getUTCFullYear() + 65);
            p2Legal.setUTCMonth(p2Legal.getUTCMonth() + 1);
            const p2LegalStrFallBack = p2Legal.toISOString().split('T')[0];
            p2LegalStr = userData.retirementLegalDate2 || p2LegalStrFallBack;
            p2DeathStr = userData.theoreticalDeathDate2 || p2LegalStr;
            p2WishedStr = scenarioData?.wishedRetirementDate2 || p2LegalStr;

            setP2RetirementLegalDate(p2LegalStr);
            setP2DeathDate(p2DeathStr);
            setP2WishedRetirementDate(p2WishedStr);
          }

          // Only set default rows if no data exists
          if (!data || data.length === 0) {
            const defaultRows = [
              { id: 1, name: 'Net Salary', amount: '', frequency: 'Monthly', category: '', startDate: today, endDate: p1LegalStr, locked: true, owner: 'p1' }
            ];

            if (userData.analysisType === 'couple') {
              defaultRows.push({ id: 2, name: 'Net Salary', amount: '', frequency: 'Monthly', category: '', startDate: today, endDate: p2LegalStr, locked: true, owner: 'p2' });
              setNextId(3);
            } else {
              setNextId(2);
            }
            setRows(defaultRows);
          }
        }

      } catch (error) {
        console.error('Error loading income data:', error);
      }
    };
    loadData();
  }, [user, masterKey, navigate]);

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
    const userData = await getUserData(user.email, masterKey);
    if (userData) {
      const today = new Date().toISOString().split('T')[0];

      // Person 1 legal retirement date
      const birthDate = new Date(userData.birthDate);
      const p1Legal = new Date(birthDate);
      p1Legal.setUTCFullYear(p1Legal.getUTCFullYear() + 65);
      p1Legal.setUTCMonth(p1Legal.getUTCMonth() + 1);
      const p1LegalStrFallBack = p1Legal.toISOString().split('T')[0];
      const p1LegalStr = userData.retirementLegalDate || p1LegalStrFallBack;

      const defaultRows = [
        { id: 1, name: 'Net Salary', amount: '', frequency: 'Monthly', category: '', startDate: today, endDate: p1LegalStr, locked: true, owner: 'p1' }
      ];

      if (userData.analysisType === 'couple' && userData.birthDate2) {
        // Person 2 legal retirement date
        const birthDate2 = new Date(userData.birthDate2);
        const p2Legal = new Date(birthDate2);
        p2Legal.setUTCFullYear(p2Legal.getUTCFullYear() + 65);
        p2Legal.setUTCMonth(p2Legal.getUTCMonth() + 1);
        const p2LegalStrFallBack = p2Legal.toISOString().split('T')[0];
        const p2LegalStr = userData.retirementLegalDate2 || p2LegalStrFallBack;

        defaultRows.push({ id: 2, name: 'Net Salary', amount: '', frequency: 'Monthly', category: '', startDate: today, endDate: p2LegalStr, locked: true, owner: 'p2' });
        setNextId(3);
      } else {
        setNextId(2);
      }

      setRows(defaultRows);
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
      locked: false,
      owner: userData?.analysisType === 'couple' ? 'shared' : 'p1'
    }]);
    setNextId(nextId + 1);
  };

  const deleteRow = (id) => {
    setRows(rows.filter(row => row.id !== id));
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
      await saveIncomeData(user.email, masterKey, rows);
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
    <div className="flex-grow py-6" data-testid="income-page">
      <div className="w-[80%] mx-auto mb-6 px-4">
      </div>

      <PageHeader
        title={t('income.title')}
        subtitle={t('income.subtitle')}
      />

      <div className="w-[80%] mx-auto px-4">

        <form onSubmit={handleSubmit}>
          <div className="bg-card border rounded-lg p-6 mb-6 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  {userData?.analysisType === 'couple' && (
                    <th className="text-left p-2 font-semibold">{t('income.person')}</th>
                  )}
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
                    {userData?.analysisType === 'couple' && (
                      <td className="p-2">
                        <Select
                          value={row.owner || 'shared'}
                          onValueChange={(value) => updateRow(row.id, 'owner', value)}
                        >
                          <SelectTrigger className={`w-[130px] font-medium ${(row.owner === 'p1') ? 'text-blue-400' : (row.owner === 'p2') ? 'text-purple-400' : 'text-gray-400'}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="p1" className="text-blue-400 font-medium">{userData?.firstName || t('income.person1') || 'Person 1'}</SelectItem>
                            <SelectItem value="p2" className="text-purple-400 font-medium">{userData?.firstName2 || t('income.person2') || 'Person 2'}</SelectItem>
                            <SelectItem value="shared" className="text-gray-400">{t('income.shared')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    )}
                    <td className="p-2">
                      {row.locked ? (
                        <Input
                          data-testid={`income-name-${index}`}
                          value={getIncomeName(row.name)}
                          disabled={true}
                          className="min-w-[120px] disabled:opacity-100 disabled:text-white"
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
                        type="text"
                        value={row.amount ? row.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/'/g, '');
                          if (!isNaN(rawValue)) {
                            updateRow(row.id, 'amount', rawValue);
                          }
                        }}
                        placeholder="0"
                        className="min-w-[100px] text-right"
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
                      <DateInputWithShortcuts
                        data-testid={`income-start-${index}`}
                        value={row.startDate}
                        onChange={(e) => updateRow(row.id, 'startDate', e.target.value)}
                        className="w-fit"
                        retirementDate={row.owner === 'p2' ? p2WishedRetirementDate : p1WishedRetirementDate}
                        legalDate={row.owner === 'p2' ? p2RetirementLegalDate : p1RetirementLegalDate}
                        mode="start"
                      />
                    </td>
                    <td className="p-2">
                      <DateInputWithShortcuts
                        data-testid={`income-end-${index}`}
                        value={row.endDate}
                        onChange={(e) => updateRow(row.id, 'endDate', e.target.value)}
                        disabled={row.frequency === 'One-time'}
                        className="w-fit"
                        retirementDate={row.owner === 'p2' ? p2WishedRetirementDate : p1WishedRetirementDate}
                        legalDate={row.owner === 'p2' ? p2RetirementLegalDate : p1RetirementLegalDate}
                        deathDate={row.owner === 'p2' ? p2DeathDate : (row.owner === 'shared' ? (p1DeathDate > p2DeathDate ? p1DeathDate : p2DeathDate) : p1DeathDate)}
                        mode="end"
                      />
                    </td>

                    <td className="p-2">
                      <Button
                        data-testid={`income-delete-${index}`}
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRow(row.id)}
                        className="text-red-500 hover:text-red-700"
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

          <div className="flex justify-center mt-6">
            <Button
              data-testid="next-btn"
              type="submit"
              size="lg"
              className="px-12 text-lg"
              disabled={loading}
            >
              {loading ? t('common.loading') : t('income.continue')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Income;
