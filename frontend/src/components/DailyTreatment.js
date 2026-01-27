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

const DailyTreatment = () => {
  const { token } = useAuth();
  const [cases, setCases] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedCase, setSelectedCase] = useState(null);
  
  const [formData, setFormData] = useState({
    case_id: '',
    day_post_surgery: 1,
    antibiotic_id: '',
    antibiotic_dosage: '',
    painkiller_id: '',
    painkiller_dosage: '',
    additional_medicine_id: '',
    additional_medicine_dosage: '',
    wound_condition: 'Normal Healing',
    photo_base64: '',
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
    setFormData({
      ...formData,
      case_id: caseId,
      day_post_surgery: daysDiff > 0 ? daysDiff : 1
    });
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

    try {
      await axios.post(`${API}/cases/${formData.case_id}/treatment`, {
        day_post_surgery: parseInt(formData.day_post_surgery),
        antibiotic_id: formData.antibiotic_id || null,
        antibiotic_dosage: formData.antibiotic_dosage ? parseFloat(formData.antibiotic_dosage) : null,
        painkiller_id: formData.painkiller_id || null,
        painkiller_dosage: formData.painkiller_dosage ? parseFloat(formData.painkiller_dosage) : null,
        additional_medicine_id: formData.additional_medicine_id || null,
        additional_medicine_dosage: formData.additional_medicine_dosage ? parseFloat(formData.additional_medicine_dosage) : null,
        wound_condition: formData.wound_condition,
        photo_base64: formData.photo_base64,
        remarks: formData.remarks || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: 'Treatment record added successfully!' });
      setFormData({
        case_id: '',
        day_post_surgery: 1,
        antibiotic_id: '',
        antibiotic_dosage: '',
        painkiller_id: '',
        painkiller_dosage: '',
        additional_medicine_id: '',
        additional_medicine_dosage: '',
        wound_condition: 'Normal Healing',
        photo_base64: '',
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
        <p className="text-gray-600">Track daily animal treatment and medicine usage</p>
      </div>

      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

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
                      {c.case_number} - Kennel {c.initial_observation?.kennel_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCase && (
                <div className="mt-2 p-2 bg-white rounded text-sm">
                  <p><strong>Surgery Date:</strong> {new Date(selectedCase.surgery?.surgery_date).toLocaleDateString()}</p>
                  <p><strong>Day Post-Surgery:</strong> {formData.day_post_surgery}</p>
                </div>
              )}
            </div>

            {/* Antibiotic */}
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-3">Antibiotic</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Medicine</Label>
                  <Select 
                    value={formData.antibiotic_id}
                    onValueChange={(value) => setFormData({...formData, antibiotic_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select antibiotic" />
                    </SelectTrigger>
                    <SelectContent>
                      {medicines.map((med) => (
                        <SelectItem key={med.id} value={med.id}>
                          {med.name} (Stock: {med.current_stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="antibiotic_dosage">Dosage</Label>
                  <Input
                    id="antibiotic_dosage"
                    type="number"
                    step="0.1"
                    value={formData.antibiotic_dosage}
                    onChange={(e) => setFormData({...formData, antibiotic_dosage: e.target.value})}
                    placeholder="e.g., 2.5"
                  />
                </div>
              </div>
            </div>

            {/* Painkiller */}
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-3">Painkiller</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Medicine</Label>
                  <Select 
                    value={formData.painkiller_id}
                    onValueChange={(value) => setFormData({...formData, painkiller_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select painkiller" />
                    </SelectTrigger>
                    <SelectContent>
                      {medicines.map((med) => (
                        <SelectItem key={med.id} value={med.id}>
                          {med.name} (Stock: {med.current_stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="painkiller_dosage">Dosage</Label>
                  <Input
                    id="painkiller_dosage"
                    type="number"
                    step="0.1"
                    value={formData.painkiller_dosage}
                    onChange={(e) => setFormData({...formData, painkiller_dosage: e.target.value})}
                    placeholder="e.g., 1.5"
                  />
                </div>
              </div>
            </div>

            {/* Additional Medicine */}
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-3">Additional Medicine (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Medicine</Label>
                  <Select 
                    value={formData.additional_medicine_id}
                    onValueChange={(value) => setFormData({...formData, additional_medicine_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select medicine" />
                    </SelectTrigger>
                    <SelectContent>
                      {medicines.map((med) => (
                        <SelectItem key={med.id} value={med.id}>
                          {med.name} (Stock: {med.current_stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="additional_dosage">Dosage</Label>
                  <Input
                    id="additional_dosage"
                    type="number"
                    step="0.1"
                    value={formData.additional_medicine_dosage}
                    onChange={(e) => setFormData({...formData, additional_medicine_dosage: e.target.value})}
                    placeholder="e.g., 1.0"
                  />
                </div>
              </div>
            </div>

            {/* Wound Condition */}
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
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
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