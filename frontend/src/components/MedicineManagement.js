import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import axios from 'axios';
import { Pencil, X, Check, TrendingUp, TrendingDown, Package } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MedicineManagement = () => {
  const { token } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [usageReport, setUsageReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  
  // Report filters
  const [reportPeriod, setReportPeriod] = useState('month');
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().substring(0, 7));
  const [reportWeek, setReportWeek] = useState('1');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const [newMedicine, setNewMedicine] = useState({
    name: '',
    generic_name: '',
    unit: 'Ml',
    packing: 'Bottle',
    packing_size: ''
  });

  const [stockAdd, setStockAdd] = useState({
    medicine_id: '',
    quantity: '',
    batch_number: '',
    expiry_date: '',
    received_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchMedicines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMedicines = async () => {
    try {
      const response = await axios.get(`${API}/medicines`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMedicines(response.data);
    } catch (error) {
      console.error('Error fetching medicines:', error);
    }
  };

  const handleCreateMedicine = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await axios.post(`${API}/medicines`, {
        ...newMedicine,
        packing_size: parseFloat(newMedicine.packing_size)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: 'Medicine created successfully!' });
      setNewMedicine({ name: '', generic_name: '', unit: 'Ml', packing: 'Bottle', packing_size: '' });
      fetchMedicines();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to create medicine' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(`${API}/medicines/stock/add`, {
        medicine_id: stockAdd.medicine_id,
        quantity: parseFloat(stockAdd.quantity),
        batch_number: stockAdd.batch_number || null,
        expiry_date: stockAdd.expiry_date || null,
        date: stockAdd.received_date || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = response.data;
      setMessage({ 
        type: 'success', 
        text: `Stock added: ${data.packs_added} packs = ${data.units_added} ${medicines.find(m => m.id === stockAdd.medicine_id)?.unit || 'units'}` 
      });
      setStockAdd({ medicine_id: '', quantity: '', batch_number: '', expiry_date: '', received_date: new Date().toISOString().split('T')[0] });
      fetchMedicines();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to add stock' });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (medicine) => {
    setEditingMedicine({
      ...medicine,
      packing_size: medicine.packing_size?.toString() || ''
    });
  };

  const cancelEditing = () => {
    setEditingMedicine(null);
  };

  const handleUpdateMedicine = async () => {
    if (!editingMedicine) return;
    
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await axios.put(`${API}/medicines/${editingMedicine.id}`, {
        name: editingMedicine.name,
        generic_name: editingMedicine.generic_name,
        unit: editingMedicine.unit,
        packing: editingMedicine.packing,
        packing_size: parseFloat(editingMedicine.packing_size) || 0
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: 'Medicine updated successfully!' });
      setEditingMedicine(null);
      fetchMedicines();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to update medicine' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageReport = async () => {
    setReportLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('period', reportPeriod);
      
      if (reportPeriod === 'month' || reportPeriod === 'week') {
        params.append('month', reportMonth);
      }
      if (reportPeriod === 'week') {
        params.append('week', reportWeek);
      }
      if (reportPeriod === 'custom') {
        params.append('start_date', customStartDate);
        params.append('end_date', customEndDate);
      }
      
      const response = await axios.get(`${API}/medicines/usage-report?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsageReport(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to fetch report' });
    } finally {
      setReportLoading(false);
    }
  };

  // Format stock display showing both units and packs
  const formatStock = (medicine) => {
    const stock = medicine.current_stock || 0;
    const packingSize = medicine.packing_size || 1;
    const packs = stock / packingSize;
    const unit = medicine.unit || '';
    
    // Round to avoid floating point issues
    const roundedStock = Math.round(stock * 100) / 100;
    const roundedPacks = Math.round(packs * 100) / 100;
    
    return {
      units: roundedStock,
      packs: roundedPacks,
      display: `${roundedStock} ${unit} (${roundedPacks.toFixed(2)} packs)`,
      isLow: roundedPacks < 5,
      isNegative: roundedStock < 0
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Medicine Management</h1>
        <p className="text-gray-600">Manage medicine inventory and stock</p>
      </div>

      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} 
               className={message.type === 'success' ? 'border-green-500 bg-green-50' : ''}>
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : ''}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">Medicine List</TabsTrigger>
          <TabsTrigger value="add">Add New Medicine</TabsTrigger>
          <TabsTrigger value="stock">Add Stock</TabsTrigger>
          <TabsTrigger value="report">Usage Report</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Medicine Inventory ({medicines.length})</CardTitle>
              <CardDescription>Click the edit icon to modify medicine details. Stock shown in units and packs.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Generic Name</th>
                      <th className="text-left p-3">Unit</th>
                      <th className="text-left p-3">Packing</th>
                      <th className="text-left p-3">Size/Pack</th>
                      <th className="text-left p-3">Current Stock</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.map((med) => {
                      const stockInfo = formatStock(med);
                      return (
                        <tr key={med.id} className="border-b hover:bg-gray-50">
                          {editingMedicine?.id === med.id ? (
                            // Editing mode
                            <>
                              <td className="p-2">
                                <Input
                                  value={editingMedicine.name}
                                  onChange={(e) => setEditingMedicine({...editingMedicine, name: e.target.value})}
                                  className="h-8"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  value={editingMedicine.generic_name || ''}
                                  onChange={(e) => setEditingMedicine({...editingMedicine, generic_name: e.target.value})}
                                  className="h-8"
                                  placeholder="Generic name"
                                />
                              </td>
                              <td className="p-2">
                                <Select 
                                  value={editingMedicine.unit}
                                  onValueChange={(value) => setEditingMedicine({...editingMedicine, unit: value})}
                                >
                                  <SelectTrigger className="h-8 w-20">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Ml">Ml</SelectItem>
                                    <SelectItem value="Mg">Mg</SelectItem>
                                    <SelectItem value="Pcs">Pcs</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-2">
                                <Select 
                                  value={editingMedicine.packing}
                                  onValueChange={(value) => setEditingMedicine({...editingMedicine, packing: value})}
                                >
                                  <SelectTrigger className="h-8 w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Bottle">Bottle</SelectItem>
                                    <SelectItem value="Vial">Vial</SelectItem>
                                    <SelectItem value="Pack">Pack</SelectItem>
                                    <SelectItem value="Ampoule">Ampoule</SelectItem>
                                    <SelectItem value="Tube">Tube</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editingMedicine.packing_size}
                                  onChange={(e) => setEditingMedicine({...editingMedicine, packing_size: e.target.value})}
                                  className="h-8 w-24"
                                />
                              </td>
                              <td className="p-2">
                                <span className={stockInfo.isNegative ? 'text-red-600' : stockInfo.isLow ? 'text-orange-600' : 'text-green-600'}>
                                  {stockInfo.display}
                                </span>
                              </td>
                              <td className="p-2">
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleUpdateMedicine}
                                    disabled={loading}
                                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={cancelEditing}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            // View mode
                            <>
                              <td className="p-3 font-medium">{med.name}</td>
                              <td className="p-3 text-gray-600">{med.generic_name || '-'}</td>
                              <td className="p-3">{med.unit}</td>
                              <td className="p-3">{med.packing}</td>
                              <td className="p-3">{med.packing_size} {med.unit}</td>
                              <td className="p-3">
                                <div className={`font-medium ${stockInfo.isNegative ? 'text-red-600' : stockInfo.isLow ? 'text-orange-600' : 'text-green-600'}`}>
                                  <div>{stockInfo.units} {med.unit}</div>
                                  <div className="text-xs text-gray-500">({stockInfo.packs.toFixed(2)} packs)</div>
                                  {stockInfo.isLow && !stockInfo.isNegative && <span className="text-orange-500">⚠️ Low</span>}
                                  {stockInfo.isNegative && <span className="text-red-500">❌ Negative</span>}
                                </div>
                              </td>
                              <td className="p-3">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEditing(med)}
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Add New Medicine</CardTitle>
              <CardDescription>Create a new medicine entry</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateMedicine} className="space-y-4">
                <div>
                  <Label htmlFor="name">Medicine Name *</Label>
                  <Input
                    id="name"
                    value={newMedicine.name}
                    onChange={(e) => setNewMedicine({...newMedicine, name: e.target.value})}
                    required
                    data-testid="medicine-name-input"
                  />
                </div>

                <div>
                  <Label htmlFor="generic_name">Generic Name</Label>
                  <Input
                    id="generic_name"
                    value={newMedicine.generic_name}
                    onChange={(e) => setNewMedicine({...newMedicine, generic_name: e.target.value})}
                    placeholder="e.g., Meloxicam, Ketamine HCl"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Unit *</Label>
                    <Select 
                      value={newMedicine.unit}
                      onValueChange={(value) => setNewMedicine({...newMedicine, unit: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ml">Ml</SelectItem>
                        <SelectItem value="Mg">Mg</SelectItem>
                        <SelectItem value="Pcs">Pcs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Packing *</Label>
                    <Select 
                      value={newMedicine.packing}
                      onValueChange={(value) => setNewMedicine({...newMedicine, packing: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bottle">Bottle</SelectItem>
                        <SelectItem value="Vial">Vial</SelectItem>
                        <SelectItem value="Pack">Pack</SelectItem>
                        <SelectItem value="Ampoule">Ampoule</SelectItem>
                        <SelectItem value="Tube">Tube</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="packing_size">Packing Size (units per pack) *</Label>
                    <Input
                      id="packing_size"
                      type="number"
                      step="0.01"
                      value={newMedicine.packing_size}
                      onChange={(e) => setNewMedicine({...newMedicine, packing_size: e.target.value})}
                      required
                      placeholder="e.g., 30, 100, 3375"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                  data-testid="create-medicine-button"
                >
                  {loading ? 'Creating...' : 'Create Medicine'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle>Add Stock</CardTitle>
              <CardDescription>Add stock in PACKS - will be converted to units automatically</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddStock} className="space-y-4">
                <div>
                  <Label>Select Medicine *</Label>
                  <Select 
                    value={stockAdd.medicine_id}
                    onValueChange={(value) => setStockAdd({...stockAdd, medicine_id: value})}
                  >
                    <SelectTrigger data-testid="medicine-select">
                      <SelectValue placeholder="Select medicine" />
                    </SelectTrigger>
                    <SelectContent>
                      {medicines.map((med) => {
                        const stockInfo = formatStock(med);
                        return (
                          <SelectItem key={med.id} value={med.id}>
                            {med.name} (Current: {stockInfo.packs.toFixed(2)} packs)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {stockAdd.medicine_id && (
                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                    {(() => {
                      const med = medicines.find(m => m.id === stockAdd.medicine_id);
                      if (!med) return null;
                      const packsToAdd = parseFloat(stockAdd.quantity) || 0;
                      const unitsToAdd = packsToAdd * (med.packing_size || 1);
                      return (
                        <>
                          <p><strong>Packing:</strong> {med.packing_size} {med.unit} per {med.packing}</p>
                          {packsToAdd > 0 && (
                            <p className="mt-1 text-green-700">
                              <strong>Will add:</strong> {packsToAdd} packs = {unitsToAdd} {med.unit}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                <div>
                  <Label htmlFor="quantity">Number of Packs *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="1"
                    min="1"
                    value={stockAdd.quantity}
                    onChange={(e) => setStockAdd({...stockAdd, quantity: e.target.value})}
                    required
                    placeholder="Enter number of packs"
                    data-testid="quantity-input"
                  />
                </div>

                <div>
                  <Label htmlFor="received_date">Date Received *</Label>
                  <Input
                    id="received_date"
                    type="date"
                    value={stockAdd.received_date}
                    onChange={(e) => setStockAdd({...stockAdd, received_date: e.target.value})}
                    required
                    data-testid="received-date-input"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="batch_number">Batch Number</Label>
                    <Input
                      id="batch_number"
                      value={stockAdd.batch_number}
                      onChange={(e) => setStockAdd({...stockAdd, batch_number: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="expiry_date">Expiry Date</Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={stockAdd.expiry_date}
                      onChange={(e) => setStockAdd({...stockAdd, expiry_date: e.target.value})}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                  data-testid="add-stock-button"
                >
                  {loading ? 'Adding...' : 'Add Stock'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report">
          <Card>
            <CardHeader>
              <CardTitle>Medicine Usage Report</CardTitle>
              <CardDescription>View restocking and usage for a selected period</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Period Selection */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>Period Type</Label>
                  <Select value={reportPeriod} onValueChange={setReportPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Full Month</SelectItem>
                      <SelectItem value="week">Week of Month</SelectItem>
                      <SelectItem value="custom">Custom Dates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(reportPeriod === 'month' || reportPeriod === 'week') && (
                  <div>
                    <Label>Month</Label>
                    <Input
                      type="month"
                      value={reportMonth}
                      onChange={(e) => setReportMonth(e.target.value)}
                    />
                  </div>
                )}

                {reportPeriod === 'week' && (
                  <div>
                    <Label>Week</Label>
                    <Select value={reportWeek} onValueChange={setReportWeek}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Week (1-7)</SelectItem>
                        <SelectItem value="2">2nd Week (8-14)</SelectItem>
                        <SelectItem value="3">3rd Week (15-21)</SelectItem>
                        <SelectItem value="4">4th Week (22-28)</SelectItem>
                        <SelectItem value="5">5th Week (29-31)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {reportPeriod === 'custom' && (
                  <>
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="flex items-end">
                  <Button 
                    onClick={fetchUsageReport}
                    disabled={reportLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {reportLoading ? 'Loading...' : 'Generate Report'}
                  </Button>
                </div>
              </div>

              {/* Report Results */}
              {usageReport && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-bold text-lg">{usageReport.period}</h3>
                    <p className="text-sm text-gray-600">
                      {usageReport.total_restock_entries} restock entries, {usageReport.total_usage_entries} usage entries
                    </p>
                  </div>

                  {usageReport.summary.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No medicine activity found for this period
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="text-left p-3 border">Medicine</th>
                            <th className="text-left p-3 border">Unit</th>
                            <th className="text-right p-3 border">
                              <div className="flex items-center justify-end gap-1">
                                <TrendingUp className="w-4 h-4 text-green-600" />
                                Restocked
                              </div>
                            </th>
                            <th className="text-right p-3 border">
                              <div className="flex items-center justify-end gap-1">
                                <TrendingDown className="w-4 h-4 text-red-600" />
                                Used
                              </div>
                            </th>
                            <th className="text-right p-3 border">
                              <div className="flex items-center justify-end gap-1">
                                <Package className="w-4 h-4 text-blue-600" />
                                Net Change
                              </div>
                            </th>
                            <th className="text-right p-3 border">Current Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usageReport.summary.map((item) => {
                            const netChange = item.restocked_units - item.used_units;
                            const currentPacks = (item.current_stock || 0) / (item.packing_size || 1);
                            return (
                              <tr key={item.medicine_id} className="hover:bg-gray-50">
                                <td className="p-3 border font-medium">{item.medicine_name}</td>
                                <td className="p-3 border">{item.unit}</td>
                                <td className="p-3 border text-right text-green-600">
                                  {item.restocked_units > 0 && (
                                    <>+{item.restocked_units} {item.unit}<br/>
                                    <span className="text-xs text-gray-500">({item.restocked_packs} packs)</span></>
                                  )}
                                </td>
                                <td className="p-3 border text-right text-red-600">
                                  {item.used_units > 0 && `-${item.used_units} ${item.unit}`}
                                </td>
                                <td className={`p-3 border text-right font-bold ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {netChange >= 0 ? '+' : ''}{netChange} {item.unit}
                                </td>
                                <td className="p-3 border text-right">
                                  {Math.round(item.current_stock * 100) / 100} {item.unit}
                                  <br/>
                                  <span className="text-xs text-gray-500">({currentPacks.toFixed(2)} packs)</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MedicineManagement;
