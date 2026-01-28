import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DailyFeeding = () => {
  const { token } = useAuth();
  const [kennels, setKennels] = useState([]);
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedKennels, setSelectedKennels] = useState([]);
  const [selectedFood, setSelectedFood] = useState({});
  const [mealTime, setMealTime] = useState('Morning');
  const [photos, setPhotos] = useState(['', '', '', '']);

  useEffect(() => {
    fetchOccupiedKennels();
    fetchFoodItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOccupiedKennels = async () => {
    try {
      const response = await axios.get(`${API}/kennels?status_filter=occupied`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKennels(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchFoodItems = async () => {
    try {
      const response = await axios.get(`${API}/food-items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFoodItems(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handlePhotoCapture = (e, index = 0) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPhotos = [...photos];
        newPhotos[index] = reader.result;
        setPhotos(newPhotos);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index) => {
    const newPhotos = [...photos];
    newPhotos[index] = '';
    setPhotos(newPhotos);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const totalQuantity = Object.values(selectedFood).reduce((sum, qty) => sum + parseFloat(qty || 0), 0);

    try {
      const response = await axios.post(`${API}/daily-feeding`, {
        meal_time: mealTime,
        kennel_numbers: selectedKennels,
        food_items: selectedFood,
        total_quantity: totalQuantity,
        photos: photos.filter(p => p)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const photosUploaded = response.data.photos_uploaded || 0;
      setMessage({ type: 'success', text: `Feeding record created successfully! ${photosUploaded} photo(s) uploaded to Drive.` });
      setSelectedKennels([]);
      setSelectedFood({});
      setPhotos(['', '', '', '']);
      fetchFoodItems();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Daily Feeding 🍲</h1>
      {message.text && <Alert variant={message.type === 'error' ? 'destructive' : 'default'}><AlertDescription>{message.text}</AlertDescription></Alert>}
      <Card>
        <CardHeader><CardTitle>Record Feeding</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Meal Time *</Label>
              <Select value={mealTime} onValueChange={setMealTime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning">Morning</SelectItem>
                  <SelectItem value="Evening">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Select Kennels ({kennels.length} occupied)</Label>
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 border rounded">
                {kennels.map(k => (
                  <label key={k.id} className="flex items-center space-x-1 text-sm">
                    <input type="checkbox" checked={selectedKennels.includes(k.kennel_number)} onChange={(e) => {
                      if (e.target.checked) setSelectedKennels([...selectedKennels, k.kennel_number]);
                      else setSelectedKennels(selectedKennels.filter(n => n !== k.kennel_number));
                    }} />
                    <span>{k.kennel_number}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Food Items</Label>
              {foodItems.map(item => (
                <div key={item.id} className="flex gap-2 items-center mb-2">
                  <span className="w-40">{item.name}</span>
                  <Input type="number" step="0.1" placeholder="Quantity" value={selectedFood[item.id] || ''} onChange={(e) => setSelectedFood({...selectedFood, [item.id]: e.target.value})} />
                </div>
              ))}
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <Label className="text-lg font-semibold">📸 Feeding Photos (4 max, first required)</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="space-y-2">
                    <Label className="text-sm">Photo {index + 1} {index === 0 ? '*' : '(optional)'}</Label>
                    <Input type="file" accept="image/*" capture="environment" onChange={(e) => handlePhotoCapture(e, index)} required={index === 0} className="text-xs" />
                    {photos[index] && (
                      <div className="relative">
                        <img src={photos[index]} alt={`Photo ${index + 1}`} className="w-full h-24 object-cover rounded border-2 border-green-500" />
                        <button type="button" onClick={() => removePhoto(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs">✕</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={loading || selectedKennels.length === 0} className="w-full bg-green-600 hover:bg-green-700">
              {loading ? 'Saving...' : '✓ Save Feeding Record'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyFeeding;