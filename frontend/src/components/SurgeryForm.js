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

const SurgeryForm = () => {
  const { token } = useAuth();
  const [cases, setCases] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedCase, setSelectedCase] = useState(null);
  
  const [formData, setFormData] = useState({
    case_id: '',
    pre_surgery_status: 'Fit for Surgery',
    cancellation_reason: '',
    surgery_type: '',
    anesthesia_used: [],
    surgery_start_time: '',
    surgery_end_time: '',
    complications: false,
    complication_description: '',
    post_surgery_status: 'Good',
    veterinary_signature: '',
    remarks: ''
  });

  useEffect(() => {
    fetchInKennelCases();
    fetchMedicines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInKennelCases = async () => {
    try {
      const response = await axios.get(`${API}/cases?status=In Kennel`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCases(response.data);
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
    setFormData({
      ...formData,
      case_id: caseId,
      surgery_type: caseData?.initial_observation?.gender === 'Male' ? 'Castration' : 'Ovariohysterectomy'
    });
  };

  const handleAnesthesiaToggle = (medicineId) => {
    if (formData.anesthesia_used.includes(medicineId)) {
      setFormData({
        ...formData,
        anesthesia_used: formData.anesthesia_used.filter(id => id !== medicineId)
      });
    } else {
      setFormData({
        ...formData,
        anesthesia_used: [...formData.anesthesia_used, medicineId]
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await axios.post(`${API}/cases/${formData.case_id}/surgery`, {
        pre_surgery_status: formData.pre_surgery_status,
        cancellation_reason: formData.pre_surgery_status === 'Cancel Surgery' ? formData.cancellation_reason : null,
        surgery_type: formData.pre_surgery_status === 'Fit for Surgery' ? formData.surgery_type : null,
        anesthesia_used: formData.pre_surgery_status === 'Fit for Surgery' ? formData.anesthesia_used : [],
        surgery_start_time: formData.pre_surgery_status === 'Fit for Surgery' ? formData.surgery_start_time : null,
        surgery_end_time: formData.pre_surgery_status === 'Fit for Surgery' ? formData.surgery_end_time : null,
        complications: formData.complications,
        complication_description: formData.complication_description || null,
        post_surgery_status: formData.pre_surgery_status === 'Fit for Surgery' ? formData.post_surgery_status : null,
        veterinary_signature: formData.veterinary_signature,
        remarks: formData.remarks || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: 'Surgery record added successfully!' });
      setFormData({
        case_id: '',
        pre_surgery_status: 'Fit for Surgery',
        cancellation_reason: '',
        surgery_type: '',
        anesthesia_used: [],
        surgery_start_time: '',
        surgery_end_time: '',
        complications: false,
        complication_description: '',
        post_surgery_status: 'Good',
        veterinary_signature: '',
        remarks: ''
      });
      setSelectedCase(null);
      fetchInKennelCases();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to add surgery record' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Surgery Form ⚕️</h1>
        <p className="text-gray-600">Record surgery details and outcomes</p>
      </div>

      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Surgery Record</CardTitle>
          <CardDescription>Select a case and record surgery details</CardDescription>
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
                  <SelectValue placeholder="Select a case in kennel" />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.case_number} - Kennel {c.initial_observation?.kennel_number} - {c.initial_observation?.gender}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCase && (
                <div className="mt-2 p-2 bg-white rounded text-sm">
                  <p><strong>Gender:</strong> {selectedCase.initial_observation?.gender}</p>
                  <p><strong>Age:</strong> {selectedCase.initial_observation?.approximate_age}</p>
                  <p><strong>Body Condition:</strong> {selectedCase.initial_observation?.body_condition}</p>
                </div>
              )}
            </div>

            {/* Pre-Surgery Status */}
            <div>
              <Label>Pre-Surgery Status *</Label>
              <RadioGroup 
                value={formData.pre_surgery_status} 
                onValueChange={(value) => setFormData({...formData, pre_surgery_status: value})}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Fit for Surgery" id="fit" />
                  <Label htmlFor="fit">Fit for Surgery</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Cancel Surgery" id="cancel" />
                  <Label htmlFor="cancel">Cancel Surgery</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Cancellation Reason */}
            {formData.pre_surgery_status === 'Cancel Surgery' && (
              <div className="p-4 bg-red-50 rounded-lg">
                <Label>Cancellation Reason *</Label>
                <Select 
                  value={formData.cancellation_reason}
                  onValueChange={(value) => setFormData({...formData, cancellation_reason: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Too weak">Too weak</SelectItem>
                    <SelectItem value="Already sterilized">Already sterilized</SelectItem>
                    <SelectItem value="Advanced pregnant">Advanced pregnant</SelectItem>
                    <SelectItem value="Lactating">Lactating</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Surgery Details (if Fit) */}
            {formData.pre_surgery_status === 'Fit for Surgery' && (
              <>
                <div>
                  <Label>Surgery Type *</Label>
                  <Input
                    value={formData.surgery_type}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-600 mt-1">Auto-selected based on gender</p>
                </div>

                <div>
                  <Label>Anesthesia Used</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {medicines.map((med) => (
                      <div key={med.id} className="flex items-center space-x-2 p-2 border rounded">
                        <input
                          type="checkbox"
                          id={med.id}
                          checked={formData.anesthesia_used.includes(med.id)}
                          onChange={() => handleAnesthesiaToggle(med.id)}
                          className="w-4 h-4"
                        />
                        <label htmlFor={med.id} className="text-sm">{med.name}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_time">Surgery Start Time *</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.surgery_start_time}
                      onChange={(e) => setFormData({...formData, surgery_start_time: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">Surgery End Time *</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.surgery_end_time}
                      onChange={(e) => setFormData({...formData, surgery_end_time: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="complications"
                      checked={formData.complications}
                      onChange={(e) => setFormData({...formData, complications: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="complications">Complications Occurred</Label>
                  </div>
                  {formData.complications && (
                    <Textarea
                      placeholder="Describe complications..."
                      value={formData.complication_description}
                      onChange={(e) => setFormData({...formData, complication_description: e.target.value})}
                      rows={3}
                    />
                  )}
                </div>

                <div>
                  <Label>Post-Surgery Status *</Label>
                  <Select 
                    value={formData.post_surgery_status}
                    onValueChange={(value) => setFormData({...formData, post_surgery_status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Fair">Fair</SelectItem>
                      <SelectItem value="Poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Common Fields */}
            <div>
              <Label htmlFor="signature">Veterinary Signature *</Label>
              <Input
                id="signature"
                value={formData.veterinary_signature}
                onChange={(e) => setFormData({...formData, veterinary_signature: e.target.value})}
                placeholder="Enter your name"
                required
                data-testid="signature-input"
              />
            </div>

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
              data-testid="submit-surgery"
            >
              {loading ? 'Saving...' : '✓ Save Surgery Record'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SurgeryForm;