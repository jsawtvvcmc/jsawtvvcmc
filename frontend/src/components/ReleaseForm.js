import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ReleaseForm = () => {
  const { token } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    case_id: '',
    release_date: new Date().toISOString().split('T')[0],
    release_time: new Date().toTimeString().slice(0, 5),
    location_lat: '',
    location_lng: '',
    address: '',
    photos: ['', '', '', ''],
    remarks: ''
  });

  useEffect(() => {
    fetchReadyCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReadyCases = async () => {
    try {
      const surgery = await axios.get(`${API}/cases?status=Surgery Completed`, { headers: { Authorization: `Bearer ${token}` } });
      const treatment = await axios.get(`${API}/cases?status=Under Treatment`, { headers: { Authorization: `Bearer ${token}` } });
      setCases([...surgery.data, ...treatment.data]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({...formData, location_lat: position.coords.latitude, location_lng: position.coords.longitude});
          setMessage({ type: 'success', text: 'Location captured!' });
        },
        () => setMessage({ type: 'error', text: 'Unable to get location' })
      );
    }
  };

  const handlePhotoCapture = (e, index = 0) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPhotos = [...formData.photos];
        newPhotos[index] = reader.result;
        setFormData({ ...formData, photos: newPhotos });
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index) => {
    const newPhotos = [...formData.photos];
    newPhotos[index] = '';
    setFormData({ ...formData, photos: newPhotos });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(`${API}/cases/${formData.case_id}/release`, {
        location_lat: parseFloat(formData.location_lat),
        location_lng: parseFloat(formData.location_lng),
        address: formData.address,
        photos: formData.photos.filter(p => p),
        remarks: formData.remarks || null
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      const photosUploaded = response.data.photos_uploaded || 0;
      setMessage({ type: 'success', text: `Animal released successfully! ${photosUploaded} photo(s) uploaded to Drive.` });
      setFormData({ case_id: '', location_lat: '', location_lng: '', address: '', photos: ['', '', '', ''], remarks: '' });
      fetchReadyCases();
    } catch (error) {
      const errorMessage = error.response?.data?.detail;
      let displayMessage = 'Failed to release animal';
      if (typeof errorMessage === 'string') {
        displayMessage = errorMessage;
      } else if (Array.isArray(errorMessage)) {
        displayMessage = errorMessage.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
      } else if (errorMessage) {
        displayMessage = JSON.stringify(errorMessage);
      }
      console.error('Release error:', error.response?.data || error);
      setMessage({ type: 'error', text: displayMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Release/Dispatch ✅</h1>
      {message.text && <Alert variant={message.type === 'error' ? 'destructive' : 'default'}><AlertDescription>{message.text}</AlertDescription></Alert>}
      <Card>
        <CardHeader><CardTitle>Release Animal</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Select Case *</Label>
              <Select value={formData.case_id} onValueChange={(value) => setFormData({...formData, case_id: value})} required>
                <SelectTrigger><SelectValue placeholder="Select case" /></SelectTrigger>
                <SelectContent>
                  {cases.map(c => <SelectItem key={c.id} value={c.id}>{c.case_number} - Kennel {c.initial_observation?.kennel_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-blue-50 rounded space-y-3">
              <div className="flex justify-between">
                <Label>📍 GPS Location</Label>
                <Button type="button" onClick={getCurrentLocation} variant="outline" size="sm">Get Location</Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Latitude *</Label><Input type="number" step="any" value={formData.location_lat} onChange={(e) => setFormData({...formData, location_lat: e.target.value})} required /></div>
                <div><Label>Longitude *</Label><Input type="number" step="any" value={formData.location_lng} onChange={(e) => setFormData({...formData, location_lng: e.target.value})} required /></div>
              </div>
            </div>
            <div>
              <Label>Release Address *</Label>
              <Textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required rows={3} />
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <Label className="text-lg font-semibold">📸 Release Photos (4 max, first required)</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="space-y-2">
                    <Label className="text-sm">Photo {index + 1} {index === 0 ? '*' : '(optional)'}</Label>
                    <Input type="file" accept="image/*" capture="environment" onChange={(e) => handlePhotoCapture(e, index)} required={index === 0} className="text-xs" />
                    {formData.photos[index] && (
                      <div className="relative">
                        <img src={formData.photos[index]} alt={`Photo ${index + 1}`} className="w-full h-24 object-cover rounded border-2 border-green-500" />
                        <button type="button" onClick={() => removePhoto(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs">✕</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} rows={2} />
            </div>
            <Button type="submit" disabled={loading || cases.length === 0} className="w-full bg-green-600 hover:bg-green-700 text-lg py-6">
              {loading ? 'Releasing...' : '✓ Release Animal'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReleaseForm;