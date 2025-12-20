import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { saveCostData, getCostData } from '../utils/database';
import { Trash2, Plus } from 'lucide-react';

const Costs = () => {
  const navigate = useNavigate();
  const { user, password } = useAuth();
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

    // Load existing data
    const loadData = async () => {
      try {
        const data = await getCostData(user.email, password);
        if (data && data.length > 0) {
          setRows(data);
          const maxId = Math.max(...data.map(r => r.id));
          setNextId(maxId + 1);
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
      categoryLocked: false
    }]);
    setNextId(nextId + 1);
  };

  const deleteRow = (id) => {
    setRows(rows.filter(row => row.id !== id));
  };

  const validateRows = () => {
    for (const row of rows) {
      // Check if row is partially filled
      const hasAnyData = row.amount || row.startDate || row.endDate;
      
      if (hasAnyData) {
        if (!row.amount) {
          toast.error(`Amount is required for ${row.name || 'row ' + row.id}`);
          return false;
        }
        if (!row.startDate) {
          toast.error(`Start date is required for ${row.name || 'row ' + row.id}`);
          return false;
        }
        if (row.frequency !== 'One-time' && !row.endDate) {
          toast.error(`End date is required for ${row.name || 'row ' + row.id}`);
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
      toast.success('Cost data saved securely');
      navigate('/financial-balance');
    } catch (error) {
      toast.error('Failed to save data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4" data-testid="costs-page">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">Cost Overview</h1>
          <p className="text-muted-foreground" data-testid="page-subtitle">
            Add all your expected expenses. You can leave rows empty if they don't apply to you.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-card border rounded-lg p-6 mb-6 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">Name</th>
                  <th className="text-left p-2 font-semibold">Amount</th>
                  <th className="text-left p-2 font-semibold">Frequency</th>
                  <th className="text-left p-2 font-semibold">Category</th>
                  <th className="text-left p-2 font-semibold">Start Date</th>
                  <th className="text-left p-2 font-semibold">End Date</th>
                  <th className="text-left p-2 font-semibold w-12"></th>
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
                          <Label htmlFor={`yearly-${row.id}`} className="text-sm">Yearly</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <RadioGroupItem value="Monthly" id={`monthly-${row.id}`} data-testid={`cost-freq-monthly-${index}`} />
                          <Label htmlFor={`monthly-${row.id}`} className="text-sm">Monthly</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <RadioGroupItem value="One-time" id={`onetime-${row.id}`} data-testid={`cost-freq-onetime-${index}`} />
                          <Label htmlFor={`onetime-${row.id}`} className="text-sm">One-time</Label>
                        </div>
                      </RadioGroup>
                    </td>
                    <td className="p-2">
                      <Input
                        data-testid={`cost-category-${index}`}
                        value={row.category}
                        onChange={(e) => updateRow(row.id, 'category', e.target.value)}
                        disabled={row.categoryLocked}
                        placeholder="Category"
                        className="min-w-[120px]"
                      />
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
                      {!row.locked && (
                        <Button
                          data-testid={`cost-delete-${index}`}
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRow(row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
              Add Cost Item
            </Button>
          </div>

          <Button
            data-testid="next-btn"
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Next - Financial Balance'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Costs;
