import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Alert, AlertDescription } from './ui/alert';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InitialObservations = () => {
  const { token } = useAuth();
  const [cases, setCases] = useState([]);
  const [kennels, setKennels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const COLOR_OPTIONS = ['Black', 'White', 'Dark Brown', 'Light Brown', 'Grey', 'Fawn'];
  
  const [formData, setFormData] = useState({
    case_id: '',
    kennel_number: '',
    gender: 'Male',
    approximate_age: 'Adult 2-8 years',
    selected_colors: [],
    body_condition: 'Normal',
    temperament: 'Calm',
    visible_injuries: false,
    injury_description: '',
    photo_base64: '',
    remarks: ''
  });

  const handleColorToggle = (color) => {
    setFormData(prev => {
      const colors = prev.selected_colors.includes(color)
        ? prev.selected_colors.filter(c => c !== color)
        : [...prev.selected_colors, color];
      return { ...prev, selected_colors: colors };
    });
  };

  useEffect(() => {
    fetchCaughtCases();
    fetchAvailableKennels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCaughtCases = async () => {
    try {
      const response = await axios.get(`${API}/cases?status=Caught`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCases(response.data);
    } catch (error) {
      console.error('Error fetching cases:', error);
    }
  };

  const fetchAvailableKennels = async () => {
    try {
      const response = await axios.get(`${API}/kennels?status_filter=available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKennels(response.data);
    } catch (error) {
      console.error('Error fetching kennels:', error);
    }
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
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

    if (formData.selected_colors.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one color' });
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${API}/cases/${formData.case_id}/initial-observation`, {
        kennel_number: parseInt(formData.kennel_number),
        gender: formData.gender,
        approximate_age: formData.approximate_age,
        color_markings: formData.selected_colors.join(', '),
        body_condition: formData.body_condition,
        temperament: formData.temperament,
        visible_injuries: formData.visible_injuries,
        injury_description: formData.injury_description || null,
        photo_base64: formData.photo_base64,
        remarks: formData.remarks || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: 'Initial observation added successfully!' });
      setFormData({
        case_id: '',
        kennel_number: '',
        gender: 'Male',
        approximate_age: 'Adult 2-8 years',
        selected_colors: [],
        body_condition: 'Normal',
        temperament: 'Calm',
        visible_injuries: false,
        injury_description: '',
        photo_base64: '',
        remarks: ''
      });
      fetchCaughtCases();
      fetchAvailableKennels();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to add observation' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Initial Observations 📋</h1>
        <p className="text-gray-600">Record animal details and assign kennel</p>
      </div>

      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Add Initial Observation</CardTitle>
          <CardDescription>Select a caught case and record animal details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Case Selection */}
            <div className="p-4 bg-green-50 rounded-lg">
              <Label>Select Case *</Label>
              <Select 
                value={formData.case_id}
                onValueChange={(value) => setFormData({...formData, case_id: value})}
                required
              >
                <SelectTrigger data-testid="case-select">
                  <SelectValue placeholder="Select a caught case" />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.case_number} - {c.catching.address.substring(0, 50)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cases.length === 0 && (
                <p className="text-sm text-gray-600 mt-2">No caught cases available. Create a catching record first.</p>
              )}
            </div>

            {/* Kennel Assignment */}
            <div>
              <Label>Assign Kennel *</Label>
              <Select 
                value={formData.kennel_number}
                onValueChange={(value) => setFormData({...formData, kennel_number: value})}
                required
              >
                <SelectTrigger data-testid="kennel-select">
                  <SelectValue placeholder="Select available kennel" />
                </SelectTrigger>
                <SelectContent>
                  {kennels.slice(0, 50).map((k) => (
                    <SelectItem key={k.id} value={k.kennel_number.toString()}>
                      Kennel {k.kennel_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600 mt-1">{kennels.length} kennels available</p>
            </div>

            {/* Gender */}
            <div>
              <Label>Gender *</Label>
              <RadioGroup 
                value={formData.gender} 
                onValueChange={(value) => setFormData({...formData, gender: value})}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Male" id="male" />
                  <Label htmlFor="male">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Female" id="female" />
                  <Label htmlFor="female">Female</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Age */}
            <div>
              <Label>Approximate Age *</Label>
              <Select 
                value={formData.approximate_age}
                onValueChange={(value) => setFormData({...formData, approximate_age: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Puppy < 6 months">Puppy (&lt; 6 months)</SelectItem>
                  <SelectItem value="Young 6-24 months">Young (6-24 months)</SelectItem>
                  <SelectItem value="Adult 2-8 years">Adult (2-8 years)</SelectItem>
                  <SelectItem value="Senior > 8 years">Senior (&gt; 8 years)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Color/Markings */}
            <div>
              <Label htmlFor="color_markings">Color/Markings *</Label>
              <Input
                id="color_markings"
                value={formData.color_markings}
                onChange={(e) => setFormData({...formData, color_markings: e.target.value})}
                placeholder="e.g., Brown with white patches"
                required
                data-testid="color-input"
              />
            </div>

            {/* Body Condition */}
            <div>
              <Label>Body Condition *</Label>
              <Select 
                value={formData.body_condition}
                onValueChange={(value) => setFormData({...formData, body_condition: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Emaciated">Emaciated</SelectItem>
                  <SelectItem value="Thin">Thin</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Overweight">Overweight</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Temperament */}
            <div>
              <Label>Temperament *</Label>
              <Select 
                value={formData.temperament}
                onValueChange={(value) => setFormData({...formData, temperament: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Calm">Calm</SelectItem>
                  <SelectItem value="Aggressive">Aggressive</SelectItem>
                  <SelectItem value="Fearful">Fearful</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Visible Injuries */}
            <div className="p-4 bg-red-50 rounded-lg space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="visible_injuries"
                  checked={formData.visible_injuries}
                  onChange={(e) => setFormData({...formData, visible_injuries: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label htmlFor="visible_injuries">Visible Injuries</Label>
              </div>
              {formData.visible_injuries && (
                <Textarea
                  placeholder="Describe injuries..."
                  value={formData.injury_description}
                  onChange={(e) => setFormData({...formData, injury_description: e.target.value})}
                  rows={3}
                />
              )}
            </div>

            {/* Photo */}
            <div>
              <Label htmlFor="photo">Photo in Kennel *</Label>
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
                <img src={formData.photo_base64} alt="Animal" className="mt-2 max-w-xs rounded-lg" />
              )}
            </div>

            {/* Remarks */}
            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                rows={2}
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading || cases.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
              data-testid="submit-observation"
            >
              {loading ? 'Saving...' : '✓ Save Observation & Assign Kennel'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default InitialObservations;