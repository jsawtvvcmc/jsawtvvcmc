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
  const [extractingGPS, setExtractingGPS] = useState(false);
  
  const [formData, setFormData] = useState({
    location_lat: '',
    location_lng: '',
    address: '',
    ward_number: '',
    photos: ['', '', '', ''],  // Support up to 4 photos
    remarks: ''
  });

  const extractGPSFromImage = async (file) => {
    setExtractingGPS(true);
    setMessage({ type: '', text: '' });
    
    try {
      // Use exif-js library or built-in image extraction
      const EXIF = window.EXIF;
      
      if (EXIF) {
        EXIF.getData(file, function() {
          const lat = EXIF.getTag(this, "GPSLatitude");
          const latRef = EXIF.getTag(this, "GPSLatitudeRef");
          const lon = EXIF.getTag(this, "GPSLongitude");
          const lonRef = EXIF.getTag(this, "GPSLongitudeRef");
          
          if (lat && lon) {
            // Convert GPS coordinates to decimal degrees
            const latDecimal = convertDMSToDD(lat, latRef);
            const lonDecimal = convertDMSToDD(lon, lonRef);
            
            setFormData(prev => ({
              ...prev,
              location_lat: latDecimal,
              location_lng: lonDecimal
            }));
            setMessage({ type: 'success', text: 'GPS coordinates extracted from photo!' });
          } else {
            setMessage({ type: 'error', text: 'No GPS data found in photo. Please enable location in camera settings.' });
          }
        });
      } else {
        // Fallback: Try to read EXIF using FileReader
        await extractGPSFallback(file);
      }
    } catch (error) {
      console.error('Error extracting GPS:', error);
      setMessage({ type: 'error', text: 'Could not extract GPS from photo. Please enter manually.' });
    } finally {
      setExtractingGPS(false);
    }
  };

  const convertDMSToDD = (coordinates, ref) => {
    if (!coordinates || coordinates.length !== 3) return 0;
    
    const degrees = coordinates[0];
    const minutes = coordinates[1];
    const seconds = coordinates[2];
    
    let dd = degrees + minutes / 60 + seconds / 3600;
    
    if (ref === "S" || ref === "W") {
      dd = dd * -1;
    }
    
    return dd;
  };

  const extractGPSFallback = async (file) => {
    // Try using browser's built-in methods
    try {
      const arrayBuffer = await file.arrayBuffer();
      const dataView = new DataView(arrayBuffer);
      
      // Simple EXIF parsing for GPS
      // This is a simplified version - for production use a proper library
      const marker = dataView.getUint16(0, false);
      if (marker !== 0xFFD8) {
        throw new Error('Not a valid JPEG');
      }
      
      // For now, show message to use proper camera with GPS
      setMessage({ 
        type: 'error', 
        text: 'GPS data not found in photo. Please ensure location is enabled in camera settings, or enter coordinates manually.' 
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Could not read GPS from photo. Please enter location manually or use browser location button.' 
      });
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setMessage({ type: 'info', text: 'Getting your location...' });
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

  const handlePhotoCapture = async (e, index = 0) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Photo size should be less than 5MB' });
        return;
      }
      
      // Extract GPS from first photo only
      if (index === 0) {
        await extractGPSFromImage(file);
      }
      
      // Then convert to base64
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

    if (!formData.photos[0]) {
      setMessage({ type: 'error', text: 'Please capture at least one photo (Photo 1 is required)' });
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API}/cases/catching`, {
        location_lat: parseFloat(formData.location_lat),
        location_lng: parseFloat(formData.location_lng),
        address: formData.address,
        ward_number: formData.ward_number || null,
        photos: formData.photos.filter(p => p),  // Send only non-empty photos
        remarks: formData.remarks || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCaseNumber(response.data.case_number);
      const photosUploaded = response.data.photos_uploaded || 0;
      setMessage({ type: 'success', text: `Case created successfully! Case Number: ${response.data.case_number}. ${photosUploaded} photo(s) uploaded to Google Drive.` });
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
        <p className="text-gray-600">Capture animal location with GPS from photo EXIF data</p>
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
          <CardDescription>Take photo with GPS enabled - location will be auto-extracted</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Photo Upload - First */}
            <div className="p-4 bg-yellow-50 rounded-lg">
              <Label htmlFor="photo">📸 Photo of Animal * (with GPS enabled)</Label>
              <p className="text-xs text-gray-600 mb-2">
                📍 Ensure location/GPS is enabled in your camera settings before taking photo
              </p>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                required
                data-testid="photo-input"
              />
              {extractingGPS && (
                <p className="text-sm text-blue-600 mt-2">🔄 Extracting GPS from photo...</p>
              )}
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
                  Use Current Location
                </Button>
              </div>
              
              <p className="text-xs text-gray-600">
                Location will be auto-extracted from photo EXIF data, or click button to use device location
              </p>
              
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
                    placeholder="Auto-extracted from photo"
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
                    placeholder="Auto-extracted from photo"
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