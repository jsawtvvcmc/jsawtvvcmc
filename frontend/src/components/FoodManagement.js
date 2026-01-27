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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FoodManagement = () => {
  const { token } = useAuth();
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [newFood, setNewFood] = useState({
    name: '',
    unit: 'Kg'
  });

  const [stockAdd, setStockAdd] = useState({
    food_id: '',
    quantity: '',
    supplier: ''
  });

  useEffect(() => {
    fetchFoodItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFoodItems = async () => {
    try {
      const response = await axios.get(`${API}/food-items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFoodItems(response.data);
    } catch (error) {
      console.error('Error fetching food items:', error);
    }
  };

  const handleCreateFood = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await axios.post(`${API}/food-items`, newFood, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: 'Food item created successfully!' });
      setNewFood({ name: '', unit: 'Kg' });
      fetchFoodItems();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to create food item' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await axios.post(`${API}/food-items/stock/add`, {
        food_id: stockAdd.food_id,
        quantity: parseFloat(stockAdd.quantity),
        supplier: stockAdd.supplier || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: 'Stock added successfully!' });
      setStockAdd({ food_id: '', quantity: '', supplier: '' });
      fetchFoodItems();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to add stock' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Food Stock Management 🍞</h1>
        <p className="text-gray-600">Manage food inventory for animals</p>
      </div>

      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">Food Items</TabsTrigger>
          <TabsTrigger value="add">Add New Food</TabsTrigger>
          <TabsTrigger value="stock">Add Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Food Inventory ({foodItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Item Name</th>
                      <th className="text-left p-2">Unit</th>
                      <th className="text-left p-2">Current Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foodItems.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{item.name}</td>
                        <td className="p-2">{item.unit}</td>
                        <td className="p-2">
                          <span className={`font-bold ${item.current_stock < 50 ? 'text-red-600' : 'text-green-600'}`}>
                            {item.current_stock}
                            {item.current_stock < 50 && ' ⚠️'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Add New Food Item</CardTitle>
              <CardDescription>Create a new food item entry</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateFood} className="space-y-4">
                <div>
                  <Label htmlFor="name">Food Item Name *</Label>
                  <Input
                    id="name"
                    value={newFood.name}
                    onChange={(e) => setNewFood({...newFood, name: e.target.value})}
                    placeholder="e.g., Dog Food, Rice, Chicken"
                    required
                    data-testid="food-name-input"
                  />
                </div>

                <div>
                  <Label>Unit *</Label>
                  <Select 
                    value={newFood.unit}
                    onValueChange={(value) => setNewFood({...newFood, unit: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kg">Kg</SelectItem>
                      <SelectItem value="Liter">Liter</SelectItem>
                      <SelectItem value="Piece">Piece</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                  data-testid="create-food-button"
                >
                  {loading ? 'Creating...' : 'Create Food Item'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle>Add Stock</CardTitle>
              <CardDescription>Add stock to existing food items</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddStock} className="space-y-4">
                <div>
                  <Label>Select Food Item *</Label>
                  <Select 
                    value={stockAdd.food_id}
                    onValueChange={(value) => setStockAdd({...stockAdd, food_id: value})}
                  >
                    <SelectTrigger data-testid="food-select">
                      <SelectValue placeholder="Select food item" />
                    </SelectTrigger>
                    <SelectContent>
                      {foodItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} (Current: {item.current_stock} {item.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    value={stockAdd.quantity}
                    onChange={(e) => setStockAdd({...stockAdd, quantity: e.target.value})}
                    required
                    data-testid="quantity-input"
                  />
                </div>

                <div>
                  <Label htmlFor="supplier">Supplier (Optional)</Label>
                  <Input
                    id="supplier"
                    value={stockAdd.supplier}
                    onChange={(e) => setStockAdd({...stockAdd, supplier: e.target.value})}
                    placeholder="e.g., ABC Suppliers"
                  />
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
      </Tabs>
    </div>
  );
};

export default FoodManagement;