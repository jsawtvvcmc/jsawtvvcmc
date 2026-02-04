import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Pencil } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SurgeryForm = () => {
  const { token } = useAuth();
  const [cases, setCases] = useState([]);
  const [recentSurgeries, setRecentSurgeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedCase, setSelectedCase] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  
  // Get today's date
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };
  
  const [formData, setFormData] = useState({
    case_id: '',
    surgery_date: getTodayDate(),
    weight: '',
    skin: 'Normal',
    cancelled: 'No',
    cancellation_reason: '',
    // Medicine dosages (auto-calculated)
    arv: 1,
    xylazine: 0,
    melonex: 0,
    atropine: 0,
    diazepam: 0,
    prednisolone: 0,
    ketamine: 0,
    tribivet: 1,
    intacef_tazo: 0,
    adrenaline: 0,
    alu_spray: 0,
    ethamsylate: 0,
    tincture: 0,
    avil: 1,
    vicryl_1: 0.20,
    catgut: 0.20,
    vicryl_2: 0,
    metrinedasol: 50,
    ketamine_diazepam: 0
  });

  useEffect(() => {
    fetchInKennelCases();
    fetchRecentSurgeries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRecentSurgeries = async () => {
    try {
      const response = await axios.get(`${API}/cases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter cases with surgery in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recent = response.data.filter(c => {
        if (!c.surgery?.surgery_date) return false;
        const surgeryDate = new Date(c.surgery.surgery_date);
        return surgeryDate >= sevenDaysAgo;
      }).slice(0, 10);
      setRecentSurgeries(recent);
    } catch (error) {
      console.error('Error fetching recent surgeries:', error);
    }
  };

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

  const handleCaseSelect = (caseId) => {
    const caseData = cases.find(c => c.id === caseId);
    setSelectedCase(caseData);
    setFormData({
      ...formData,
      case_id: caseId
    });
  };

  const calculateMedicines = (weight) => {
    const w = parseFloat(weight);
    if (!w || w < 10 || w > 30) return;

    const roundToHalf = (val) => Math.round(val * 2) / 2;
    const roundTo50 = (val) => Math.round(val / 50) * 50;
    const roundTo5 = (val) => Math.round(val / 5) * 5;

    const isFemal = selectedCase?.initial_observation?.gender === 'Female';

    setFormData(prev => ({
      ...prev,
      arv: 1,
      xylazine: w / 10,
      melonex: Math.min(0.8 * w / 10, 1),
      atropine: roundToHalf(w / 10),
      ketamine: roundToHalf(3 * w / 10),
      tribivet: 1,
      intacef_tazo: roundTo50(400 * w / 10),
      alu_spray: roundToHalf(2 * w / 10),
      ethamsylate: roundToHalf(w / 10),
      tincture: roundTo5(20 * w / 10),
      avil: 1,
      vicryl_1: 0.20,
      catgut: 0.20,
      vicryl_2: isFemal ? 0.20 : 0,
      metrinedasol: 50
    }));
  };

  const handleWeightChange = (e) => {
    const weight = e.target.value;
    setFormData({ ...formData, weight });
    if (weight && weight >= 10 && weight <= 30) {
      calculateMedicines(weight);
    }
  };

  const handlePhotoCapture = (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 4) {
      setMessage({ type: 'error', text: 'Maximum 4 photos allowed' });
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const surgeryData = {
        case_id: formData.case_id,
        weight: parseFloat(formData.weight),
        gender: selectedCase?.initial_observation?.gender,
        skin: formData.skin,
        photos: photos,
        cancelled: formData.cancelled,
        cancellation_reason: formData.cancelled === 'Yes' ? formData.cancellation_reason : null,
        medicines: formData.cancelled === 'No' ? {
          "Anti-Rabies Vaccine": formData.arv,
          "Xylazine": formData.xylazine,
          "Melonex": formData.melonex,
          "Atropine": formData.atropine,
          "Diazepam": formData.diazepam,
          "Prednisolone": formData.prednisolone,
          "Ketamine": formData.ketamine,
          "Tribivet": formData.tribivet,
          "Intacef Tazo": formData.intacef_tazo,
          "Adrenaline": formData.adrenaline,
          "Alu Spray": formData.alu_spray,
          "Ethamsylate": formData.ethamsylate,
          "Tincture": formData.tincture,
          "Avil": formData.avil,
          "Vicryl 1": formData.vicryl_1,
          "Catgut": formData.catgut,
          "Vicryl 2": formData.vicryl_2,
          "Metronidazole": formData.metrinedasol
        } : {}
      };

      const response = await axios.post(`${API}/cases/${formData.case_id}/surgery`, surgeryData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: `Surgery record saved! Medicine stock automatically deducted.` });
      // Reset form
      setFormData({
        case_id: '', weight: '', skin: 'Normal', cancelled: 'No', cancellation_reason: '',
        arv: 1, xylazine: 0, melonex: 0, atropine: 0, diazepam: 0, prednisolone: 0,
        ketamine: 0, tribivet: 1, intacef_tazo: 0, adrenaline: 0, alu_spray: 0,
        ethamsylate: 0, tincture: 0, avil: 1, vicryl_1: 0.20, catgut: 0.20,
        vicryl_2: 0, metrinedasol: 50, ketamine_diazepam: 0
      });
      setPhotos([]);
      setSelectedCase(null);
      fetchInKennelCases();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save' });
    } finally {
      setLoading(false);
    }
  };

  const getMaleCancellationReasons = () => [
    'Too weak', 'Under age', 'Looks ill', 'Shows symptoms of highly contagious disease'
  ];

  const getFemaleCancellationReasons = () => [
    'Too weak', 'Under age', 'Looks ill', 'Shows symptoms of highly contagious disease',
    'Advanced pregnant', 'Lactating'
  ];

  const gender = selectedCase?.initial_observation?.gender;
  const cancellationReasons = gender === 'Female' ? getFemaleCancellationReasons() : getMaleCancellationReasons();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Surgery Form ⚕️</h1>
        <p className="text-gray-600">Record surgery details with auto-calculated medicine dosages</p>
      </div>

      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Surgery Record</CardTitle>
          <CardDescription>All medicine dosages auto-calculated based on weight</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Case Selection */}
            <div className="p-4 bg-green-50 rounded-lg">
              <Label>Select Case *</Label>
              <select 
                value={formData.case_id}
                onChange={(e) => handleCaseSelect(e.target.value)}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select a case</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    Case: {c.case_number} - Kennel: {c.initial_observation?.kennel_number} - {c.initial_observation?.gender}
                  </option>
                ))}
              </select>
              {selectedCase && (
                <div className="mt-2 p-2 bg-white rounded text-sm">
                  <p><strong>Case No:</strong> {selectedCase.case_number}</p>
                  <p><strong>Kennel No:</strong> {selectedCase.initial_observation?.kennel_number}</p>
                  <p><strong>Gender:</strong> {selectedCase.initial_observation?.gender}</p>
                </div>
              )}
            </div>

            {/* Weight */}
            <div>
              <Label htmlFor="weight">Weight (kg) * (10-30 kg)</Label>
              <Input
                id="weight"
                type="number"
                min="10"
                max="30"
                step="0.1"
                value={formData.weight}
                onChange={handleWeightChange}
                required
                placeholder="Enter weight in kg"
              />
            </div>

            {/* Skin Condition */}
            <div>
              <Label>Skin Condition *</Label>
              <RadioGroup value={formData.skin} onValueChange={(value) => setFormData({...formData, skin: value})}>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Normal" id="normal" />
                    <Label htmlFor="normal">Normal</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Rough" id="rough" />
                    <Label htmlFor="rough">Rough</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Visible Infection" id="infection" />
                    <Label htmlFor="infection">Visible Infection</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Photos */}
            <div>
              <Label>Photos (Up to 4) *</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handlePhotoCapture}
              />
              <div className="grid grid-cols-4 gap-2 mt-2">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative">
                    <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-24 object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 text-xs"
                    >×</button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-1">{photos.length}/4 photos uploaded</p>
            </div>

            {/* Cancelled */}
            <div className="p-4 border-2 rounded-lg">
              <Label>Surgery Cancelled? *</Label>
              <RadioGroup value={formData.cancelled} onValueChange={(value) => setFormData({...formData, cancelled: value})}>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="No" id="not-cancelled" />
                    <Label htmlFor="not-cancelled">No</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Yes" id="cancelled" />
                    <Label htmlFor="cancelled">Yes</Label>
                  </div>
                </div>
              </RadioGroup>

              {formData.cancelled === 'Yes' && (
                <div className="mt-4 p-4 bg-red-50 rounded">
                  <Label>Cancellation Reason *</Label>
                  <select
                    value={formData.cancellation_reason}
                    onChange={(e) => setFormData({...formData, cancellation_reason: e.target.value})}
                    className="w-full p-2 border rounded mt-2"
                    required
                  >
                    <option value="">Select reason</option>
                    {cancellationReasons.map(reason => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Medicine Dosages - Always visible and editable */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-bold text-lg mb-4">Medicine Dosages (Auto-calculated or Manual Entry)</h3>
              <p className="text-sm text-gray-600 mb-3">Enter weight (10-30kg) to auto-calculate, or enter manually</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><Label>ARV (ml):</Label><Input type="number" step="0.01" value={formData.arv} onChange={(e) => setFormData({...formData, arv: parseFloat(e.target.value) || 0})} /></div>
                <div><Label>Xylazine (ml):</Label><Input type="number" step="0.01" value={formData.xylazine} onChange={(e) => setFormData({...formData, xylazine: parseFloat(e.target.value) || 0})} /></div>
                <div><Label>Melonex (ml):</Label><Input type="number" step="0.01" value={formData.melonex} onChange={(e) => setFormData({...formData, melonex: parseFloat(e.target.value) || 0})} /></div>
                <div><Label>Atropine (ml):</Label><Input type="number" step="0.01" value={formData.atropine} onChange={(e) => setFormData({...formData, atropine: parseFloat(e.target.value) || 0})} /></div>
                <div><Label>Diazepam (ml):</Label><Input type="number" step="0.01" value={formData.diazepam} onChange={(e) => setFormData({...formData, diazepam: parseFloat(e.target.value) || 0})} /></div>
                <div><Label>Prednisolone (ml):</Label><Input type="number" step="0.01" value={formData.prednisolone} onChange={(e) => setFormData({...formData, prednisolone: parseFloat(e.target.value) || 0})} /></div>
                <div><Label>Ketamine (ml):</Label><Input type="number" step="0.01" value={formData.ketamine} onChange={(e) => setFormData({...formData, ketamine: parseFloat(e.target.value) || 0})} /></div>
                <div><Label>Tribivet (ml):</Label><Input type="number" step="0.01" value={formData.tribivet} onChange={(e) => setFormData({...formData, tribivet: parseFloat(e.target.value) || 0})} /></div>
                <div><Label>Intacef tazo (mg):</Label><Input type="number" step="1" value={formData.intacef_tazo} onChange={(e) => setFormData({...formData, intacef_tazo: parseFloat(e.target.value) || 0})} /></div>
                <div><Label>Adrenaline (ml):</Label><Input type="number" step="0.01" value={formData.adrenaline} onChange={(e) => setFormData({...formData, adrenaline: parseFloat(e.target.value) || 0})} /></div>
                <div><Label>Alu spray (ml):</Label><Input type="number" step="0.01" value={formData.alu_spray} onChange={(e) => setFormData({...formData, alu_spray: parseFloat(e.target.value) || 0})} /></div>
                <div><Label>Ethamsylate (ml):</Label><Input type="number" step="0.01" value={formData.ethamsylate} onChange={(e) => setFormData({...formData, ethamsylate: parseFloat(e.target.value) || 0})} /></div>
                <div><Label>Tincture (ml):</Label><Input type="number" step="1" value={formData.tincture} onChange={(e) => setFormData({...formData, tincture: parseFloat(e.target.value) || 0})} /></div>
                <div><Label>Avil (ml):</Label><Input type="number" step="0.01" value={formData.avil} onChange={(e) => setFormData({...formData, avil: parseFloat(e.target.value) || 0})} /></div>
                <div><Label>Vicryl 1 (pc):</Label><Input type="number" step="0.01" value={formData.vicryl_1} onChange={(e) => setFormData({...formData, vicryl_1: parseFloat(e.target.value) || 0})} /></div>
                <div><Label>Catgut (pc):</Label><Input type="number" step="0.01" value={formData.catgut} onChange={(e) => setFormData({...formData, catgut: parseFloat(e.target.value) || 0})} /></div>
                <div><Label>Vicryl 2 (pc) {gender === 'Female' ? '' : '(Female only)'}:</Label><Input type="number" step="0.01" value={formData.vicryl_2} onChange={(e) => setFormData({...formData, vicryl_2: parseFloat(e.target.value) || 0})} className={gender !== 'Female' ? 'bg-gray-100' : ''} /></div>
                <div><Label>Metrinedasol (ml):</Label><Input type="number" step="1" value={formData.metrinedasol} onChange={(e) => setFormData({...formData, metrinedasol: parseFloat(e.target.value) || 0})} /></div>
                <div><Label>Ketamine-Diazepam (ml):</Label><Input type="number" step="0.01" value={formData.ketamine_diazepam} onChange={(e) => setFormData({...formData, ketamine_diazepam: parseFloat(e.target.value) || 0})} placeholder="Manual entry" /></div>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading || cases.length === 0 || photos.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
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