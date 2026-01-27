import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CatchingForm = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [caseNumber, setCaseNumber] = useState('');
  
  const [formData, setFormData] = useState({
    location_lat: '',
    location_lng: '',
    address: '',
    ward_number: '',
    photo_base64: '',
    remarks: ''
  });

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            location_lat: position.coords.latitude,
            location_lng: position.coords.longitude
          });
          setMessage({ type: 'success', text: 'Location captured successfully!' });
        },
        (error) => {
          setMessage({ type: 'error', text: 'Unable to get location. Please enter manually.' });
        }
      );
    } else {
      setMessage({ type: 'error', text: 'Geolocation is not supported by this browser.' });
    }
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Photo size should be less than 5MB' });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo_base64: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (!formData.photo_base64) {
      setMessage({ type: 'error', text: 'Please capture a photo' });
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API}/cases/catching`, {
        location_lat: parseFloat(formData.location_lat),
        location_lng: parseFloat(formData.location_lng),
        address: formData.address,
        ward_number: formData.ward_number || null,
        photo_base64: formData.photo_base64,
        remarks: formData.remarks || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCaseNumber(response.data.case_number);
      setMessage({ type: 'success', text: `Case created successfully! Case Number: ${response.data.case_number}` });
      setFormData({
        location_lat: '',
        location_lng: '',
        address: '',
        ward_number: '',
        photo_base64: '',
        remarks: ''
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to create case' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Catching Form 🚗</h1>
        <p className="text-gray-600">Capture animal location with GPS and photos</p>
      </div>

      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {caseNumber && (
        <Card className="border-green-500 border-2">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-lg font-semibold text-green-700">✅ Case Created Successfully!</p>
              <p className="text-3xl font-bold text-green-900 my-2">{caseNumber}</p>
              <p className="text-sm text-gray-600">Animal has been registered in the system</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>New Catching Record</CardTitle>
          <CardDescription>Record animal capture details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* GPS Location */}
            <div className="p-4 bg-blue-50 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">📍 GPS Location</Label>
                <Button 
                  type="button" 
                  onClick={getCurrentLocation}
                  variant="outline"
                  size="sm"
                  data-testid="get-location-button"
                >
                  Get Current Location
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitude *</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.location_lat}
                    onChange={(e) => setFormData({...formData, location_lat: e.target.value})}
                    required
                    data-testid="latitude-input"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude *</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.location_lng}
                    onChange={(e) => setFormData({...formData, location_lng: e.target.value})}
                    required
                    data-testid="longitude-input"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Enter complete address where animal was caught"
                required
                rows={3}
                data-testid="address-input"
              />
            </div>

            {/* Ward Number */}
            <div>
              <Label htmlFor="ward_number">Ward Number (Optional)</Label>
              <Input
                id="ward_number"
                value={formData.ward_number}
                onChange={(e) => setFormData({...formData, ward_number: e.target.value})}
                placeholder="e.g., Ward 5"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <Label htmlFor="photo">Photo of Animal *</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                required
                data-testid="photo-input"
              />
              {formData.photo_base64 && (
                <div className="mt-2">
                  <img 
                    src={formData.photo_base64} 
                    alt="Captured animal" 
                    className="max-w-xs rounded-lg border-2 border-green-500"
                  />
                </div>
              )}
            </div>

            {/* Remarks */}
            <div>
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
              data-testid="submit-catching-form"
            >
              {loading ? 'Creating Case...' : '✓ Create Catching Record'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CatchingForm;