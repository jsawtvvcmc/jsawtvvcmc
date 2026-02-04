import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Pencil, X } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CatchingForm = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [caseNumber, setCaseNumber] = useState('');
  const [extractingGPS, setExtractingGPS] = useState(false);
  const [fetchingAddress, setFetchingAddress] = useState(false);
  const [recentCatchings, setRecentCatchings] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  
  // Get today's date in local timezone for default
  const getTodayDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };
  
  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };
  
  const [formData, setFormData] = useState({
    catching_date: getTodayDate(),
    catching_time: getCurrentTime(),
    location_lat: '',
    location_lng: '',
    address: '',
    ward_number: '',
    photos: ['', '', '', ''],
    remarks: ''
  });

  useEffect(() => {
    fetchRecentCatchings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRecentCatchings = async () => {
    try {
      const response = await axios.get(`${API}/cases?limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter to only show recent catchings (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recent = response.data.filter(c => {
        const catchDate = new Date(c.catching?.date_time || c.created_at);
        return catchDate >= sevenDaysAgo;
      }).slice(0, 10);
      setRecentCatchings(recent);
    } catch (error) {
      console.error('Error fetching recent catchings:', error);
    }
  };

  // Auto-fetch address when coordinates change
  const fetchAddressFromCoordinates = async (lat, lng) => {
    if (!lat || !lng) return;
    
    setFetchingAddress(true);
    try {
      const response = await axios.get(`${API}/geocode/reverse`, {
        params: { lat, lng },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.address) {
        setFormData(prev => ({
          ...prev,
          address: response.data.address
        }));
        setMessage({ type: 'success', text: 'GPS and address auto-detected from photo!' });
      }
    } catch (error) {
      console.error('Error fetching address:', error);
      // Don't show error - address can still be entered manually
    } finally {
      setFetchingAddress(false);
    }
  };

  const extractGPSFromImage = async (file) => {
    setExtractingGPS(true);
    setMessage({ type: 'info', text: 'Extracting GPS from photo...' });
    
    try {
      // Wait a moment for EXIF library to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use exif-js library
      const EXIF = window.EXIF;
      
      if (EXIF) {
        // Create a new FileReader to get the image as an array buffer
        const reader = new FileReader();
        reader.onload = async function(e) {
          try {
            // Create an image element
            const img = new Image();
            img.onload = async function() {
              EXIF.getData(img, async function() {
                const allTags = EXIF.getAllTags(this);
                console.log('EXIF Tags found:', allTags);
                
                const lat = EXIF.getTag(this, "GPSLatitude");
                const latRef = EXIF.getTag(this, "GPSLatitudeRef");
                const lon = EXIF.getTag(this, "GPSLongitude");
                const lonRef = EXIF.getTag(this, "GPSLongitudeRef");
                
                console.log('GPS Data:', { lat, latRef, lon, lonRef });
                
                if (lat && lon) {
                  // Convert GPS coordinates to decimal degrees
                  const latDecimal = convertDMSToDD(lat, latRef);
                  const lonDecimal = convertDMSToDD(lon, lonRef);
                  
                  console.log('Converted coordinates:', latDecimal, lonDecimal);
                  
                  setFormData(prev => ({
                    ...prev,
                    location_lat: latDecimal.toFixed(6),
                    location_lng: lonDecimal.toFixed(6)
                  }));
                  
                  // Auto-fetch address from coordinates
                  await fetchAddressFromCoordinates(latDecimal, lonDecimal);
                } else {
                  setMessage({ type: 'error', text: 'No GPS data found in photo. Please enable location in camera settings, or use "Use Current Location" button.' });
                }
                setExtractingGPS(false);
              });
            };
            img.src = e.target.result;
          } catch (err) {
            console.error('EXIF parsing error:', err);
            setMessage({ type: 'error', text: 'Could not parse GPS from photo. Please enter manually.' });
            setExtractingGPS(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        console.error('EXIF library not loaded');
        setMessage({ type: 'error', text: 'GPS extraction library not loaded. Please use "Use Current Location" button.' });
        setExtractingGPS(false);
      }
    } catch (error) {
      console.error('Error extracting GPS:', error);
      setMessage({ type: 'error', text: 'Could not extract GPS from photo. Please enter manually.' });
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
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setFormData(prev => ({
            ...prev,
            location_lat: lat,
            location_lng: lng
          }));
          
          // Auto-fetch address from coordinates
          await fetchAddressFromCoordinates(lat, lng);
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
      // Combine date and time
      const dateTime = `${formData.catching_date}T${formData.catching_time}:00`;
      
      const response = await axios.post(`${API}/cases/catching`, {
        date_time: dateTime,
        location_lat: parseFloat(formData.location_lat),
        location_lng: parseFloat(formData.location_lng),
        address: formData.address,
        ward_number: formData.ward_number || null,
        photos: formData.photos.filter(p => p),
        remarks: formData.remarks || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCaseNumber(response.data.case_number);
      const photosUploaded = response.data.photos_uploaded || 0;
      setMessage({ type: 'success', text: `Case created successfully! Case Number: ${response.data.case_number}. ${photosUploaded} photo(s) uploaded to Google Drive.` });
      setFormData({
        catching_date: getTodayDate(),
        catching_time: getCurrentTime(),
        location_lat: '',
        location_lng: '',
        address: '',
        ward_number: '',
        photos: ['', '', '', ''],
        remarks: ''
      });
      fetchRecentCatchings();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to create case' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCatching = (record) => {
    const catchingDate = record.catching?.date_time 
      ? new Date(record.catching.date_time).toISOString().split('T')[0]
      : getTodayDate();
    const catchingTime = record.catching?.date_time
      ? new Date(record.catching.date_time).toTimeString().slice(0, 5)
      : getCurrentTime();
    
    setEditingRecord({
      id: record.id,
      case_number: record.case_number,
      catching_date: catchingDate,
      catching_time: catchingTime,
      location_lat: record.catching?.location?.coordinates?.[1] || '',
      location_lng: record.catching?.location?.coordinates?.[0] || '',
      address: record.catching?.address || '',
      ward_number: record.catching?.ward_number || '',
      remarks: record.catching?.remarks || ''
    });
  };

  const handleUpdateCatching = async () => {
    setLoading(true);
    try {
      const dateTime = `${editingRecord.catching_date}T${editingRecord.catching_time}:00`;
      
      await axios.put(`${API}/cases/${editingRecord.id}/catching`, {
        date_time: dateTime,
        location_lat: parseFloat(editingRecord.location_lat),
        location_lng: parseFloat(editingRecord.location_lng),
        address: editingRecord.address,
        ward_number: editingRecord.ward_number || null,
        remarks: editingRecord.remarks || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: 'Catching record updated successfully!' });
      setEditingRecord(null);
      fetchRecentCatchings();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to update catching record' 
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
            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="catching_date">Catching Date *</Label>
                <Input
                  id="catching_date"
                  type="date"
                  value={formData.catching_date}
                  onChange={(e) => setFormData({...formData, catching_date: e.target.value})}
                  required
                  data-testid="catching-date-input"
                />
              </div>
              <div>
                <Label htmlFor="catching_time">Catching Time *</Label>
                <Input
                  id="catching_time"
                  type="time"
                  value={formData.catching_time}
                  onChange={(e) => setFormData({...formData, catching_time: e.target.value})}
                  required
                  data-testid="catching-time-input"
                />
              </div>
            </div>

            {/* Photo Upload - Multiple Photos */}
            <div className="p-4 bg-yellow-50 rounded-lg">
              <Label className="text-lg font-semibold">📸 Photos of Animal (4 max, first required)</Label>
              <p className="text-xs text-gray-600 mb-3">
                📍 Photo 1 is required and will be used to extract GPS. Enable location in camera settings.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="space-y-2">
                    <Label className="text-sm">
                      Photo {index + 1} {index === 0 ? '*' : '(optional)'}
                    </Label>
                    <Input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoCapture(e, index)}
                      required={index === 0}
                      data-testid={`photo-input-${index}`}
                      className="text-xs"
                    />
                    {formData.photos[index] && (
                      <div className="relative">
                        <img 
                          src={formData.photos[index]} 
                          alt={`Photo ${index + 1}`} 
                          className="w-full h-24 object-cover rounded border-2 border-green-500"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {extractingGPS && (
                <p className="text-sm text-blue-600 mt-2">🔄 Extracting GPS from photo...</p>
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
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="address">Address *</Label>
                {fetchingAddress && (
                  <span className="text-xs text-blue-600">🔄 Auto-detecting address...</span>
                )}
              </div>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Address will be auto-detected from GPS, or enter manually"
                required
                rows={3}
                data-testid="address-input"
                className={fetchingAddress ? 'bg-blue-50' : ''}
              />
              <p className="text-xs text-gray-500 mt-1">
                Address is automatically fetched from GPS coordinates using OpenStreetMap
              </p>
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

      {/* Recent Catchings Table */}
      {recentCatchings.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Recent Catchings (Last 7 Days)</CardTitle>
            <CardDescription>Click edit to modify catching records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Case No</th>
                    <th className="text-left p-2">Date/Time</th>
                    <th className="text-left p-2">Address</th>
                    <th className="text-left p-2">Ward</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCatchings.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{record.case_number}</td>
                      <td className="p-2">
                        {record.catching?.date_time 
                          ? new Date(record.catching.date_time).toLocaleString()
                          : 'N/A'}
                      </td>
                      <td className="p-2 max-w-xs truncate">{record.catching?.address || 'N/A'}</td>
                      <td className="p-2">{record.catching?.ward_number || '-'}</td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCatching(record)}
                          className="h-7 w-7 p-0"
                          data-testid={`edit-catching-${record.id}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Catching Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Catching Record</DialogTitle>
            <DialogDescription>
              Case: {editingRecord?.case_number}
            </DialogDescription>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={editingRecord.catching_date}
                    onChange={(e) => setEditingRecord({...editingRecord, catching_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Time *</Label>
                  <Input
                    type="time"
                    value={editingRecord.catching_time}
                    onChange={(e) => setEditingRecord({...editingRecord, catching_time: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editingRecord.location_lat}
                    onChange={(e) => setEditingRecord({...editingRecord, location_lat: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editingRecord.location_lng}
                    onChange={(e) => setEditingRecord({...editingRecord, location_lng: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={editingRecord.address}
                  onChange={(e) => setEditingRecord({...editingRecord, address: e.target.value})}
                />
              </div>
              <div>
                <Label>Ward Number</Label>
                <Input
                  value={editingRecord.ward_number}
                  onChange={(e) => setEditingRecord({...editingRecord, ward_number: e.target.value})}
                />
              </div>
              <div>
                <Label>Remarks</Label>
                <Textarea
                  value={editingRecord.remarks}
                  onChange={(e) => setEditingRecord({...editingRecord, remarks: e.target.value})}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecord(null)}>Cancel</Button>
            <Button onClick={handleUpdateCatching} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CatchingForm;