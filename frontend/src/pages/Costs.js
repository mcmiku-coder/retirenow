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
import { saveCostData, getCostData, getUserData } from '../utils/database';
import { Trash2, Plus } from 'lucide-react';
import { NavigationButtons } from '../components/NavigationButtons';

const Costs = () => {
  const navigate = useNavigate();
  const { user, password } = useAuth();
  const { t } = useLanguage();
  const [rows, setRows] = useState([
    { id: 1, name: 'Rent/Mortgage', amount: '', frequency: 'Monthly', category: 'Housing', startDate: '', endDate: '', locked: true, categoryLocked: true },
    { id: 2, name: 'Health insurance', amount: '', frequency: 'Monthly', category: 'Health', startDate: '', endDate: '', locked: true, categoryLocked: true },
    { id: 3, name: 'Food', amount: '', frequency: 'Monthly', category: 'Elementary', startDate: '', endDate: '', locked: true, categoryLocked: true },
    { id: 4, name: 'Clothing', amount: '', frequency: 'Monthly', category: 'Elementary', startDate: '', endDate: '', locked: true, categoryLocked: true },
    { id: 5, name: 'Private transportation', amount: '', frequency: 'Monthly', category: 'Transport', startDate: '', endDate: '', locked: true, categoryLocked: true },
    { id: 6, name: 'Public transportation', amount: '', frequency: 'Monthly', category: 'Transport', startDate: '', endDate: '', locked: true, categoryLocked: true },
    { id: 7, name: 'TV/Internet/Phone', amount: '', frequency: 'Monthly', category: 'Leisure', startDate: '', endDate: '', locked: true, categoryLocked: true },
    { id: 8, name: 'Restaurants', amount: '', frequency: 'Monthly', category: 'Leisure', startDate: '', endDate: '', locked: true, categoryLocked: true },
    { id: 9, name: 'Vacation', amount: '', frequency: 'Yearly', category: 'Leisure', startDate: '', endDate: '', locked: true, categoryLocked: true }
  ]);
  const [nextId, setNextId] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !password) {
      navigate('/');
      return;
    }

    // Load existing data or pre-fill with dates
    const loadData = async () => {
      try {
        const data = await getCostData(user.email, password);
        if (data && data.length > 0) {
          setRows(data);
          const maxId = Math.max(...data.map(r => r.id));
          setNextId(maxId + 1);
        } else {
          // Pre-fill dates with current date and death date
          const userData = await getUserData(user.email, password);
          if (userData) {
            const today = new Date().toISOString().split('T')[0];
            
            // Use the theoretical death date from API
            const deathDateStr = userData.theoreticalDeathDate || today;
            
            setRows([
              { id: 1, name: 'Rent/Mortgage', amount: '', frequency: 'Monthly', category: 'Housing', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
              { id: 2, name: 'Health insurance', amount: '', frequency: 'Monthly', category: 'Health', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
              { id: 3, name: 'Food', amount: '', frequency: 'Monthly', category: 'Elementary', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
              { id: 4, name: 'Clothing', amount: '', frequency: 'Monthly', category: 'Elementary', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
              { id: 5, name: 'Private transportation', amount: '', frequency: 'Monthly', category: 'Transport', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
              { id: 6, name: 'Public transportation', amount: '', frequency: 'Monthly', category: 'Transport', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
              { id: 7, name: 'TV/Internet/Phone', amount: '', frequency: 'Monthly', category: 'Leisure', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
              { id: 8, name: 'Restaurants', amount: '', frequency: 'Monthly', category: 'Leisure', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
              { id: 9, name: 'Vacation', amount: '', frequency: 'Yearly', category: 'Leisure', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true }
            ]);
          }
        }
      } catch (error) {
        console.error('Error loading cost data:', error);
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
      const deathDateStr = userData.theoreticalDeathDate || today;
      
      setRows([
        { id: 1, name: 'Rent/Mortgage', amount: '', frequency: 'Monthly', category: 'Housing', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
        { id: 2, name: 'Health insurance', amount: '', frequency: 'Monthly', category: 'Health', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
        { id: 3, name: 'Food', amount: '', frequency: 'Monthly', category: 'Elementary', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
        { id: 4, name: 'Clothing', amount: '', frequency: 'Monthly', category: 'Elementary', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
        { id: 5, name: 'Private transportation', amount: '', frequency: 'Monthly', category: 'Transport', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
        { id: 6, name: 'Public transportation', amount: '', frequency: 'Monthly', category: 'Transport', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
        { id: 7, name: 'TV/Internet/Phone', amount: '', frequency: 'Monthly', category: 'Leisure', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
        { id: 8, name: 'Restaurants', amount: '', frequency: 'Monthly', category: 'Leisure', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true },
        { id: 9, name: 'Vacation', amount: '', frequency: 'Yearly', category: 'Leisure', startDate: today, endDate: deathDateStr, locked: true, categoryLocked: true }
      ]);
      setNextId(10);
      toast.success(t('costs.resetSuccess'));
    }
  };

  const addRow = async () => {
    const userData = await getUserData(user.email, password);
    if (userData) {
      const today = new Date().toISOString().split('T')[0];
      const deathDateStr = userData.theoreticalDeathDate || today;
      
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
    }
  };

  const deleteRow = (id) => {
    setRows(rows.filter(row => row.id !== id));
    toast.success(t('costs.costDeleted'));
  };

  const validateRows = () => {
    for (const row of rows) {
      // Check if row is partially filled
      const hasAnyData = row.amount || row.startDate || row.endDate;
      
      if (hasAnyData) {
        if (!row.amount) {
          toast.error(`${t('costs.amount')} - ${row.name || 'row ' + row.id}`);
          return false;
        }
        if (!row.startDate) {
          toast.error(`${t('costs.startDate')} - ${row.name || 'row ' + row.id}`);
          return false;
        }
        if (row.frequency !== 'One-time' && !row.endDate) {
          toast.error(`${t('costs.endDate')} - ${row.name || 'row ' + row.id}`);
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
      await saveCostData(user.email, password, rows);
      toast.success(t('costs.saveSuccess'));
      navigate('/financial-balance');
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
    <div className="min-h-screen py-12 px-4" data-testid="costs-page">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">{t('costs.title')}</h1>
            <p className="text-muted-foreground" data-testid="page-subtitle">
              {t('costs.subtitle')}
            </p>
          </div>
          <NavigationButtons backPath="/income" />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-card border rounded-lg p-6 mb-6 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
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
                      <Input
                        data-testid={`cost-name-${index}`}
                        value={row.name}
                        onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                        disabled={row.locked}
                        className="min-w-[150px]"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        data-testid={`cost-amount-${index}`}
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
                          className="min-w-[120px]"
                        />
                      ) : (
                        <Select value={row.category} onValueChange={(value) => updateRow(row.id, 'category', value)}>
                          <SelectTrigger data-testid={`cost-category-${index}`} className="min-w-[120px]">
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

          <Button
            data-testid="next-btn"
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? t('common.loading') : t('costs.continue')}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Costs;
