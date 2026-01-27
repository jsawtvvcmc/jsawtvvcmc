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
    location_lat: '',
    location_lng: '',
    address: '',
    photo_base64: '',
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

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, photo_base64: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await axios.post(`${API}/cases/${formData.case_id}/release`, {
        location_lat: parseFloat(formData.location_lat),
        location_lng: parseFloat(formData.location_lng),
        address: formData.address,
        photo_base64: formData.photo_base64,
        remarks: formData.remarks || null
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setMessage({ type: 'success', text: 'Animal released successfully!' });
      setFormData({ case_id: '', location_lat: '', location_lng: '', address: '', photo_base64: '', remarks: '' });
      fetchReadyCases();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed' });
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
            <div>
              <Label>Photo at Release *</Label>
              <Input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} required />
              {formData.photo_base64 && <img src={formData.photo_base64} alt="Release" className="mt-2 max-w-xs rounded" />}
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