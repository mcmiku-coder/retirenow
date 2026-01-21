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
import { saveCostData, getCostData, getUserData, getIncomeData } from '../utils/database';
import { Trash2, Plus, HelpCircle, Home } from 'lucide-react';
import PageHeader from '../components/PageHeader';

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
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [salaryAmount, setSalaryAmount] = useState(0);

  // Help modal answers
  const [helpAnswers, setHelpAnswers] = useState({
    hasCar: null,
    vacationCosts: null, // 'high', 'moderate', 'low'
    goesOutOften: null,
    foodExpenses: null, // 'high', 'moderate', 'low'
    privateInsurance: null,
    publicTransport: null, // 'never', 'sometimes', 'always'
    clothingShopping: null, // 'veryOften', 'reasonably', 'rarely'
    tvInternetCosts: null // 'high', 'moderate', 'low'
  });

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
        } else {
          const defaultRows = await getDefaultRows();
          setRows(defaultRows);
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
        const updated = { ...row, [field]: value };
        if (field === 'frequency' && value === 'One-time') {
          updated.endDate = '';
        }
        return updated;
      }
      return row;
    }));
  };

  const resetToDefaults = async () => {
    const defaultRows = await getDefaultRows();
    setRows(defaultRows);
    setNextId(11);
  };

  const addRow = async () => {
    const userData = await getUserData(user.email, masterKey);
    const today = new Date().toISOString().split('T')[0];
    const deathDateStr = userData?.theoreticalDeathDate || today;

    setRows([...rows, {
      id: nextId,
      name: '',
      amount: '',
      frequency: 'Monthly',
      category: '',
      startDate: today,
      endDate: deathDateStr,
      locked: false,
      categoryLocked: false
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

  // Apply help modal answers
  const applyHelpAnswers = () => {
    // Calculate taxes: 18% of monthly salary, rounded up to nearest hundred
    const monthlyTax = salaryAmount * 0.18;
    const roundedTax = Math.ceil(monthlyTax / 100) * 100;

    setRows(currentRows => {
      let updatedRows = [...currentRows];

      // Handle car question
      if (helpAnswers.hasCar === false) {
        // Remove private transportation
        updatedRows = updatedRows.filter(row => row.name !== 'Private transportation');
      } else if (helpAnswers.hasCar === true) {
        // Set private transportation to 600
        updatedRows = updatedRows.map(row =>
          row.name === 'Private transportation' ? { ...row, amount: '600' } : row
        );
      }

      // Handle vacation question (now with 3 options)
      if (helpAnswers.vacationCosts !== null) {
        let vacationAmount = '5000';
        if (helpAnswers.vacationCosts === 'high') {
          vacationAmount = '10000';
        } else if (helpAnswers.vacationCosts === 'moderate') {
          vacationAmount = '5000';
        } else if (helpAnswers.vacationCosts === 'low') {
          vacationAmount = '2000';
        }
        updatedRows = updatedRows.map(row =>
          row.name === 'Vacation' ? { ...row, amount: vacationAmount } : row
        );
      }

      // Handle restaurant question
      if (helpAnswers.goesOutOften !== null) {
        const restaurantAmount = helpAnswers.goesOutOften ? '400' : '100';
        updatedRows = updatedRows.map(row =>
          row.name === 'Restaurants' ? { ...row, amount: restaurantAmount } : row
        );
      }

      // Handle food expenses question (now with 3 options)
      if (helpAnswers.foodExpenses !== null) {
        let foodAmount = '500';
        if (helpAnswers.foodExpenses === 'high') {
          foodAmount = '800';
        } else if (helpAnswers.foodExpenses === 'moderate') {
          foodAmount = '500';
        } else if (helpAnswers.foodExpenses === 'low') {
          foodAmount = '350';
        }
        updatedRows = updatedRows.map(row =>
          row.name === 'Food' ? { ...row, amount: foodAmount } : row
        );
      }

      // Handle private insurance question
      if (helpAnswers.privateInsurance !== null) {
        const insuranceAmount = helpAnswers.privateInsurance ? '900' : '600';
        updatedRows = updatedRows.map(row =>
          row.name === 'Health insurance' ? { ...row, amount: insuranceAmount } : row
        );
      }

      // Handle public transportation question
      if (helpAnswers.publicTransport !== null) {
        if (helpAnswers.publicTransport === 'never') {
          // Remove public transportation line
          updatedRows = updatedRows.filter(row => row.name !== 'Public transportation');
        } else if (helpAnswers.publicTransport === 'sometimes') {
          updatedRows = updatedRows.map(row =>
            row.name === 'Public transportation' ? { ...row, amount: '100' } : row
          );
        } else if (helpAnswers.publicTransport === 'always') {
          updatedRows = updatedRows.map(row =>
            row.name === 'Public transportation' ? { ...row, amount: '300' } : row
          );
        }
      }

      // Handle clothing shopping question
      if (helpAnswers.clothingShopping !== null) {
        let clothingAmount = '300';
        if (helpAnswers.clothingShopping === 'veryOften') {
          clothingAmount = '500';
        } else if (helpAnswers.clothingShopping === 'reasonably') {
          clothingAmount = '300';
        } else if (helpAnswers.clothingShopping === 'rarely') {
          clothingAmount = '100';
        }
        updatedRows = updatedRows.map(row =>
          row.name === 'Clothing' ? { ...row, amount: clothingAmount } : row
        );
      }

      // Handle TV/Internet/Phone costs question
      if (helpAnswers.tvInternetCosts !== null) {
        let tvAmount = '200';
        if (helpAnswers.tvInternetCosts === 'high') {
          tvAmount = '400';
        } else if (helpAnswers.tvInternetCosts === 'moderate') {
          tvAmount = '200';
        } else if (helpAnswers.tvInternetCosts === 'low') {
          tvAmount = '80';
        }
        updatedRows = updatedRows.map(row =>
          row.name === 'TV/Internet/Phone' ? { ...row, amount: tvAmount } : row
        );
      }

      // Set taxes based on salary
      if (roundedTax > 0) {
        updatedRows = updatedRows.map(row =>
          row.name === 'Taxes' ? { ...row, amount: String(roundedTax) } : row
        );
      }

      return updatedRows;
    });

    setShowHelpModal(false);
    setHelpAnswers({
      hasCar: null,
      vacationCosts: null,
      goesOutOften: null,
      foodExpenses: null,
      privateInsurance: null,
      publicTransport: null,
      clothingShopping: null,
      tvInternetCosts: null
    });
  };

  // Get translated category
  const getCategoryLabel = (category) => {
    const key = category.toLowerCase();
    return t(`costs.categories.${key}`) || category;
  };

  return (
    <div className="min-h-screen py-6" data-testid="costs-page">
      <div className="w-[80%] mx-auto mb-6 px-4">
      </div>

      <PageHeader
        title={t('costs.title')}
        subtitle={t('costs.subtitle')}
        rightContent={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowHelpModal(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700"
            >
              <HelpCircle className="h-4 w-4" />
              {t('costs.helpButton')}
            </Button>
          </div>
        }
      />

      <div className="w-[80%] mx-auto px-4">

        <form onSubmit={handleSubmit}>
          {/* Help Button */}


          <div className="bg-card border rounded-lg p-6 mb-6 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">{t('costs.name')}</th>
                  <th className="text-left p-2 font-semibold">{t('costs.amount')}</th>
                  <th className="text-left p-2 font-semibold">{t('costs.frequency')}</th>
                  <th className="text-left p-2 font-semibold">{t('costs.category')}</th>
                  <th className="text-left p-2 font-semibold">{t('costs.startDate')}</th>
                  <th className="text-left p-2 font-semibold">{t('costs.endDate')}</th>
                  <th className="text-left p-2 font-semibold w-12">{t('costs.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className="border-b last:border-0">
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
                        <div className="flex gap-1 h-10 w-full min-w-[200px]">
                          <Button
                            type="button"
                            onClick={() => navigate('/real-estate')}
                            className="flex-1 h-full px-2 text-xs bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white whitespace-nowrap"
                            title={language === 'fr' ? 'Calculateur logement' : 'Housing calculator'}
                          >
                            {language === 'fr' ? 'Calculateur logement' : 'Housing calculator'}
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
                            className="flex-1 min-w-[80px] text-right h-full"
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
                          className="min-w-[100px] text-right"
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
                    <td className="p-2">
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
                    </td>
                    <td className="p-2">
                      <Input
                        data-testid={`cost-start-${index}`}
                        type="date"
                        value={row.startDate}
                        onChange={(e) => updateRow(row.id, 'startDate', e.target.value)}
                        className="min-w-[140px]"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        data-testid={`cost-end-${index}`}
                        type="date"
                        value={row.endDate}
                        onChange={(e) => updateRow(row.id, 'endDate', e.target.value)}
                        disabled={row.frequency === 'One-time'}
                        className="min-w-[140px]"
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

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-2">{t('costs.helpModal.title')}</h3>

              {/* Intro text - green, no background */}
              <p className="text-xs text-green-600 dark:text-green-400 mb-4">
                {t('costs.helpModal.intro')}
              </p>

              <div className="space-y-3">
                {/* Question 1: Car */}
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">{t('costs.helpModal.question1')}</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="hasCar"
                        checked={helpAnswers.hasCar === true}
                        onChange={() => setHelpAnswers({ ...helpAnswers, hasCar: true })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.yes')}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="hasCar"
                        checked={helpAnswers.hasCar === false}
                        onChange={() => setHelpAnswers({ ...helpAnswers, hasCar: false })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.no')}
                    </label>
                  </div>
                </div>

                {/* Question 2: Vacation Costs */}
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">{t('costs.helpModal.question2')}</p>
                  <div className="flex gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="vacationCosts"
                        checked={helpAnswers.vacationCosts === 'high'}
                        onChange={() => setHelpAnswers({ ...helpAnswers, vacationCosts: 'high' })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.question2_high')}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="vacationCosts"
                        checked={helpAnswers.vacationCosts === 'moderate'}
                        onChange={() => setHelpAnswers({ ...helpAnswers, vacationCosts: 'moderate' })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.question2_moderate')}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="vacationCosts"
                        checked={helpAnswers.vacationCosts === 'low'}
                        onChange={() => setHelpAnswers({ ...helpAnswers, vacationCosts: 'low' })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.question2_low')}
                    </label>
                  </div>
                </div>

                {/* Question 3: Restaurants */}
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">{t('costs.helpModal.question3')}</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="goesOutOften"
                        checked={helpAnswers.goesOutOften === true}
                        onChange={() => setHelpAnswers({ ...helpAnswers, goesOutOften: true })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.yes')}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="goesOutOften"
                        checked={helpAnswers.goesOutOften === false}
                        onChange={() => setHelpAnswers({ ...helpAnswers, goesOutOften: false })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.no')}
                    </label>
                  </div>
                </div>

                {/* Question 4: Food Expenses */}
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">{t('costs.helpModal.question4')}</p>
                  <div className="flex gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="foodExpenses"
                        checked={helpAnswers.foodExpenses === 'high'}
                        onChange={() => setHelpAnswers({ ...helpAnswers, foodExpenses: 'high' })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.question4_high')}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="foodExpenses"
                        checked={helpAnswers.foodExpenses === 'moderate'}
                        onChange={() => setHelpAnswers({ ...helpAnswers, foodExpenses: 'moderate' })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.question4_moderate')}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="foodExpenses"
                        checked={helpAnswers.foodExpenses === 'low'}
                        onChange={() => setHelpAnswers({ ...helpAnswers, foodExpenses: 'low' })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.question4_low')}
                    </label>
                  </div>
                </div>

                {/* Question 5: Private Insurance */}
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">{t('costs.helpModal.question5')}</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="privateInsurance"
                        checked={helpAnswers.privateInsurance === true}
                        onChange={() => setHelpAnswers({ ...helpAnswers, privateInsurance: true })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.yes')}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="privateInsurance"
                        checked={helpAnswers.privateInsurance === false}
                        onChange={() => setHelpAnswers({ ...helpAnswers, privateInsurance: false })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.no')}
                    </label>
                  </div>
                </div>

                {/* Question 6: Public Transportation */}
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">{t('costs.helpModal.question6')}</p>
                  <div className="flex gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="publicTransport"
                        checked={helpAnswers.publicTransport === 'never'}
                        onChange={() => setHelpAnswers({ ...helpAnswers, publicTransport: 'never' })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.question6_never')}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="publicTransport"
                        checked={helpAnswers.publicTransport === 'sometimes'}
                        onChange={() => setHelpAnswers({ ...helpAnswers, publicTransport: 'sometimes' })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.question6_sometimes')}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="publicTransport"
                        checked={helpAnswers.publicTransport === 'always'}
                        onChange={() => setHelpAnswers({ ...helpAnswers, publicTransport: 'always' })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.question6_always')}
                    </label>
                  </div>
                </div>

                {/* Question 7: Clothing Shopping */}
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">{t('costs.helpModal.question7')}</p>
                  <div className="flex gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="clothingShopping"
                        checked={helpAnswers.clothingShopping === 'veryOften'}
                        onChange={() => setHelpAnswers({ ...helpAnswers, clothingShopping: 'veryOften' })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.question7_veryOften')}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="clothingShopping"
                        checked={helpAnswers.clothingShopping === 'reasonably'}
                        onChange={() => setHelpAnswers({ ...helpAnswers, clothingShopping: 'reasonably' })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.question7_reasonably')}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="clothingShopping"
                        checked={helpAnswers.clothingShopping === 'rarely'}
                        onChange={() => setHelpAnswers({ ...helpAnswers, clothingShopping: 'rarely' })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.question7_rarely')}
                    </label>
                  </div>
                </div>

                {/* Question 8: TV/Internet/Phone costs */}
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">{t('costs.helpModal.question8')}</p>
                  <div className="flex gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="tvInternetCosts"
                        checked={helpAnswers.tvInternetCosts === 'high'}
                        onChange={() => setHelpAnswers({ ...helpAnswers, tvInternetCosts: 'high' })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.question8_high')}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="tvInternetCosts"
                        checked={helpAnswers.tvInternetCosts === 'moderate'}
                        onChange={() => setHelpAnswers({ ...helpAnswers, tvInternetCosts: 'moderate' })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.question8_moderate')}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="tvInternetCosts"
                        checked={helpAnswers.tvInternetCosts === 'low'}
                        onChange={() => setHelpAnswers({ ...helpAnswers, tvInternetCosts: 'low' })}
                        className="w-3 h-3"
                      />
                      {t('costs.helpModal.question8_low')}
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <Button
                  onClick={applyHelpAnswers}
                  className="flex-1 text-sm"
                  size="sm"
                >
                  {t('costs.helpModal.apply')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowHelpModal(false);
                    setHelpAnswers({
                      hasCar: null,
                      vacationCosts: null,
                      goesOutOften: null,
                      foodExpenses: null,
                      privateInsurance: null,
                      publicTransport: null,
                      clothingShopping: null,
                      tvInternetCosts: null
                    });
                  }}
                  className="flex-1 text-sm"
                  size="sm"
                >
                  {t('costs.helpModal.cancel')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div >
  );
};

export default Costs;
