import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import PageHeader from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import instrumentService from '../utils/instrumentService';
import { validateInstrumentData } from '../data/defaultInstruments';

/**
 * Simplified Instrument Manager
 * 
 * Core functionality:
 * - List instruments with computed parameters
 * - Add new instrument with validation
 * - Delete instrument with confirmation
 * - Toggle active/inactive status
 */
export default function InstrumentManager() {
    const { user, masterKey } = useAuth();
    const { t } = useLanguage();

    const email = user?.email;

    const [instruments, setInstruments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        assetClass: 'Equities',
        frequency: 'annual',
        timeSeriesText: '',
        active: true
    });
    const [formErrors, setFormErrors] = useState([]);

    // Load instruments on mount
    useEffect(() => {
        loadInstruments();
    }, [email, masterKey]);

    async function loadInstruments() {
        // Don't initialize if not authenticated
        if (!email || !masterKey) {
            console.log('[InstrumentManager] Skipping initialization - not authenticated');
            console.log('[InstrumentManager] Email:', email);
            console.log('[InstrumentManager] MasterKey exists:', !!masterKey);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            console.log('[InstrumentManager] Starting initialization...');
            console.log('[InstrumentManager] Email:', email);
            console.log('[InstrumentManager] MasterKey exists:', !!masterKey);

            // Initialize service
            await instrumentService.initialize(email, masterKey);

            console.log('[InstrumentManager] Service initialized successfully');

            // Get instruments with computed parameters
            const allInstruments = instrumentService.getInstruments();
            console.log('[InstrumentManager] Retrieved instruments:', allInstruments);
            console.log('[InstrumentManager] Instrument count:', allInstruments?.length);

            const instrumentsWithParams = allInstruments.map(inst => ({
                ...inst,
                parameters: instrumentService.getParameters(inst.id)
            }));

            console.log('[InstrumentManager] Instruments with params:', instrumentsWithParams);
            setInstruments(instrumentsWithParams);
        } catch (error) {
            console.error('[InstrumentManager] Failed to load instruments:', error);
            console.error('[InstrumentManager] Error stack:', error.stack);
            toast.error(`Failed to load instruments: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }

    function handleFormChange(field, value) {
        setFormData(prev => ({ ...prev, [field]: value }));
        setFormErrors([]); // Clear errors on change
    }

    function parseTimeSeries(text) {
        // Expected format: "2000-12-31,100\n2001-12-31,95\n..."
        const lines = text.trim().split('\n');
        const timeSeries = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(',');
            if (parts.length !== 2) {
                throw new Error(`Invalid format at line ${i + 1}: expected "date,value"`);
            }

            const date = parts[0].trim();
            const value = parseFloat(parts[1].trim());

            if (isNaN(value)) {
                throw new Error(`Invalid value at line ${i + 1}: "${parts[1]}"`);
            }

            timeSeries.push({ date, value });
        }

        return timeSeries;
    }

    async function handleAddInstrument() {
        try {
            // Parse time series
            let timeSeries;
            try {
                timeSeries = parseTimeSeries(formData.timeSeriesText);
            } catch (error) {
                setFormErrors([error.message]);
                return;
            }

            // Build instrument object
            const newInstrument = {
                id: formData.id.trim(),
                name: formData.name.trim(),
                assetClass: formData.assetClass,
                timeSeries,
                frequency: formData.frequency,
                active: formData.active
            };

            // Validate
            const validation = validateInstrumentData(newInstrument);
            if (!validation.valid) {
                setFormErrors(validation.errors);
                return;
            }

            // Check for duplicate ID
            if (instruments.some(inst => inst.id === newInstrument.id)) {
                setFormErrors(['Instrument ID already exists']);
                return;
            }

            // Save
            await instrumentService.saveInstrument(newInstrument);

            toast.success(`Instrument "${newInstrument.name}" added successfully`);

            // Reset form and reload
            setFormData({
                id: '',
                name: '',
                assetClass: 'Equities',
                frequency: 'annual',
                timeSeriesText: '',
                active: true
            });
            setShowAddForm(false);
            await loadInstruments();

        } catch (error) {
            console.error('Failed to add instrument:', error);
            toast.error('Failed to add instrument');
        }
    }

    async function handleDeleteInstrument(id) {
        try {
            await instrumentService.deleteInstrument(id);
            toast.success('Instrument deleted successfully');
            setDeleteConfirm(null);
            await loadInstruments();
        } catch (error) {
            console.error('Failed to delete instrument:', error);
            toast.error('Failed to delete instrument');
        }
    }

    async function handleToggleActive(instrument) {
        try {
            const updated = {
                ...instrument,
                active: !instrument.active
            };
            delete updated.parameters; // Remove computed params

            await instrumentService.saveInstrument(updated);
            toast.success(`Instrument ${updated.active ? 'activated' : 'deactivated'}`);
            await loadInstruments();
        } catch (error) {
            console.error('Failed to toggle instrument:', error);
            toast.error('Failed to update instrument');
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <PageHeader />
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="text-center">Loading instruments...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-grow bg-gradient-to-br from-gray-50 to-gray-100">
            <PageHeader />

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Instrument Manager</h1>
                        <p className="text-gray-600 mt-1">
                            Manage financial instruments and their historical data
                        </p>
                    </div>
                    <Button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Instrument
                    </Button>
                </div>

                {/* Add Instrument Form */}
                {showAddForm && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Add New Instrument</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* ID */}
                                <div>
                                    <Label>Instrument ID *</Label>
                                    <Input
                                        value={formData.id}
                                        onChange={(e) => handleFormChange('id', e.target.value)}
                                        placeholder="e.g., chspi"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Unique identifier (lowercase, no spaces)
                                    </p>
                                </div>

                                {/* Name */}
                                <div>
                                    <Label>Name *</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => handleFormChange('name', e.target.value)}
                                        placeholder="e.g., iShares Core SPI® ETF (CH)"
                                    />
                                </div>

                                {/* Asset Class */}
                                <div>
                                    <Label>Asset Class *</Label>
                                    <Select
                                        value={formData.assetClass}
                                        onValueChange={(value) => handleFormChange('assetClass', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Equities">Equities</SelectItem>
                                            <SelectItem value="Bonds">Bonds</SelectItem>
                                            <SelectItem value="Real Estate">Real Estate</SelectItem>
                                            <SelectItem value="Commodities">Commodities</SelectItem>
                                            <SelectItem value="Money Market">Money Market</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Frequency */}
                                <div>
                                    <Label>Frequency *</Label>
                                    <Select
                                        value={formData.frequency}
                                        onValueChange={(value) => handleFormChange('frequency', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="annual">Annual</SelectItem>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="daily">Daily</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Time Series */}
                                <div>
                                    <Label>Time Series Data *</Label>
                                    <textarea
                                        className="w-full h-32 p-2 border rounded-md font-mono text-sm"
                                        value={formData.timeSeriesText}
                                        onChange={(e) => handleFormChange('timeSeriesText', e.target.value)}
                                        placeholder="2000-12-31,100&#10;2001-12-31,95&#10;2002-12-31,102&#10;..."
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Format: date,value (one per line)
                                    </p>
                                </div>

                                {/* Errors */}
                                {formErrors.length > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                        <div className="flex items-start">
                                            <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-semibold text-red-900">Validation Errors:</p>
                                                <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                                                    {formErrors.map((error, idx) => (
                                                        <li key={idx}>{error}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        onClick={handleAddInstrument}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        Add Instrument
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setShowAddForm(false);
                                            setFormErrors([]);
                                        }}
                                        variant="outline"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Instruments List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Instruments ({instruments.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                                        <th className="text-left py-3 px-4 font-semibold">ID</th>
                                        <th className="text-left py-3 px-4 font-semibold">Name</th>
                                        <th className="text-left py-3 px-4 font-semibold">Asset Class</th>
                                        <th className="text-left py-3 px-4 font-semibold">Frequency</th>
                                        <th className="text-left py-3 px-4 font-semibold">Data Points</th>
                                        <th className="text-left py-3 px-4 font-semibold">Avg Return</th>
                                        <th className="text-left py-3 px-4 font-semibold">Volatility</th>
                                        <th className="text-right py-3 px-4 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {instruments.map((instrument) => (
                                        <tr key={instrument.id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-4">
                                                <button
                                                    onClick={() => handleToggleActive(instrument)}
                                                    className="flex items-center gap-1"
                                                >
                                                    {instrument.active !== false ? (
                                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                                    ) : (
                                                        <XCircle className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="py-3 px-4 font-mono text-sm">{instrument.id}</td>
                                            <td className="py-3 px-4">{instrument.name}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${instrument.assetClass === 'Equities' ? 'bg-red-100 text-red-700' :
                                                    instrument.assetClass === 'Bonds' ? 'bg-orange-100 text-orange-700' :
                                                        instrument.assetClass === 'Real Estate' ? 'bg-blue-100 text-blue-700' :
                                                            instrument.assetClass === 'Commodities' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-green-100 text-green-700'
                                                    }`}>
                                                    {instrument.assetClass}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 capitalize">{instrument.frequency}</td>
                                            <td className="py-3 px-4">{instrument.timeSeries?.length || 0}</td>
                                            <td className="py-3 px-4">
                                                {instrument.parameters?.avgReturn !== null && instrument.parameters?.avgReturn !== undefined
                                                    ? `${instrument.parameters.avgReturn.toFixed(2)}%`
                                                    : 'N/A'}
                                            </td>
                                            <td className="py-3 px-4">
                                                {instrument.parameters?.avgVolatility !== null && instrument.parameters?.avgVolatility !== undefined
                                                    ? `${instrument.parameters.avgVolatility.toFixed(2)}%`
                                                    : 'N/A'}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {deleteConfirm === instrument.id ? (
                                                    <div className="flex gap-2 justify-end">
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleDeleteInstrument(instrument.id)}
                                                        >
                                                            Confirm
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setDeleteConfirm(null)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setDeleteConfirm(instrument.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {instruments.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    No instruments found. Add your first instrument above.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                            <p className="font-semibold mb-1">About Instrument Data</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>All data is encrypted and stored locally in your browser</li>
                                <li>Parameters (return, volatility, correlations) are computed dynamically from time series</li>
                                <li>Inactive instruments are excluded from simulations but data is preserved</li>
                                <li>Deleting an instrument removes all historical data permanently</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
