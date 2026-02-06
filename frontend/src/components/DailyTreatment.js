import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Standard treatment protocol
const TREATMENT_PROTOCOL = [
  { name: 'Intacef Tazo', defaultDosage: '400-500', unit: 'mg', note: 'based on weight' },
  { name: 'Melonex', defaultDosage: '0.8-1.0', unit: 'ml', note: 'rounded to 0.1 ml' },
  { name: 'Prednisolone', defaultDosage: '1', unit: 'ml', note: 'fixed dose' },
  { name: 'B-Complex', defaultDosage: '1', unit: 'ml', note: 'fixed dose' },
  { name: 'Tribe-Vet', defaultDosage: '1', unit: 'ml', note: 'fixed dose' },
];

const DailyTreatment = () => {
  const { token } = useAuth();
  const [cases, setCases] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedCase, setSelectedCase] = useState(null);
  
  // Treatment medicines state
  const [treatmentMeds, setTreatmentMeds] = useState({
    intacef_tazo: '',
    melonex: '',
    prednisolone: '1',
    b_complex: '1',
    tribe_vet: '1',
  });
  
  const [formData, setFormData] = useState({
    case_id: '',
    treatment_date: new Date().toISOString().split('T')[0],
    day_post_surgery: 1,
    wound_condition: 'Normal Healing',
    food_intake: true,
    water_intake: true,
    photos: ['', '', '', ''],
    remarks: ''
  });

  useEffect(() => {
    fetchSurgeryCases();
    fetchMedicines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSurgeryCases = async () => {
    try {
      const response = await axios.get(`${API}/cases?status=Surgery Completed`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const underTreatment = await axios.get(`${API}/cases?status=Under Treatment`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCases([...response.data, ...underTreatment.data]);
    } catch (error) {
      console.error('Error fetching cases:', error);
    }
  };

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

  const handleCaseSelect = (caseId) => {
    const caseData = cases.find(c => c.id === caseId);
    setSelectedCase(caseData);
    
    // Calculate day post surgery
    const surgeryDate = new Date(caseData?.surgery?.surgery_date);
    const today = new Date();
    const daysDiff = Math.floor((today - surgeryDate) / (1000 * 60 * 60 * 24)) + 1;
    
    // Auto-calculate Intacef Tazo based on weight (400-500mg based on weight)
    const weight = caseData?.surgery?.weight || 10;
    const intacefDose = weight <= 10 ? 400 : weight <= 15 ? 450 : 500;
    
    // Auto-calculate Melonex based on weight (0.8-1.0ml)
    const melonexDose = weight <= 10 ? 0.8 : weight <= 15 ? 0.9 : 1.0;
    
    setTreatmentMeds({
      intacef_tazo: intacefDose.toString(),
      melonex: melonexDose.toFixed(1),
      prednisolone: '1',
      b_complex: '1',
      tribe_vet: '1',
    });
    
    setFormData({
      ...formData,
      case_id: caseId,
      day_post_surgery: daysDiff > 0 ? daysDiff : 1
    });
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
      // Build medicines_used object
      const medicines_used = {
        'Intacef Tazo': parseFloat(treatmentMeds.intacef_tazo) || 0,
        'Melonex': parseFloat(treatmentMeds.melonex) || 0,
        'Prednisolone': parseFloat(treatmentMeds.prednisolone) || 0,
        'B-Complex': parseFloat(treatmentMeds.b_complex) || 0,
        'Tribe-Vet': parseFloat(treatmentMeds.tribe_vet) || 0,
      };
      
      const response = await axios.post(`${API}/cases/${formData.case_id}/treatment`, {
        treatment_date: formData.treatment_date,
        day_post_surgery: parseInt(formData.day_post_surgery),
        medicines_used: medicines_used,
        wound_condition: formData.wound_condition,
        food_intake: formData.food_intake,
        water_intake: formData.water_intake,
        photos: formData.photos.filter(p => p),
        remarks: formData.remarks || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const photosUploaded = response.data.photos_uploaded || 0;
      setMessage({ type: 'success', text: `Treatment record added successfully! ${photosUploaded} photo(s) uploaded to Drive.` });
      
      // Reset form
      setTreatmentMeds({
        intacef_tazo: '',
        melonex: '',
        prednisolone: '1',
        b_complex: '1',
        tribe_vet: '1',
      });
      setFormData({
        case_id: '',
        treatment_date: new Date().toISOString().split('T')[0],
        day_post_surgery: 1,
        wound_condition: 'Normal Healing',
        food_intake: true,
        water_intake: true,
        photos: ['', '', '', ''],
        remarks: ''
      });
      setSelectedCase(null);
      fetchSurgeryCases();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to add treatment record' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Daily Treatment 💊</h1>
        <p className="text-gray-600">Track daily animal treatment as per standard protocol</p>
      </div>

      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Treatment Protocol Reference */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">📋 Standard Treatment Protocol</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            {TREATMENT_PROTOCOL.map((med, idx) => (
              <div key={idx} className="bg-white p-2 rounded border">
                <p className="font-semibold">{med.name}</p>
                <p className="text-gray-600">{med.defaultDosage} {med.unit}</p>
                <p className="text-xs text-gray-500">{med.note}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Add Treatment Record</CardTitle>
          <CardDescription>Record daily treatment for post-surgery animals</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Case Selection */}
            <div className="p-4 bg-green-50 rounded-lg">
              <Label>Select Case *</Label>
              <Select 
                value={formData.case_id}
                onValueChange={handleCaseSelect}
                required
              >
                <SelectTrigger data-testid="case-select">
                  <SelectValue placeholder="Select a post-surgery case" />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.case_number} - Kennel {c.initial_observation?.kennel_number} - {c.surgery?.weight || '?'}kg
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCase && (
                <div className="mt-2 p-2 bg-white rounded text-sm grid grid-cols-2 gap-2">
                  <p><strong>Surgery Date:</strong> {new Date(selectedCase.surgery?.surgery_date).toLocaleDateString()}</p>
                  <p><strong>Day Post-Surgery:</strong> Day {formData.day_post_surgery}</p>
                  <p><strong>Weight:</strong> {selectedCase.surgery?.weight || 'N/A'} kg</p>
                  <p><strong>Gender:</strong> {selectedCase.initial_observation?.gender || 'N/A'}</p>
                </div>
              )}
            </div>

            {/* Standard Medicines */}
            <div className="p-4 border rounded-lg bg-yellow-50">
              <h3 className="font-semibold mb-4 text-lg">💉 Standard Treatment Medicines</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Intacef Tazo */}
                <div className="bg-white p-3 rounded border">
                  <Label className="font-semibold">Intacef Tazo (mg)</Label>
                  <p className="text-xs text-gray-500 mb-1">400-500mg based on weight</p>
                  <Input
                    type="number"
                    step="1"
                    value={treatmentMeds.intacef_tazo}
                    onChange={(e) => setTreatmentMeds({...treatmentMeds, intacef_tazo: e.target.value})}
                    placeholder="400-500"
                    className="mt-1"
                  />
                </div>

                {/* Melonex */}
                <div className="bg-white p-3 rounded border">
                  <Label className="font-semibold">Melonex (ml)</Label>
                  <p className="text-xs text-gray-500 mb-1">0.8-1.0ml rounded to 0.1</p>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={treatmentMeds.melonex}
                    onChange={(e) => setTreatmentMeds({...treatmentMeds, melonex: e.target.value})}
                    placeholder="0.8-1.0"
                    className="mt-1"
                  />
                </div>

                {/* Prednisolone */}
                <div className="bg-white p-3 rounded border">
                  <Label className="font-semibold">Prednisolone (ml)</Label>
                  <p className="text-xs text-gray-500 mb-1">Fixed dose: 1ml</p>
                  <Input
                    type="number"
                    step="0.1"
                    value={treatmentMeds.prednisolone}
                    onChange={(e) => setTreatmentMeds({...treatmentMeds, prednisolone: e.target.value})}
                    placeholder="1"
                    className="mt-1"
                  />
                </div>

                {/* B-Complex */}
                <div className="bg-white p-3 rounded border">
                  <Label className="font-semibold">B-Complex (ml)</Label>
                  <p className="text-xs text-gray-500 mb-1">Fixed dose: 1ml</p>
                  <Input
                    type="number"
                    step="0.1"
                    value={treatmentMeds.b_complex}
                    onChange={(e) => setTreatmentMeds({...treatmentMeds, b_complex: e.target.value})}
                    placeholder="1"
                    className="mt-1"
                  />
                </div>

                {/* Tribe-Vet */}
                <div className="bg-white p-3 rounded border">
                  <Label className="font-semibold">Tribe-Vet (ml)</Label>
                  <p className="text-xs text-gray-500 mb-1">Fixed dose: 1ml</p>
                  <Input
                    type="number"
                    step="0.1"
                    value={treatmentMeds.tribe_vet}
                    onChange={(e) => setTreatmentMeds({...treatmentMeds, tribe_vet: e.target.value})}
                    placeholder="1"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Wound & Intake */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Wound Condition *</Label>
                <Select 
                  value={formData.wound_condition}
                  onValueChange={(value) => setFormData({...formData, wound_condition: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal Healing">Normal Healing</SelectItem>
                    <SelectItem value="Inflammation">Inflammation</SelectItem>
                    <SelectItem value="Infection">Infection</SelectItem>
                    <SelectItem value="Swelling">Swelling</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.food_intake}
                    onChange={(e) => setFormData({...formData, food_intake: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span>Food Intake</span>
                </label>
              </div>
              
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.water_intake}
                    onChange={(e) => setFormData({...formData, water_intake: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span>Water Intake</span>
                </label>
              </div>
            </div>

            {/* Photo */}
            <div className="p-4 bg-yellow-50 rounded-lg">
              <Label className="text-lg font-semibold">📸 Photos (optional, max 4)</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="space-y-2">
                    <Label className="text-sm">Photo {index + 1}</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoCapture(e, index)}
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
            </div>

            {/* Remarks */}
            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                rows={2}
                placeholder="Any additional observations..."
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading || cases.length === 0 || !formData.case_id}
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
              data-testid="submit-treatment"
            >
              {loading ? 'Saving...' : '✓ Save Treatment Record'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyTreatment;