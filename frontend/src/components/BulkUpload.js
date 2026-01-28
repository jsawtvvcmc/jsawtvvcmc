import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import axios from 'axios';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BulkUpload = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('catching');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const downloadTemplate = async (type) => {
    setDownloading(true);
    try {
      const response = await axios.get(`${API}/bulk-upload/template/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bulk_upload_${type}_template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setMessage({ type: 'success', text: `${type} template downloaded successfully!` });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to download template' });
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setMessage({ type: 'error', text: 'Please select an Excel file (.xlsx or .xls)' });
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setResults(null);
      setMessage({ type: '', text: '' });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file first' });
      return;
    }

    setLoading(true);
    setResults(null);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/bulk-upload/${activeTab}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setResults(response.data.results);
      setMessage({ 
        type: response.data.results.failed === 0 ? 'success' : 'warning',
        text: response.data.message 
      });
      
      // Clear file input after successful upload
      setFile(null);
      document.getElementById('file-input').value = '';
      
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Upload failed. Please check your file format.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="bulk-upload-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bulk Upload 📊</h1>
        <p className="text-gray-600">Upload multiple records at once using Excel files</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="catching" data-testid="tab-catching">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Catching Records
          </TabsTrigger>
          <TabsTrigger value="surgery" data-testid="tab-surgery">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Surgery Records
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catching">
          <Card className="shadow-lg">
            <CardHeader className="bg-blue-50">
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Bulk Upload Catching Records
              </CardTitle>
              <CardDescription>
                Upload multiple catching records from an Excel file. Download the template first to ensure correct format.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <UploadSection
                type="catching"
                file={file}
                loading={loading}
                downloading={downloading}
                onDownload={downloadTemplate}
                onFileChange={handleFileChange}
                onUpload={handleUpload}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="surgery">
          <Card className="shadow-lg">
            <CardHeader className="bg-green-50">
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Bulk Upload Surgery Records
              </CardTitle>
              <CardDescription>
                Upload surgery records for existing cases. Medicine stock will be automatically deducted based on weight.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <UploadSection
                type="surgery"
                file={file}
                loading={loading}
                downloading={downloading}
                onDownload={downloadTemplate}
                onFileChange={handleFileChange}
                onUpload={handleUpload}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Messages */}
      {message.text && (
        <Alert 
          variant={message.type === 'error' ? 'destructive' : message.type === 'warning' ? 'default' : 'default'}
          className={message.type === 'success' ? 'border-green-500 bg-green-50' : message.type === 'warning' ? 'border-yellow-500 bg-yellow-50' : ''}
        >
          {message.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
          {message.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
          {message.type === 'error' && <XCircle className="h-4 w-4" />}
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : message.type === 'warning' ? 'text-yellow-800' : ''}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {results && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Upload Results
              {results.failed === 0 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-green-100 rounded-lg text-center">
                <p className="text-3xl font-bold text-green-700">{results.success}</p>
                <p className="text-green-600">Successfully Uploaded</p>
              </div>
              <div className="p-4 bg-red-100 rounded-lg text-center">
                <p className="text-3xl font-bold text-red-700">{results.failed}</p>
                <p className="text-red-600">Failed</p>
              </div>
            </div>

            {/* Medicine Deductions for Surgery */}
            {results.medicines_deducted && Object.keys(results.medicines_deducted).length > 0 && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold mb-2 text-blue-800">Medicine Stock Deducted:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(results.medicines_deducted).map(([name, amount]) => (
                    <div key={name} className="text-sm bg-white p-2 rounded">
                      <span className="font-medium">{name}:</span> -{amount.toFixed(2)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {results.errors && results.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2 text-red-700">Errors:</h4>
                <div className="max-h-60 overflow-y-auto bg-red-50 rounded-lg p-3">
                  {results.errors.map((error, idx) => (
                    <p key={idx} className="text-sm text-red-600 py-1 border-b border-red-100 last:border-0">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>📖 Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Catching Records Template:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><strong>Case Number*</strong> - Unique identifier (e.g., JAPP-001-2024)</li>
              <li><strong>Date*</strong> - Format: DD/MM/YYYY</li>
              <li><strong>Time*</strong> - Format: HH:MM (24-hour)</li>
              <li><strong>Latitude*</strong> - GPS coordinate (e.g., 19.0760)</li>
              <li><strong>Longitude*</strong> - GPS coordinate (e.g., 72.8777)</li>
              <li><strong>Address*</strong> - Full address of catching location</li>
              <li><strong>Ward Number</strong> - Optional</li>
              <li><strong>Remarks</strong> - Optional notes</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Surgery Records Template:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><strong>Case Number*</strong> - Must match existing case</li>
              <li><strong>Surgery Date*</strong> - Format: DD/MM/YYYY</li>
              <li><strong>Gender*</strong> - Male or Female</li>
              <li><strong>Weight*</strong> - Between 10-30 kg</li>
              <li><strong>Surgery Cancelled*</strong> - Yes or No</li>
              <li><strong>Cancellation Reason</strong> - Required if cancelled (e.g., Too weak, Under age)</li>
              <li><strong>Skin Condition</strong> - Normal, Rough, or Visible Infection</li>
              <li><strong>Remarks</strong> - Optional notes</li>
            </ul>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> For surgery records, medicine stock will be automatically calculated and deducted based on the animal's weight and gender using standard protocols.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const UploadSection = ({ type, file, loading, downloading, onDownload, onFileChange, onUpload }) => (
  <div className="space-y-6">
    {/* Step 1: Download Template */}
    <div className="p-4 border-2 border-dashed rounded-lg">
      <h4 className="font-semibold mb-2">Step 1: Download Template</h4>
      <p className="text-sm text-gray-600 mb-3">
        Download the Excel template and fill in your data following the format.
      </p>
      <Button
        onClick={() => onDownload(type)}
        disabled={downloading}
        variant="outline"
        className="w-full sm:w-auto"
        data-testid={`download-template-${type}`}
      >
        <Download className="w-4 h-4 mr-2" />
        {downloading ? 'Downloading...' : `Download ${type === 'catching' ? 'Catching' : 'Surgery'} Template`}
      </Button>
    </div>

    {/* Step 2: Upload File */}
    <div className="p-4 border-2 border-dashed rounded-lg">
      <h4 className="font-semibold mb-2">Step 2: Upload Filled Template</h4>
      <p className="text-sm text-gray-600 mb-3">
        Select your filled Excel file (.xlsx or .xls)
      </p>
      <div className="space-y-4">
        <div>
          <Label htmlFor="file-input">Select Excel File</Label>
          <Input
            id="file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={onFileChange}
            className="mt-1"
            data-testid={`file-input-${type}`}
          />
        </div>
        {file && (
          <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            <span className="text-sm">{file.name}</span>
          </div>
        )}
      </div>
    </div>

    {/* Step 3: Upload */}
    <Button
      onClick={onUpload}
      disabled={loading || !file}
      className={`w-full ${type === 'catching' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
      data-testid={`upload-btn-${type}`}
    >
      <Upload className="w-4 h-4 mr-2" />
      {loading ? 'Uploading...' : `Upload ${type === 'catching' ? 'Catching' : 'Surgery'} Records`}
    </Button>
  </div>
);

export default BulkUpload;
