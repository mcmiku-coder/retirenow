import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../utils/apiConfig';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import PageHeader from '../../components/PageHeader';
import { toast } from 'sonner';
import {
    TrendingUp, Plus, Trash2, Download, AlertTriangle,
    CheckCircle, XCircle, Edit2, X, Info, RotateCcw,
    Landmark, Home, Coins, Banknote, Save
} from 'lucide-react';
import {
    CATALOG_VERSION,
    INSTRUMENT_CATALOG,
    getAllInstruments,
    validateInstrument,
    calculateMetrics
} from '../../shared/instruments';
import { getAssetClassStyle } from '../../data/investmentProducts';

/**
 * AdminInstruments - Code Authoring Tool
 * 
 * This is NOT a CRUD system. It's a source code generation tool.
 * 
 * Purpose:
 * - Edit instruments in local memory
 * - Validate data integrity
 * - Preview calculated metrics
 * - Generate deployable source code file
 * 
 * Workflow:
 * 1. Load current catalog from code
 * 2. Make changes in memory (local state)
 * 3. Validate changes
 * 4. Generate new catalog source file
 * 5. Download file → Commit to Git → Deploy
 * 
 * NO runtime persistence. NO database. Changes require deployment.
 */
export default function AdminInstruments({ token }) {
    // Local editing state (NOT persisted)
    const [instruments, setInstruments] = useState([]);
    const [validationErrors, setValidationErrors] = useState([]);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingInstrument, setEditingInstrument] = useState(null);
    const [parseErrors, setParseErrors] = useState([]); // CSV parse errors
    const [newInstrument, setNewInstrument] = useState({
        id: '',
        name: '',
        assetClass: 'Equities',
        quotationCurrency: 'CHF',
        frequency: 'monthly', // ALWAYS monthly (architectural requirement)
        active: true,
        timeSeries: []
    });

    // Load catalog from code on mount
    useEffect(() => {
        // Load current catalog into local state for editing
        setInstruments(getAllInstruments());
    }, []);

    // Validate all instruments whenever they change
    useEffect(() => {
        validateAllInstruments();
    }, [instruments]);

    // Helper: Convert time series to CSV format (dd.mm.yyyy)
    const timeSeriesToCSV = (timeSeries) => {
        if (!timeSeries || timeSeries.length === 0) return '';
        return timeSeries.map(point => {
            // Convert YYYY-MM-DD to dd.mm.yyyy for display
            const [year, month, day] = point.date.split('-');
            return `${day}.${month}.${year},${point.value}`;
        }).join('\n');
    };

    // Helper: Convert CSV to time series JSON with STRICT validation
    // Returns both parsed data and any errors encountered
    const csvToTimeSeries = (csv) => {
        if (!csv || csv.trim() === '') {
            return { timeSeries: [], errors: [] };
        }

        const lines = csv.trim().split('\n');
        const timeSeries = [];
        const parseErrors = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines

            const parts = line.split(',');
            if (parts.length !== 2) {
                parseErrors.push(`Line ${i + 1}: Invalid format (expected dd.mm.yyyy,value)`);
                continue;
            }

            const dateStr = parts[0].trim();
            const valueStr = parts[1].trim();

            // Parse dd.mm.yyyy format
            const dateParts = dateStr.split('.');
            if (dateParts.length !== 3) {
                parseErrors.push(`Line ${i + 1}: Invalid date format "${dateStr}" (expected dd.mm.yyyy)`);
                continue;
            }

            const day = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]);
            const year = parseInt(dateParts[2]);

            // Validate date components
            if (isNaN(day) || isNaN(month) || isNaN(year)) {
                parseErrors.push(`Line ${i + 1}: Invalid date "${dateStr}" (non-numeric components)`);
                continue;
            }

            if (month < 1 || month > 12) {
                parseErrors.push(`Line ${i + 1}: Invalid month ${month} (must be 1-12)`);
                continue;
            }

            if (day < 1 || day > 31) {
                parseErrors.push(`Line ${i + 1}: Invalid day ${day} (must be 1-31)`);
                continue;
            }

            if (year < 1900 || year > 2100) {
                parseErrors.push(`Line ${i + 1}: Invalid year ${year} (must be 1900-2100)`);
                continue;
            }

            // Parse and validate value
            const value = parseFloat(valueStr);

            if (isNaN(value)) {
                parseErrors.push(`Line ${i + 1}: Invalid value "${valueStr}" (must be numeric)`);
                continue;
            }

            if (value <= 0) {
                parseErrors.push(`Line ${i + 1}: Value must be > 0 (got ${value})`);
                continue;
            }

            // Convert to YYYY-MM-DD for storage
            const paddedDay = String(day).padStart(2, '0');
            const paddedMonth = String(month).padStart(2, '0');
            const date = `${year}-${paddedMonth}-${paddedDay}`;

            timeSeries.push({ date, value });
        }

        return { timeSeries, errors: parseErrors };
    };

    const validateAllInstruments = () => {
        const errors = [];

        instruments.forEach((inst, index) => {
            const result = validateInstrument(inst, instruments);
            if (!result.valid) {
                errors.push({
                    instrument: inst.name || inst.id || `#${index}`,
                    errors: result.errors
                });
            }
        });

        setValidationErrors(errors);
    };

    const handleAddInstrument = () => {
        // Full validation
        const result = validateInstrument(newInstrument, instruments.filter(i => i.id !== editingInstrument?.id));
        if (!result.valid) {
            toast.error(`Validation failed: ${result.errors.join(', ')}`);
            return;
        }

        if (editingInstrument) {
            // Edit mode - update existing instrument
            setInstruments(instruments.map(inst =>
                inst.id === editingInstrument.id ? { ...newInstrument } : inst
            ));
            toast.success('Instrument updated in draft catalog');
        } else {
            // Add mode - add new instrument
            setInstruments([...instruments, { ...newInstrument }]);
            toast.success('Instrument added to draft catalog');
        }

        // Reset form
        setNewInstrument({
            id: '',
            name: '',
            assetClass: 'Equities',
            quotationCurrency: 'CHF',
            frequency: 'monthly', // ALWAYS monthly
            active: true,
            timeSeries: []
        });
        setParseErrors([]);
        setEditingInstrument(null);
        setShowAddDialog(false);
    };

    const handleDeleteInstrument = (id) => {
        if (!confirm(`Delete instrument "${id}"? This change is local only until you generate the catalog.`)) {
            return;
        }

        setInstruments(instruments.filter(inst => inst.id !== id));
        toast.success('Instrument removed from draft');
    };

    const handleToggleActive = (id) => {
        setInstruments(instruments.map(inst =>
            inst.id === id ? { ...inst, active: !inst.active } : inst
        ));
    };

    const handleGenerateCatalog = () => {
        if (validationErrors.length > 0) {
            toast.error('Cannot generate catalog with validation errors');
            return;
        }

        const newVersion = CATALOG_VERSION + 1;
        const timestamp = new Date().toISOString();

        const code = `/**
 * INSTRUMENT CATALOG - Code-Owned Source File
 * 
 * This file contains the complete instrument catalog with 20-25 years of historical data.
 * Loaded in-memory at runtime. Changes require Git commit and deployment.
 * 
 * DO NOT EDIT MANUALLY - Use Admin Authoring Tool at /admin/instruments
 * 
 * Version: ${newVersion}
 * Last Updated: ${timestamp}
 * Generated by: Admin Authoring Tool
 */

export const CATALOG_VERSION = ${newVersion};

export const INSTRUMENT_CATALOG = ${JSON.stringify(instruments, null, 4)};
`;

        // Download file
        downloadFile('instrumentCatalog.js', code);

        toast.success(
            `Catalog v${newVersion} generated! Save to shared/instruments/instrumentCatalog.js, commit to Git, and deploy.`,
            { duration: 10000 }
        );
    };

    // Overwrite Source File (Dev Only)
    const handleOverwriteSource = async () => {
        // Validation Warning (Non-blocking for Dev convenience)
        if (validationErrors.length > 0) {
            if (!window.confirm(`⚠️ WARNING: There are ${validationErrors.length} validation errors in the catalog.\n\nRunning the app with invalid instruments may cause crashes.\n\nDo you want to proceed anyway?`)) {
                return;
            }
        }

        if (!window.confirm("⚠️ DANGER: This will overwrite 'frontend/src/shared/instruments/instrumentCatalog.js' on the server disk.\n\nAre you running locally and sure you want to do this?")) {
            return;
        }

        const newVersion = CATALOG_VERSION + 1;
        const timestamp = new Date().toISOString().split('T')[0];

        const code = `/**
 * INSTRUMENT CATALOG - Code-Owned Source File
 * 
 * This file contains the complete instrument catalog with 20-25 years of historical data.
 * Loaded in-memory at runtime. Changes require Git commit and deployment.
 * 
 * DO NOT EDIT MANUALLY - Use Admin Authoring Tool at /admin/instruments
 * 
 * Version: ${newVersion}
 * Last Updated: ${timestamp}
 */

export const CATALOG_VERSION = ${newVersion};

export const INSTRUMENT_CATALOG = ${JSON.stringify(instruments, null, 4)};
`;

        try {
            const activeToken = token || sessionStorage.getItem('admin_token');
            // Use full URL to avoid proxy issues, just in case
            const response = await fetch(`${API_BASE_URL}/api/admin/save-instrument-catalog`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${activeToken}`
                },
                body: JSON.stringify({ code })
            });

            if (response.ok) {
                toast.success("Source file overwritten successfully! Reloading application...", { duration: 2000 });
                // Force reload to pick up new catalog
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                const data = await response.json();
                toast.error(`Failed to overwrite: ${data.detail}`);
            }
        } catch (error) {
            console.error("Overwrite error:", error);
            toast.error("Error connecting to server");
        }
    };

    const downloadFile = (filename, content) => {
        const blob = new Blob([content], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleResetToCode = () => {
        if (!confirm('Reset to current code version? All local changes will be lost.')) {
            return;
        }

        setInstruments(getAllInstruments());
        toast.info('Reset to code version');
    };

    return (
        <div className="min-h-screen py-12 px-4">
            <div className="w-full max-w-[95%] mx-auto">
                <PageHeader
                    title="Instrument Catalog Authoring"
                    subtitle="Code generation tool - changes are NOT live"
                />

                {/* Warning Banner */}



                {/* Stats & Actions */}
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                    {/* Current Version */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Current Version
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">v{CATALOG_VERSION}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Next version will be: v{CATALOG_VERSION + 1}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Instrument Count */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Instruments in Draft
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{instruments.length}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {instruments.filter(i => i.active).length} active, {instruments.filter(i => !i.active).length} inactive
                            </p>
                        </CardContent>
                    </Card>

                    {/* Validation Status */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Validation Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {validationErrors.length === 0 ? (
                                <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="h-6 w-6" />
                                    <span className="font-semibold">Ready</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-red-600">
                                    <XCircle className="h-6 w-6" />
                                    <span className="font-semibold">{validationErrors.length} errors</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                    <Alert className="mb-6 border-red-500 bg-red-500/10">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <AlertTitle className="text-red-600">Validation Errors</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc list-inside space-y-1 mt-2">
                                {validationErrors.map((error, i) => (
                                    <li key={i} className="text-sm text-red-700">
                                        <strong>{error.instrument}:</strong> {error.errors.join(', ')}
                                    </li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Actions and Warning */}
                {/* Actions and Warning */}
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={() => setShowAddDialog(true)}
                            className="bg-blue-600 hover:bg-blue-700 w-full justify-start"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Instrument
                        </Button>

                        <div className="flex gap-2">
                            <Button
                                onClick={handleGenerateCatalog}
                                disabled={validationErrors.length > 0}
                                className="bg-green-600 hover:bg-green-700 flex-1 h-9"
                                size="sm"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Generate Source (v{CATALOG_VERSION + 1})
                            </Button>

                            <Button
                                onClick={handleOverwriteSource}
                                // disabled={validationErrors.length > 0} // Enabled for power users
                                variant="destructive"
                                size="sm"
                                className="h-9"
                                title="Directly overwrite the source file on disk (Dev Only)"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                Overwrite Source
                            </Button>

                            <Button
                                onClick={handleResetToCode}
                                variant="outline"
                                size="sm"
                                className="h-9"
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reset to current deployed version
                            </Button>
                        </div>
                    </div>

                    {/* Warning Banner - Spans 2 cols */}
                    <Alert className="bg-amber-500/10 m-0 py-3 border-none md:col-span-2 flex items-center">
                        <div className="flex items-center gap-3 w-full">
                            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                            <div className="text-sm text-amber-700 w-full">
                                <span className="font-semibold block mb-1">Authoring Tool - Not a Live Editor</span>
                                This tool generates source code files. Changes are stored in local memory only.
                                Click "Generate Catalog Source" to download, then commit to Git.
                            </div>
                        </div>
                    </Alert>
                </div>

                {/* Instruments Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Instruments ({instruments.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-3 font-medium">ID</th>
                                        <th className="text-left p-3 font-medium">Name</th>
                                        <th className="text-left p-3 font-medium">Asset Class</th>
                                        <th className="text-left p-3 font-medium">Currency</th>
                                        <th className="text-left p-3 font-medium">Frequency</th>
                                        <th className="text-left p-3 font-medium">Data Points</th>
                                        <th className="text-left p-3 font-medium">Active</th>
                                        <th className="text-left p-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {instruments.map((inst) => {
                                        const metrics = calculateMetrics(inst.timeSeries);

                                        return (
                                            <tr key={inst.id} className="border-b hover:bg-muted/50">
                                                <td className="p-3 font-mono text-sm">{inst.id}</td>
                                                <td className="p-3">{inst.name}</td>
                                                <td className="p-3">
                                                    <div className={`flex items-center gap-2 px-2 py-1 rounded w-fit ${getAssetClassStyle(inst.assetClass).bgColor} ${getAssetClassStyle(inst.assetClass).color}`}>
                                                        {inst.assetClass === 'Equities' && <TrendingUp className="h-4 w-4" />}
                                                        {inst.assetClass === 'Bonds' && <Landmark className="h-4 w-4" />}
                                                        {inst.assetClass === 'Real Estate' && <Home className="h-4 w-4" />}
                                                        {inst.assetClass === 'Commodities' && <Coins className="h-4 w-4" />}
                                                        {inst.assetClass === 'Money Market' && <Banknote className="h-4 w-4" />}
                                                        <span className="text-sm font-medium">{inst.assetClass}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-sm font-mono">{inst.quotationCurrency || 'CHF'}</td>
                                                <td className="p-3 text-sm">{inst.frequency}</td>
                                                <td className="p-3 text-sm">
                                                    {metrics ? metrics.dataPoints : 0}
                                                    {metrics && (
                                                        <span className="text-xs text-muted-foreground ml-2">
                                                            ({metrics.returns} returns)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={inst.active}
                                                        onChange={() => handleToggleActive(inst.id)}
                                                        className="w-4 h-4 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setEditingInstrument(inst);
                                                                // Force frequency to monthly (architectural requirement)
                                                                setNewInstrument({ ...inst, quotationCurrency: inst.quotationCurrency || 'CHF', frequency: 'monthly' });
                                                                setParseErrors([]);
                                                                setShowAddDialog(true);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-700"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteInstrument(inst.id)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Deployment Instructions */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5" />
                            Deployment Workflow
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                            <li>Make changes to instruments above (add/edit/delete)</li>
                            <li>Ensure all validation passes (green checkmark)</li>
                            <li>Click "Generate Catalog Source" to download <code className="bg-muted px-1 py-0.5 rounded">instrumentCatalog.js</code></li>
                            <li>Save the file to <code className="bg-muted px-1 py-0.5 rounded">shared/instruments/instrumentCatalog.js</code></li>
                            <li>Commit to Git: <code className="bg-muted px-1 py-0.5 rounded">git commit -m "Update catalog to v{CATALOG_VERSION + 1}"</code></li>
                            <li>Deploy to production</li>
                            <li>Users will automatically receive the new catalog on next page load</li>
                        </ol>
                    </CardContent>
                </Card>

                {/* Add Instrument Dialog */}
                {showAddDialog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <Card className="w-full max-w-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>{editingInstrument ? 'Edit Instrument' : 'Add New Instrument'}</span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            setShowAddDialog(false);
                                            setEditingInstrument(null);
                                            setParseErrors([]);
                                            setNewInstrument({
                                                id: '',
                                                name: '',
                                                assetClass: 'Equities',
                                                frequency: 'monthly',
                                                active: true,
                                                timeSeries: []
                                            });
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>ID *</Label>
                                    <Input
                                        value={newInstrument.id}
                                        onChange={(e) => setNewInstrument({ ...newInstrument, id: e.target.value })}
                                        placeholder="e.g., spy, vti, bnd"
                                    />
                                </div>

                                <div>
                                    <Label>Name *</Label>
                                    <Input
                                        value={newInstrument.name}
                                        onChange={(e) => setNewInstrument({ ...newInstrument, name: e.target.value })}
                                        placeholder="e.g., S&P 500 ETF"
                                    />
                                </div>

                                <div>
                                    <Label>Asset Class</Label>
                                    <select
                                        value={newInstrument.assetClass}
                                        onChange={(e) => setNewInstrument({ ...newInstrument, assetClass: e.target.value })}
                                        className="w-full p-2 border rounded bg-slate-800 text-white border-slate-600"
                                    >
                                        <option>Equities</option>
                                        <option>Bonds</option>
                                        <option>Real Estate</option>
                                        <option>Commodities</option>
                                        <option>Money Market</option>
                                    </select>
                                </div>

                                <div>
                                    <Label>Quotation Currency *</Label>
                                    <Input
                                        value={newInstrument.quotationCurrency}
                                        onChange={(e) => setNewInstrument({ ...newInstrument, quotationCurrency: e.target.value })}
                                        placeholder="e.g., CHF, USD, EUR"
                                    />
                                </div>

                                <div>
                                    <Label>Frequency</Label>
                                    <Input
                                        value="monthly"
                                        disabled
                                        className="bg-muted cursor-not-allowed"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Only monthly frequency is supported (architectural requirement)
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={newInstrument.active}
                                        onChange={(e) => setNewInstrument({ ...newInstrument, active: e.target.checked })}
                                        className="w-4 h-4"
                                    />
                                    <Label>Active</Label>
                                </div>

                                <div>
                                    <Label>Time Series Data (Monthly PRICES only) *</Label>

                                    <Alert className="mb-2 bg-blue-500/10 border-blue-500">
                                        <Info className="h-4 w-4" />
                                        <AlertDescription className="text-sm">
                                            <strong>MANDATORY:</strong> Upload monthly PRICES or NAV only.
                                            <br />• NOT returns, percentages, or normalized indices
                                            <br />• NOT annual data (monthly only)
                                            <br />• Format: dd.mm.yyyy,price (one per line)
                                            <br />• Minimum 24 consecutive months required
                                            <br />• No gaps, no duplicates, ascending order
                                        </AlertDescription>
                                    </Alert>

                                    <textarea
                                        value={timeSeriesToCSV(newInstrument.timeSeries)}
                                        onChange={(e) => {
                                            const result = csvToTimeSeries(e.target.value);
                                            setNewInstrument({ ...newInstrument, timeSeries: result.timeSeries });
                                            setParseErrors(result.errors);
                                        }}
                                        placeholder="31.01.2000,100&#13;&#10;29.02.2000,102&#13;&#10;31.03.2000,105&#13;&#10;..."
                                        className="w-full p-2 border rounded bg-slate-800 text-white border-slate-600 font-mono text-sm h-48"
                                    />

                                    {/* Parse errors */}
                                    {parseErrors.length > 0 && (
                                        <Alert className="mt-2 border-red-500 bg-red-500/10">
                                            <XCircle className="h-4 w-4 text-red-600" />
                                            <AlertTitle className="text-red-600">Parse Errors ({parseErrors.length})</AlertTitle>
                                            <AlertDescription>
                                                <div className="max-h-32 overflow-y-auto">
                                                    <ul className="list-disc list-inside text-xs space-y-0.5">
                                                        {parseErrors.slice(0, 10).map((err, i) => (
                                                            <li key={i} className="text-red-700">{err}</li>
                                                        ))}
                                                        {parseErrors.length > 10 && (
                                                            <li className="text-red-700 font-semibold">... and {parseErrors.length - 10} more errors</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {/* Validation summary */}
                                    <div className="text-xs mt-2 space-y-1">
                                        <p className={newInstrument.timeSeries?.length > 0 ? "text-green-600" : "text-muted-foreground"}>
                                            ✓ Parsed {newInstrument.timeSeries?.length || 0} data points
                                        </p>
                                        {newInstrument.timeSeries?.length > 0 && (
                                            <p className="text-muted-foreground">
                                                Date range: {newInstrument.timeSeries[0].date} to {newInstrument.timeSeries[newInstrument.timeSeries.length - 1].date}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription className="text-sm">
                                        <strong>Tip:</strong> Copy data from Excel (2 columns: date, value) and paste directly here.
                                        Format: Each line should be <code className="bg-muted px-1 rounded">dd.mm.yyyy,value</code> (e.g., 31.12.2000,100)
                                    </AlertDescription>
                                </Alert>

                                <div className="flex gap-2 justify-end">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowAddDialog(false);
                                            setEditingInstrument(null);
                                            setParseErrors([]);
                                            setNewInstrument({
                                                id: '',
                                                name: '',
                                                assetClass: 'Equities',
                                                frequency: 'monthly',
                                                active: true,
                                                timeSeries: []
                                            });
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleAddInstrument}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {editingInstrument ? 'Update Instrument' : 'Add Instrument'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
