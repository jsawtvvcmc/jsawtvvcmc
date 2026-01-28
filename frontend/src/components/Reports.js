import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Reports = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedCase, setSelectedCase] = useState(null);

  useEffect(() => {
    fetchAllCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllCases = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/cases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCases(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch cases' });
    } finally {
      setLoading(false);
    }
  };

  const getCasesForDate = (date) => {
    return cases.filter(c => {
      const caseDate = new Date(c.created_at).toISOString().split('T')[0];
      return caseDate === date;
    });
  };

  const getCasesForMonth = (monthStr) => {
    return cases.filter(c => {
      const caseMonth = new Date(c.created_at).toISOString().substring(0, 7);
      return caseMonth === monthStr;
    });
  };

  // 1. Catching Sheet Report
  const generateCatchingSheet = () => {
    const dateCases = getCasesForDate(selectedDate);
    const catchDate = new Date(selectedDate);
    const surgeryDate = new Date(catchDate);
    surgeryDate.setDate(surgeryDate.getDate() + 1);
    const releaseDate = new Date(catchDate);
    releaseDate.setDate(releaseDate.getDate() + 3);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: Arial, sans-serif; }
    .header { text-align: center; margin-bottom: 20px; }
    .header h2 { margin: 5px 0; }
    .dates { display: flex; justify-content: space-around; margin: 20px 0; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid black; padding: 8px; text-align: left; }
    th { background-color: #f0f0f0; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="header">
    <h2>Janice Smith Animal Welfare Trust</h2>
    <h3>Talegaon ABC Project</h3>
    <p>352, Vadgaon, Yashwant Nagar, Talegaon Dabhade, Maharashtra 410507, India</p>
    <h2>DAILY CATCHING SHEET</h2>
  </div>
  
  <div class="dates">
    <div>Date Of Catching: ${catchDate.toLocaleDateString()}</div>
    <div>Est. Surgery Date: ${surgeryDate.toLocaleDateString()}</div>
    <div>Est. Release Date: ${releaseDate.toLocaleDateString()}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Sr. No</th>
        <th>Address</th>
        <th>Case No</th>
      </tr>
    </thead>
    <tbody>
      ${dateCases.map((c, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${c.catching?.address || 'N/A'}</td>
          <td>${c.case_number}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <div>Catcher: _________________</div>
    <div>Supervisor: _________________</div>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  // 2. Case Paper Report
  const generateCasePaper = (caseData) => {
    if (!caseData) return;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: Arial, sans-serif; font-size: 12px; }
    .header { text-align: center; margin-bottom: 20px; }
    .section { margin: 20px 0; }
    .section-title { font-weight: bold; background: #f0f0f0; padding: 5px; margin-bottom: 10px; }
    .field { margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid black; padding: 5px; text-align: left; }
    th { background-color: #f0f0f0; }
  </style>
</head>
<body>
  <div class="header">
    <h2>Janice Smith Animal Welfare Trust</h2>
    <h3>Talegaon ABC Project</h3>
    <p>352, Vadgaon, Yashwant Nagar, Talegaon Dabhade, Maharashtra 410507, India</p>
  </div>

  <div class="section">
    <div class="section-title">Case Details</div>
    <div class="field"><strong>Case No:</strong> ${caseData.case_number}</div>
    <div class="field"><strong>Surgery Date:</strong> ${caseData.surgery?.surgery_date ? new Date(caseData.surgery.surgery_date).toLocaleDateString() : 'N/A'}</div>
    <div class="field"><strong>Address/Location:</strong> ${caseData.catching?.address || 'N/A'}</div>
    <div class="field"><strong>Lat:</strong> ${caseData.catching?.location_lat || 'N/A'}° <strong>Long:</strong> ${caseData.catching?.location_lng || 'N/A'}°</div>
  </div>

  <div class="section">
    <div class="section-title">Dog Description</div>
    <div class="field"><strong>Weight:</strong> ${caseData.surgery?.weight || 'N/A'} kg</div>
    <div class="field"><strong>Gender:</strong> ${caseData.initial_observation?.gender || 'N/A'}</div>
    <div class="field"><strong>Skin Condition:</strong> ${caseData.surgery?.skin || 'N/A'}</div>
    <div class="field"><strong>Behaviour:</strong> ${caseData.initial_observation?.temperament || 'N/A'}</div>
    <div class="field"><strong>Body Condition:</strong> ${caseData.initial_observation?.body_condition || 'N/A'}</div>
  </div>

  <div class="section">
    <div class="section-title">MEDICINE USED IN SURGERY</div>
    ${caseData.surgery?.medicines ? Object.entries(caseData.surgery.medicines).map(([key, value]) => 
      value > 0 ? `<div class="field">${key.replace(/_/g, ' ')}: ${value}</div>` : ''
    ).join('') : 'No surgery data'}
  </div>

  <div class="section">
    <div class="section-title">Post Operative Care</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Day</th>
          <th>Observations</th>
          <th>Wound Condition</th>
        </tr>
      </thead>
      <tbody>
        ${caseData.daily_treatments?.map((t, idx) => `
          <tr>
            <td>${new Date(t.date).toLocaleDateString()}</td>
            <td>Day ${t.day_post_surgery}</td>
            <td>${t.remarks || 'Normal care'}</td>
            <td>${t.wound_condition}</td>
          </tr>
        `).join('') || '<tr><td colspan="4">No treatment records</td></tr>'}
      </tbody>
    </table>
  </div>

  <div style="margin-top: 40px;">
    <p><strong>Digitally Signed On:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Signed By:</strong> Project Supervisor / Veterinary Officer</p>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  // 3. Monthly Log Excel Export
  const generateMonthlyLog = () => {
    const monthCases = getCasesForMonth(selectedMonth);
    
    const csvData = [];
    csvData.push(['Case No', 'Catching Date', 'Location', 'Gender', 'Surgery Date', 'Release Date', 'Remarks', 'Vaccine Sticker']);
    
    monthCases.forEach(c => {
      csvData.push([
        c.case_number,
        new Date(c.created_at).toLocaleDateString(),
        c.catching?.address?.substring(0, 50) || 'N/A',
        c.initial_observation?.gender || 'N/A',
        c.surgery?.surgery_date ? new Date(c.surgery.surgery_date).toLocaleDateString() : 'N/A',
        c.release?.date_time ? new Date(c.release.date_time).toLocaleDateString() : 'N/A',
        c.catching?.remarks || '',
        '' // Vaccine sticker
      ]);
    });

    // Add summary
    const males = monthCases.filter(c => c.initial_observation?.gender === 'Male').length;
    const females = monthCases.filter(c => c.initial_observation?.gender === 'Female').length;
    const maleCancelled = monthCases.filter(c => c.initial_observation?.gender === 'Male' && c.status === 'Surgery Cancelled').length;
    const femaleCancelled = monthCases.filter(c => c.initial_observation?.gender === 'Female' && c.status === 'Surgery Cancelled').length;
    const totalSurgeries = monthCases.filter(c => c.surgery && c.status !== 'Surgery Cancelled').length;

    csvData.push([]);
    csvData.push(['Summary']);
    csvData.push(['Total Male', males]);
    csvData.push(['Total Female', females]);
    csvData.push(['Male Cancelled', maleCancelled]);
    csvData.push(['Female Cancelled', femaleCancelled]);
    csvData.push(['Total Cancelled', maleCancelled + femaleCancelled]);
    csvData.push(['Total Surgeries', totalSurgeries]);

    const csv = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-log-${selectedMonth}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports 📊</h1>
        <p className="text-gray-600">Generate official reports as per specifications</p>
      </div>

      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="catching" className="w-full">
        <TabsList>
          <TabsTrigger value="catching">1. Catching Sheet</TabsTrigger>
          <TabsTrigger value="case">2. Case Papers</TabsTrigger>
          <TabsTrigger value="monthly">3. Monthly Log</TabsTrigger>
        </TabsList>

        {/* 1. Catching Sheet */}
        <TabsContent value="catching">
          <Card>
            <CardHeader>
              <CardTitle>Daily Catching Sheet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Select Date</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div className="p-4 bg-blue-50 rounded">
                  <p><strong>Cases for {new Date(selectedDate).toLocaleDateString()}:</strong> {getCasesForDate(selectedDate).length}</p>
                </div>
                <Button 
                  onClick={generateCatchingSheet}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={getCasesForDate(selectedDate).length === 0}
                >
                  🖨️ Generate & Print Catching Sheet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Case Papers */}
        <TabsContent value="case">
          <Card>
            <CardHeader>
              <CardTitle>Case Paper (Individual Dog)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Select Case</Label>
                  <select
                    className="w-full p-2 border rounded"
                    value={selectedCase?.id || ''}
                    onChange={(e) => setSelectedCase(cases.find(c => c.id === e.target.value))}
                  >
                    <option value="">Choose a case...</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.case_number} - {c.initial_observation?.gender || 'N/A'} - {c.status}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedCase && (
                  <div className="p-4 bg-blue-50 rounded">
                    <p><strong>Case:</strong> {selectedCase.case_number}</p>
                    <p><strong>Status:</strong> {selectedCase.status}</p>
                    <p><strong>Kennel:</strong> {selectedCase.initial_observation?.kennel_number || 'N/A'}</p>
                  </div>
                )}
                <Button 
                  onClick={() => generateCasePaper(selectedCase)}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!selectedCase}
                >
                  🖨️ Generate & Print Case Paper
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Monthly Log */}
        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Logbook (Excel)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Select Month</Label>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
                <div className="p-4 bg-blue-50 rounded space-y-2">
                  <p><strong>Cases for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}:</strong> {getCasesForMonth(selectedMonth).length}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>Males: {getCasesForMonth(selectedMonth).filter(c => c.initial_observation?.gender === 'Male').length}</p>
                    <p>Females: {getCasesForMonth(selectedMonth).filter(c => c.initial_observation?.gender === 'Female').length}</p>
                    <p>Surgeries: {getCasesForMonth(selectedMonth).filter(c => c.surgery && c.status !== 'Surgery Cancelled').length}</p>
                    <p>Released: {getCasesForMonth(selectedMonth).filter(c => c.status === 'Released').length}</p>
                  </div>
                </div>
                <Button 
                  onClick={generateMonthlyLog}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={getCasesForMonth(selectedMonth).length === 0}
                >
                  📥 Download Monthly Log (CSV/Excel)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
