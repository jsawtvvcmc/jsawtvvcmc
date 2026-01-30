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
  const [config, setConfig] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedCase, setSelectedCase] = useState(null);

  useEffect(() => {
    fetchAllCases();
    fetchConfig();
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

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API}/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(response.data);
    } catch (error) {
      console.error('Error fetching config:', error);
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

  // Get Google Drive image URL from photo object or file ID
  // Using lh3.googleusercontent.com format which works better for embedding
  const getPhotoUrl = (photo) => {
    if (!photo) return '';
    
    let fileId = null;
    
    // Extract file ID from various formats
    if (typeof photo === 'object') {
      fileId = photo.file_id;
      if (!fileId && photo.web_view_link) {
        const match = photo.web_view_link.match(/\/d\/([^/]+)/);
        if (match) fileId = match[1];
      }
    } else if (typeof photo === 'string') {
      if (photo.startsWith('http') && photo.includes('id=')) {
        const match = photo.match(/id=([^&]+)/);
        if (match) fileId = match[1];
      } else if (photo.includes('/d/')) {
        const match = photo.match(/\/d\/([^/]+)/);
        if (match) fileId = match[1];
      } else {
        fileId = photo;
      }
    }
    
    if (!fileId) return '';
    
    // Use Google's export view URL which works for embedded images
    // Adding export=view helps with embedding
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  };

  // 1. Catching Sheet Report
  const generateCatchingSheet = () => {
    const dateCases = getCasesForDate(selectedDate);
    const catchDate = new Date(selectedDate);
    const surgeryDate = new Date(catchDate);
    surgeryDate.setDate(surgeryDate.getDate() + 1);
    const releaseDate = new Date(catchDate);
    releaseDate.setDate(releaseDate.getDate() + 3);

    const orgName = config?.organization_name || 'Janice Smith Animal Welfare Trust';
    const projectName = config?.project_name || 'Talegaon ABC Project';
    const projectAddress = config?.project_address || '352, Vadgaon, Yashwant Nagar, Talegaon Dabhade, Maharashtra 410507, India';
    const orgLogo = config?.organization_logo || '';
    const municipalLogo = config?.municipal_logo || '';

    // Build rows HTML
    let rowsHtml = '';
    dateCases.forEach((c, idx) => {
      const photoLinks = c.catching?.photo_links || [];
      let photoHtml = '';
      
      console.log(`Case ${c.case_number} photos:`, photoLinks); // Debug
      
      if (photoLinks.length > 0) {
        photoLinks.slice(0, 2).forEach(photo => {
          const imgUrl = getPhotoUrl(photo);
          console.log(`Photo URL: ${imgUrl}`); // Debug
          if (imgUrl) {
            photoHtml += '<img src="' + imgUrl + '" class="case-image" alt="Photo" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.style.opacity=\'0.3\'; this.alt=\'Image loading...\'">';
          }
        });
      }
      
      if (!photoHtml) {
        photoHtml = '<div class="no-image">No Photo</div>';
      }

      rowsHtml += '<tr>' +
        '<td style="text-align: center; font-weight: bold;">' + (idx + 1) + '</td>' +
        '<td><div class="case-images">' + photoHtml + '</div></td>' +
        '<td>' + (c.catching?.address || 'N/A') + '</td>' +
        '<td style="font-weight: bold; font-size: 11px;">' + c.case_number + '</td>' +
        '</tr>';
    });

    const html = '<!DOCTYPE html><html><head><style>' +
      '@page { size: A4; margin: 15mm; }' +
      'body { font-family: Arial, sans-serif; font-size: 11px; }' +
      '.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px; }' +
      '.header-center { text-align: center; flex: 1; }' +
      '.logo { width: 60px; height: 60px; object-fit: contain; }' +
      '.logo-placeholder { width: 60px; height: 60px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #999; }' +
      '.header h2 { margin: 3px 0; font-size: 14px; }' +
      '.header h3 { margin: 3px 0; font-size: 12px; color: #555; }' +
      '.header p { margin: 2px 0; font-size: 10px; }' +
      '.title { text-align: center; font-size: 16px; font-weight: bold; margin: 15px 0; background: #f0f0f0; padding: 8px; }' +
      '.dates { display: flex; justify-content: space-around; margin: 15px 0; font-size: 11px; }' +
      '.dates div { padding: 5px 15px; background: #e8f5e9; border-radius: 4px; }' +
      'table { width: 100%; border-collapse: collapse; margin-top: 15px; }' +
      'th, td { border: 1px solid #333; padding: 8px; text-align: left; vertical-align: top; }' +
      'th { background-color: #4CAF50; color: white; font-size: 11px; }' +
      'td { font-size: 10px; }' +
      '.case-images { display: flex; gap: 5px; flex-wrap: wrap; }' +
      '.case-image { width: 80px; height: 80px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; }' +
      '.no-image { width: 80px; height: 80px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #999; border-radius: 4px; }' +
      '.footer { margin-top: 30px; display: flex; justify-content: space-between; padding-top: 20px; border-top: 1px solid #ccc; }' +
      '.footer div { text-align: center; }' +
      '.signature-line { border-top: 1px solid #333; width: 150px; margin-top: 40px; padding-top: 5px; }' +
      '@media print { .case-image { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }' +
      '</style></head><body>' +
      '<div class="header">' +
      '<div>' + (orgLogo ? '<img src="' + orgLogo + '" class="logo" alt="NGO Logo">' : '<div class="logo-placeholder">NGO Logo</div>') + '</div>' +
      '<div class="header-center"><h2>' + orgName + '</h2><h3>' + projectName + '</h3><p>' + projectAddress + '</p></div>' +
      '<div>' + (municipalLogo ? '<img src="' + municipalLogo + '" class="logo" alt="Municipal Logo">' : '<div class="logo-placeholder">Municipal Logo</div>') + '</div>' +
      '</div>' +
      '<div class="title">DAILY CATCHING SHEET</div>' +
      '<div class="dates">' +
      '<div><strong>Date Of Catching:</strong> ' + catchDate.toLocaleDateString('en-IN', {day: '2-digit', month: 'long', year: 'numeric'}) + '</div>' +
      '<div><strong>Est. Surgery Date:</strong> ' + surgeryDate.toLocaleDateString('en-IN', {day: '2-digit', month: 'long', year: 'numeric'}) + '</div>' +
      '<div><strong>Est. Release Date:</strong> ' + releaseDate.toLocaleDateString('en-IN', {day: '2-digit', month: 'long', year: 'numeric'}) + '</div>' +
      '</div>' +
      '<table><thead><tr>' +
      '<th style="width: 40px;">Sr. No</th>' +
      '<th style="width: 180px;">Photo</th>' +
      '<th>Address</th>' +
      '<th style="width: 130px;">Case No</th>' +
      '</tr></thead><tbody>' + rowsHtml + '</tbody></table>' +
      '<div class="footer"><div><div class="signature-line">Catcher</div></div><div><div class="signature-line">Supervisor</div></div></div>' +
      '<p style="text-align: center; font-size: 9px; margin-top: 20px; color: #666;">Generated on ' + new Date().toLocaleString('en-IN') + ' | J-APP ABC Program Management System</p>' +
      '</body></html>';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  // 2. Case Paper Report
  const generateCasePaper = (caseData) => {
    if (!caseData) return;

    const orgName = config?.organization_name || 'Janice Smith Animal Welfare Trust';
    const projectName = config?.project_name || 'Talegaon ABC Project';
    const projectAddress = config?.project_address || '352, Vadgaon, Yashwant Nagar, Talegaon Dabhade, Maharashtra 410507, India';
    const orgLogo = config?.organization_logo || '';
    const municipalLogo = config?.municipal_logo || '';

    // Get photo links
    const catchingPhotos = caseData.catching?.photo_links || [];
    const surgeryPhotos = caseData.surgery?.photo_links || [];
    
    console.log('Case Paper - Catching photos:', catchingPhotos); // Debug
    console.log('Case Paper - Surgery photos:', surgeryPhotos); // Debug

    // Build photo HTML
    let photosHtml = '';
    catchingPhotos.slice(0, 2).forEach((photo, idx) => {
      const url = getPhotoUrl(photo);
      console.log(`Catching photo ${idx} URL:`, url); // Debug
      if (url) {
        photosHtml += '<div class="photo-item"><img src="' + url + '" class="photo-img" alt="Catching Photo" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.style.opacity=\'0.3\'"><div class="photo-label">Catching Photo ' + (idx + 1) + '</div></div>';
      }
    });
    surgeryPhotos.slice(0, 2).forEach((photo, idx) => {
      const url = getPhotoUrl(photo);
      console.log(`Surgery photo ${idx} URL:`, url); // Debug
      if (url) {
        photosHtml += '<div class="photo-item"><img src="' + url + '" class="photo-img" alt="Surgery Photo" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.style.opacity=\'0.3\'"><div class="photo-label">Surgery Photo ' + (idx + 1) + '</div></div>';
      }
    });

    const hasPhotos = photosHtml.length > 0;

    // Get medicines used
    const medicines = caseData.surgery?.medicines_used || caseData.surgery?.medicines || {};
    let medicineHtml = '';
    Object.entries(medicines).forEach(([name, dosage]) => {
      if (dosage > 0) {
        // Round to 1 decimal place
        const roundedDosage = Math.round(dosage * 10) / 10;
        medicineHtml += '<div class="medicine-item"><strong>' + name + ':</strong> ' + roundedDosage + '</div>';
      }
    });

    // Post-op care
    const treatments = caseData.daily_treatments || [];
    let treatmentHtml = '';
    if (treatments.length > 0) {
      treatments.forEach(t => {
        treatmentHtml += '<tr>' +
          '<td>' + new Date(t.date).toLocaleDateString('en-IN') + '</td>' +
          '<td>Day ' + t.day_post_surgery + '</td>' +
          '<td>' + (t.remarks || 'Normal post-op care') + '</td>' +
          '<td>' + (t.food_intake ? 'Y' : 'N') + '</td>' +
          '<td>' + (t.water_intake ? 'Y' : 'N') + '</td>' +
          '<td>' + (t.wound_condition || 'Normal') + '</td>' +
          '</tr>';
      });
    } else {
      treatmentHtml = '<tr><td colspan="6" style="text-align: center; color: #666;">No post-operative records yet</td></tr>';
    }

    const html = '<!DOCTYPE html><html><head><style>' +
      '@page { size: A4; margin: 15mm; }' +
      'body { font-family: Arial, sans-serif; font-size: 11px; }' +
      '.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 10px; }' +
      '.header-center { text-align: center; flex: 1; }' +
      '.logo { width: 50px; height: 50px; object-fit: contain; }' +
      '.logo-placeholder { width: 50px; height: 50px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #999; }' +
      '.header h2 { margin: 2px 0; font-size: 13px; }' +
      '.header h3 { margin: 2px 0; font-size: 11px; color: #555; }' +
      '.header p { margin: 2px 0; font-size: 9px; }' +
      '.section { margin: 12px 0; page-break-inside: avoid; }' +
      '.section-title { font-weight: bold; background: #4CAF50; color: white; padding: 5px 10px; margin-bottom: 8px; font-size: 11px; }' +
      '.field { margin: 4px 0; display: flex; }' +
      '.field-label { font-weight: bold; min-width: 120px; }' +
      '.photos-section { display: flex; gap: 10px; flex-wrap: wrap; margin: 10px 0; }' +
      '.photo-item { text-align: center; }' +
      '.photo-img { width: 100px; height: 100px; object-fit: cover; border: 2px solid #4CAF50; border-radius: 4px; }' +
      '.photo-label { font-size: 9px; color: #666; margin-top: 3px; }' +
      'table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }' +
      'th, td { border: 1px solid #333; padding: 5px; text-align: left; }' +
      'th { background-color: #e8f5e9; }' +
      '.medicine-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }' +
      '.medicine-item { padding: 4px 8px; background: #f5f5f5; border-radius: 3px; font-size: 10px; }' +
      '.signatures { display: flex; justify-content: space-between; margin-top: 25px; padding-top: 15px; border-top: 1px solid #ccc; }' +
      '.signature-box { text-align: center; width: 45%; }' +
      '.signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; font-size: 10px; }' +
      '.case-number-box { background: #4CAF50; color: white; padding: 8px 15px; font-size: 14px; font-weight: bold; display: inline-block; border-radius: 4px; }' +
      '@media print { .photo-img { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }' +
      '</style></head><body>' +
      '<div class="header">' +
      '<div>' + (orgLogo ? '<img src="' + orgLogo + '" class="logo" alt="NGO Logo">' : '<div class="logo-placeholder">NGO Logo</div>') + '</div>' +
      '<div class="header-center"><h2>' + orgName + '</h2><h3>' + projectName + '</h3><p>' + projectAddress + '</p></div>' +
      '<div>' + (municipalLogo ? '<img src="' + municipalLogo + '" class="logo" alt="Municipal Logo">' : '<div class="logo-placeholder">Municipal Logo</div>') + '</div>' +
      '</div>' +
      '<div style="text-align: center; margin: 15px 0;"><span class="case-number-box">CASE PAPER: ' + caseData.case_number + '</span></div>' +
      '<div class="section"><div class="section-title">CASE DETAILS</div>' +
      '<div class="field"><span class="field-label">Case No:</span> ' + caseData.case_number + '</div>' +
      '<div class="field"><span class="field-label">Surgery Date:</span> ' + (caseData.surgery?.surgery_date ? new Date(caseData.surgery.surgery_date).toLocaleDateString('en-IN', {day: '2-digit', month: 'long', year: 'numeric'}) : 'Pending') + '</div>' +
      '<div class="field"><span class="field-label">Address/Location:</span> ' + (caseData.catching?.address || 'N/A') + '</div>' +
      '<div class="field"><span class="field-label">GPS Coordinates:</span> Lat ' + (caseData.catching?.location_lat?.toFixed(6) || 'N/A') + ' Long ' + (caseData.catching?.location_lng?.toFixed(6) || 'N/A') + '</div>' +
      '</div>' +
      (hasPhotos ? '<div class="section"><div class="section-title">PHOTOGRAPHS</div><div class="photos-section">' + photosHtml + '</div></div>' : '') +
      '<div class="section"><div class="section-title">DOG DESCRIPTION</div>' +
      '<table><tr><td><strong>Weight:</strong> ' + (caseData.surgery?.weight || 'N/A') + ' kg</td><td><strong>Temperature:</strong> 98°F</td><td><strong>Gender:</strong> ' + (caseData.initial_observation?.gender || 'N/A') + '</td></tr>' +
      '<tr><td><strong>Aggression:</strong> ' + (caseData.initial_observation?.temperament || 'N/A') + '</td><td><strong>Behaviour:</strong> ' + (caseData.initial_observation?.temperament || 'N/A') + '</td><td><strong>Body Condition:</strong> ' + (caseData.initial_observation?.body_condition || 'N/A') + '</td></tr>' +
      '<tr><td><strong>Skin Condition:</strong> ' + (caseData.surgery?.skin || 'Normal') + '</td><td><strong>Ear Notched:</strong> ' + (caseData.status === 'Surgery Completed' || caseData.status === 'Released' ? 'Yes' : 'No') + '</td><td><strong>Vaccination Given:</strong> ' + (caseData.surgery ? 'Yes' : 'No') + '</td></tr></table></div>' +
      '<div class="section"><div class="section-title">MEDICINE USED IN SURGERY</div>' +
      (medicineHtml ? '<div class="medicine-grid">' + medicineHtml + '</div>' : '<p style="color: #666;">No surgery data available</p>') + '</div>' +
      '<div class="section"><div class="section-title">POST OPERATIVE CARE</div>' +
      '<table><thead><tr><th>Date</th><th>Day</th><th>Observations</th><th>Food</th><th>Water</th><th>Wound</th></tr></thead><tbody>' + treatmentHtml + '</tbody></table></div>' +
      '<div class="signatures"><div class="signature-box"><div class="signature-line"><strong>Project Supervisor (LSS)</strong><br><span style="font-size: 9px; color: #666;">Digitally Signed On: ' + new Date().toLocaleString('en-IN') + '</span></div></div>' +
      '<div class="signature-box"><div class="signature-line"><strong>Veterinary Officer</strong><br><span style="font-size: 9px; color: #666;">Digitally Signed On: ' + new Date().toLocaleString('en-IN') + '</span></div></div></div>' +
      '<p style="text-align: center; font-size: 8px; margin-top: 15px; color: #666;">Generated on ' + new Date().toLocaleString('en-IN') + ' | J-APP ABC Program Management System</p>' +
      '</body></html>';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  // 3. Monthly Log Excel Export
  const generateMonthlyLog = () => {
    const monthCases = getCasesForMonth(selectedMonth);
    
    const csvData = [];
    csvData.push(['Case No', 'Catching Date', 'Location', 'Gender', 'Surgery Date', 'Release Date', 'Remarks', 'Vaccine Sticker']);
    
    monthCases.forEach(c => {
      csvData.push([
        c.case_number,
        new Date(c.created_at).toLocaleDateString('en-IN'),
        c.catching?.address?.substring(0, 50) || 'N/A',
        c.initial_observation?.gender || 'N/A',
        c.surgery?.surgery_date ? new Date(c.surgery.surgery_date).toLocaleDateString('en-IN') : 'N/A',
        c.release?.date_time ? new Date(c.release.date_time).toLocaleDateString('en-IN') : 'N/A',
        c.catching?.remarks || '',
        ''
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

    const csv = csvData.map(row => row.map(cell => '"' + cell + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monthly-log-' + selectedMonth + '.csv';
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
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
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
                  <p><strong>Cases for {new Date(selectedDate).toLocaleDateString('en-IN')}:</strong> {getCasesForDate(selectedDate).length}</p>
                </div>
                <div className="p-3 bg-green-50 rounded text-sm">
                  <p>Report includes: Organization/Municipal logos, Photos, Case numbers, Addresses</p>
                </div>
                <Button 
                  onClick={generateCatchingSheet}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={getCasesForDate(selectedDate).length === 0}
                >
                  Generate and Print Catching Sheet
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
                  <div className="p-4 bg-blue-50 rounded space-y-2">
                    <p><strong>Case:</strong> {selectedCase.case_number}</p>
                    <p><strong>Status:</strong> {selectedCase.status}</p>
                    <p><strong>Gender:</strong> {selectedCase.initial_observation?.gender || 'N/A'}</p>
                    <p><strong>Photos:</strong> {(selectedCase.catching?.photo_links?.length || 0) + (selectedCase.surgery?.photo_links?.length || 0)} available</p>
                  </div>
                )}
                <div className="p-3 bg-green-50 rounded text-sm">
                  <p>Report includes: Photos, Dog description, Medicine usage, Post-op care, Digital signatures</p>
                </div>
                <Button 
                  onClick={() => generateCasePaper(selectedCase)}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!selectedCase}
                >
                  Generate and Print Case Paper
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
                  Download Monthly Log (CSV/Excel)
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
