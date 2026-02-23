import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { saveCostData, getCostData, getUserData, getIncomeData, getScenarioData } from '../utils/database';
import { Trash2, Plus, HelpCircle, Home } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DateInputWithShortcuts from '../components/DateInputWithShortcuts';

// Cost name keys for translation
const COST_KEYS = {
  'Rent/Mortgage': 'rentMortgage',
  'Taxes': 'taxes',
  'Health insurance': 'healthInsurance',
  'Food': 'food',
  'Clothing': 'clothing',
  'Private transportation': 'privateTransport',
  'Public transportation': 'publicTransport',
  'TV/Internet/Phone': 'tvInternetPhone',
  'Restaurants': 'restaurants',
  'Vacation': 'vacation'
};

const Costs = () => {
  const navigate = useNavigate();
  const { user, masterKey } = useAuth();
  const { t, language } = useLanguage();
  const [rows, setRows] = useState([]);
  const [nextId, setNextId] = useState(11);
  const [loading, setLoading] = useState(false);
  const [salaryAmount, setSalaryAmount] = useState(0);
  const [userData, setUserData] = useState(null);

  // Date shortcut states for Person 1
  const [p1WishedRetirementDate, setP1WishedRetirementDate] = useState('');
  const [p1RetirementLegalDate, setP1RetirementLegalDate] = useState('');
  const [p1DeathDate, setP1DeathDate] = useState('');

  // Date shortcut states for Person 2
  const [p2WishedRetirementDate, setP2WishedRetirementDate] = useState('');
  const [p2RetirementLegalDate, setP2RetirementLegalDate] = useState('');
  const [p2DeathDate, setP2DeathDate] = useState('');

  // Get translated cost name
  const getCostName = (englishName) => {
    const key = COST_KEYS[englishName];
    if (key) {
      return t(`costs.costNames.${key}`);
    }
    return englishName;
  };

  // Initialize default rows with English keys (for data storage) but display translated
  const getDefaultRows = async () => {
    const userData = await getUserData(user.email, masterKey);
    const today = new Date().toISOString().split('T')[0];
    const deathDateStr = userData?.theoreticalDeathDate || today;

    return [
      { id: 1, name: 'Rent/Mortgage', amount: '', frequency: 'Monthly', category: 'Housing', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
      { id: 2, name: 'Taxes', amount: '', frequency: 'Monthly', category: 'Taxes', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
      { id: 3, name: 'Health insurance', amount: '', frequency: 'Monthly', category: 'Health', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
      { id: 4, name: 'Food', amount: '', frequency: 'Monthly', category: 'Elementary', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
      { id: 5, name: 'Clothing', amount: '', frequency: 'Monthly', category: 'Elementary', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
      { id: 6, name: 'Private transportation', amount: '', frequency: 'Monthly', category: 'Transport', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
      { id: 7, name: 'Public transportation', amount: '', frequency: 'Monthly', category: 'Transport', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
      { id: 8, name: 'TV/Internet/Phone', amount: '', frequency: 'Monthly', category: 'Leisure', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
      { id: 9, name: 'Restaurants', amount: '', frequency: 'Monthly', category: 'Leisure', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
      { id: 10, name: 'Vacation', amount: '', frequency: 'Yearly', category: 'Leisure', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true }
    ];
  };

  useEffect(() => {
    if (!user || !masterKey) {
      navigate('/');
      return;
    }

    const loadData = async () => {
      try {
        // Load salary amount for tax calculation
        const incomeData = await getIncomeData(user.email, masterKey);
        if (incomeData && incomeData.length > 0) {
          const salaryRow = incomeData.find(r => r.name === 'Salary' || r.name === 'Net Salary');
          if (salaryRow && salaryRow.amount) {
            setSalaryAmount(parseFloat(salaryRow.amount) || 0);
          }
        }

        const data = await getCostData(user.email, masterKey);
        if (data && data.length > 0) {
          setRows(data);
          const maxId = Math.max(...data.map(r => r.id));
          setNextId(maxId + 1);
        }

        // Always fetch user/scenario data to initialize shortcuts
        const userData = await getUserData(user.email, masterKey);
        const scenarioData = await getScenarioData(user.email, masterKey);

        if (userData) {
          setUserData(userData);
          // Calculate retirement date Person 1
          const p1BirthDate = new Date(userData.birthDate);
          const p1Legal = new Date(p1BirthDate);
          p1Legal.setFullYear(p1Legal.getFullYear() + 65);
          p1Legal.setMonth(p1Legal.getMonth() + 1);
          const p1LegalStr = p1Legal.toISOString().split('T')[0];
          const p1DeathStr = userData.theoreticalDeathDate || p1LegalStr;

          setP1RetirementLegalDate(p1LegalStr);
          setP1DeathDate(p1DeathStr);
          setP1WishedRetirementDate(scenarioData?.wishedRetirementDate || p1LegalStr);

          // Person 2 Dates
          let p2DeathStr = '';
          if (userData.analysisType === 'couple' && userData.birthDate2) {
            const p2BirthDate = new Date(userData.birthDate2);
            const p2Legal = new Date(p2BirthDate);
            p2Legal.setFullYear(p2Legal.getFullYear() + 65);
            p2Legal.setMonth(p2Legal.getMonth() + 1);
            const p2LegalStr = p2Legal.toISOString().split('T')[0];
            p2DeathStr = userData.theoreticalDeathDate2 || p2LegalStr;
            const p2WishedStr = scenarioData?.wishedRetirementDate2 || p2LegalStr;

            setP2RetirementLegalDate(p2LegalStr);
            setP2DeathDate(p2DeathStr);
            setP2WishedRetirementDate(p2WishedStr);
          }

          if (!data || data.length === 0) {
            const defaultRows = await getDefaultRows();
            // Default owner for costs: 
            // - rent/mortgage (first row) is 'shared'
            // - others are 'consolidated'
            const finalDefaults = defaultRows.map((r, idx) => ({
              ...r,
              owner: userData.analysisType === 'couple'
                ? (idx === 0 ? 'shared' : 'consolidated')
                : 'p1',
              endDate: userData.analysisType === 'couple' ? (p1DeathStr > p2DeathStr ? p1DeathStr : p2DeathStr) : p1DeathStr
            }));
            setRows(finalDefaults);
          }
        }
      } catch (error) {
        console.error('Error loading cost data:', error);
      }
    };
    loadData();
  }, [user, masterKey, navigate]);

  const updateRow = (id, field, value) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        let updated = { ...row, [field]: value };
        if (field === 'frequency' && value === 'One-time') {
          updated.endDate = '';
        }

        // Dynamic End Date on Owner Change
        if (field === 'owner') {
          const maxDeathDate = p1DeathDate > p2DeathDate ? p1DeathDate : p2DeathDate;
          const currentDeathDate = row.owner === 'p2' ? p2DeathDate : (row.owner === 'shared' ? maxDeathDate : p1DeathDate);

          // Only update if it looks like a default death date (to protect custom edits)
          if (!row.endDate || row.endDate === currentDeathDate) {
            if (value === 'p1') {
              updated.endDate = p1DeathDate;
            } else if (value === 'p2') {
              updated.endDate = p2DeathDate;
            } else if (value === 'shared' || value === 'consolidated') {
              updated.endDate = maxDeathDate;
            }
          }
        }
        return updated;
      }
      return row;
    }));
  };

  const resetToDefaults = async () => {
    const defaultRows = await getDefaultRows();
    const maxDeathDate = p1DeathDate > p2DeathDate ? p1DeathDate : p2DeathDate;

    // In couple mode, ensure owner is 'consolidated' (except rent) and endDate is max death date
    const finalDefaults = defaultRows.map((r, idx) => ({
      ...r,
      owner: userData?.analysisType === 'couple'
        ? (idx === 0 ? 'shared' : 'consolidated')
        : 'p1',
      endDate: userData?.analysisType === 'couple' ? maxDeathDate : p1DeathDate
    }));

    setRows(finalDefaults);
    setNextId(11);
  };

  const addRow = async () => {
    const today = new Date().toISOString().split('T')[0];
    const isCouple = userData?.analysisType === 'couple';
    const defaultOwner = isCouple ? 'consolidated' : 'p1';
    const maxDeathDate = p1DeathDate > p2DeathDate ? p1DeathDate : p2DeathDate;
    const defaultEndDate = isCouple ? maxDeathDate : p1DeathDate;

    setRows([...rows, {
      id: nextId,
      name: '',
      amount: '',
      frequency: 'Monthly',
      category: '',
      startDate: today,
      endDate: defaultEndDate,
      locked: false,
      categoryLocked: false,
      owner: defaultOwner
    }]);
    setNextId(nextId + 1);
  };

  const deleteRow = (id) => {
    setRows(rows.filter(row => row.id !== id));
  };

  const validateRows = () => {
    for (const row of rows) {
      const hasAnyData = row.amount || row.startDate || row.endDate;

      if (hasAnyData) {
        if (!row.amount) {
          toast.error(`${t('costs.amount')} - ${getCostName(row.name) || 'row ' + row.id}`);
          return false;
        }
        if (!row.startDate) {
          toast.error(`${t('costs.startDate')} - ${getCostName(row.name) || 'row ' + row.id}`);
          return false;
        }
        if (row.frequency !== 'One-time' && !row.endDate) {
          toast.error(`${t('costs.endDate')} - ${getCostName(row.name) || 'row ' + row.id}`);
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
      await saveCostData(user.email, masterKey, rows);
      navigate('/assets-savings');
    } catch (error) {
      toast.error(t('costs.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Get translated category
  const getCategoryLabel = (category) => {
    const key = category.toLowerCase();
    return t(`costs.categories.${key}`) || category;
  };

  return (
    <div className="flex-grow py-6" data-testid="costs-page">
      <div className="w-[70%] mx-auto mb-6 px-4">
      </div>

      <PageHeader
        title={t('costs.title')}
        subtitle={t('costs.subtitle')}
        rightContent={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  setLoading(true);
                  await saveCostData(user.email, masterKey, rows);
                  navigate('/expense-wizard');
                } catch (error) {
                  toast.error(t('costs.saveFailed'));
                } finally {
                  setLoading(false);
                }
              }}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700"
              disabled={loading}
            >
              <HelpCircle className="h-4 w-4" />
              {t('costs.helpButton')}
            </Button>
          </div>
        }
      />

      <div className="w-[70%] mx-auto px-4">

        <form onSubmit={handleSubmit}>
          {/* Help Button */}


          <div className="bg-card border rounded-lg p-6 mb-6 overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  {userData?.analysisType === 'couple' && (
                    <th className="text-left p-2 font-semibold">{t('costs.person')}</th>
                  )}
                  <th className="text-left p-2 font-semibold">{t('costs.name')}</th>
                  <th className="text-left p-2 font-semibold">{t('costs.amount')}</th>
                  <th className="text-left p-2 font-semibold">{t('costs.frequency')}</th>
                  {/* <th className="text-left p-2 font-semibold">{t('costs.category')}</th> */}
                  <th className="text-left p-2 font-semibold">{t('costs.startDate')}</th>
                  <th className="text-left p-2 font-semibold">{t('costs.endDate')}</th>
                  <th className="text-left p-2 font-semibold w-12">{t('costs.actions')}</th>
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
                          <SelectTrigger className={`w-[130px] font-medium ${(row.owner === 'p1') ? 'text-blue-400' : (row.owner === 'p2') ? 'text-purple-400' : (row.owner === 'consolidated') ? 'text-amber-400' : 'text-gray-400'}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="p1" className="text-blue-400 font-medium">{userData?.firstName || t('income.person1') || 'Person 1'}</SelectItem>
                            <SelectItem value="p2" className="text-purple-400 font-medium">{userData?.firstName2 || t('income.person2') || 'Person 2'}</SelectItem>
                            <SelectItem value="shared" className="text-gray-400">{t('income.shared')}</SelectItem>
                            <SelectItem value="consolidated" className="text-amber-400 font-medium">{t('income.consolidated')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    )}
                    <td className="p-2">
                      {row.locked ? (
                        <Input
                          data-testid={`cost-name-${index}`}
                          value={getCostName(row.name)}
                          disabled={true}
                          className="min-w-[150px] disabled:opacity-100 disabled:text-white"
                        />
                      ) : (
                        <Input
                          data-testid={`cost-name-${index}`}
                          value={row.name}
                          onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                          className="min-w-[150px]"
                        />
                      )}
                    </td>
                    <td className="p-2">
                      {row.name === 'Rent/Mortgage' ? (
                        <div className="flex gap-1 h-10 w-full min-w-[140px]">
                          <Button
                            type="button"
                            onClick={async () => {
                              try {
                                setLoading(true);
                                // Save current rows before navigating, preserving all defaults and edits
                                await saveCostData(user.email, masterKey, rows);
                                navigate('/real-estate');
                              } catch (error) {
                                toast.error(t('costs.saveFailed'));
                                setLoading(false);
                              }
                            }}
                            disabled={loading}
                            className="flex-1 h-full px-2 text-xs bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white whitespace-nowrap"
                            title={language === 'fr' ? 'Calculateur frais de logement' : 'Lodging expenses calculator'}
                          >
                            {language === 'fr' ? 'Calculateur frais de logement' : 'Lodging expenses calculator'}
                          </Button>
                          <Input
                            data-testid={`cost-amount-${index}`}
                            type="text"
                            value={row.amount ? row.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/'/g, '');
                              if (!isNaN(rawValue)) {
                                updateRow(row.id, 'amount', rawValue);
                              }
                            }}
                            placeholder="0"
                            className="flex-1 min-w-[50px] text-right h-full px-2"
                          />
                        </div>
                      ) : (
                        <Input
                          data-testid={`cost-amount-${index}`}
                          type="text"
                          value={row.amount ? row.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/'/g, '');
                            if (!isNaN(rawValue)) {
                              updateRow(row.id, 'amount', rawValue);
                            }
                          }}
                          placeholder="0"
                          className="min-w-[70px] text-right"
                        />
                      )}
                    </td>
                    <td className="p-2">
                      <RadioGroup
                        value={row.frequency}
                        onValueChange={(value) => updateRow(row.id, 'frequency', value)}
                        className="flex gap-2"
                      >
                        <div className="flex items-center gap-1">
                          <RadioGroupItem value="Yearly" id={`yearly-${row.id}`} data-testid={`cost-freq-yearly-${index}`} />
                          <Label htmlFor={`yearly-${row.id}`} className="text-sm">{t('income.yearly')}</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <RadioGroupItem value="Monthly" id={`monthly-${row.id}`} data-testid={`cost-freq-monthly-${index}`} />
                          <Label htmlFor={`monthly-${row.id}`} className="text-sm">{t('income.monthly')}</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <RadioGroupItem value="One-time" id={`onetime-${row.id}`} data-testid={`cost-freq-onetime-${index}`} />
                          <Label htmlFor={`onetime-${row.id}`} className="text-sm">{t('income.oneTime')}</Label>
                        </div>
                      </RadioGroup>
                    </td>
                    {/* <td className="p-2">
                       {row.categoryLocked ? (
                        <Input
                          data-testid={`cost-category-${index}`}
                          value={getCategoryLabel(row.category)}
                          disabled={true}
                          className="min-w-[90px] disabled:opacity-100 disabled:text-white"
                        />
                      ) : (
                        <Select value={row.category} onValueChange={(value) => updateRow(row.id, 'category', value)}>
                          <SelectTrigger data-testid={`cost-category-${index}`} className="min-w-[90px]">
                            <SelectValue placeholder={t('costs.selectCategory')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Housing">{t('costs.categories.housing')}</SelectItem>
                            <SelectItem value="Leisure">{t('costs.categories.leisure')}</SelectItem>
                            <SelectItem value="Health">{t('costs.categories.health')}</SelectItem>
                            <SelectItem value="Transport">{t('costs.categories.transport')}</SelectItem>
                            <SelectItem value="Elementary">{t('costs.categories.elementary')}</SelectItem>
                            <SelectItem value="Other">{t('costs.categories.other')}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td> */}
                    <td className="p-2">
                      <DateInputWithShortcuts
                        data-testid={`cost-start-${index}`}
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
                        data-testid={`cost-end-${index}`}
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
                        data-testid={`cost-delete-${index}`}
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
              data-testid="add-cost-btn"
              type="button"
              variant="outline"
              onClick={addRow}
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('costs.addCost')}
            </Button>

            <Button
              data-testid="reset-btn"
              type="button"
              variant="outline"
              onClick={resetToDefaults}
              className="mt-4 ml-4"
            >
              {t('costs.reset')}
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
              {loading ? t('common.loading') : t('costs.continue')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Costs;
