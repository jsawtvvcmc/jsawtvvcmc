import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Eye, FileText, Calendar } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RecordsView = ({ recordType, title, fields }) => {
  const { token } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [periodType, setPeriodType] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const recordsPerPage = 100;

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let data = [];
      
      if (recordType === 'catching' || recordType === 'surgery' || recordType === 'treatment' || recordType === 'release') {
        // Fetch cases
        const response = await axios.get(`${API}/cases`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        data = response.data;
      } else if (recordType === 'feeding') {
        // Fetch feeding records
        const response = await axios.get(`${API}/daily-feeding`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        data = response.data;
      }
      
      setRecords(data);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get date from record based on record type
  const getRecordDate = (record) => {
    switch (recordType) {
      case 'catching':
        return record.catching?.date_time || record.created_at;
      case 'surgery':
        return record.surgery?.surgery_date;
      case 'treatment':
        return record.daily_treatments?.[record.daily_treatments.length - 1]?.date;
      case 'release':
        return record.release?.date_time;
      case 'feeding':
        return record.date;
      default:
        return record.created_at;
    }
  };

  // Filter records based on period
  const filteredRecords = useMemo(() => {
    let result = [...records];
    
    // Filter by record type requirements
    if (recordType === 'surgery') {
      result = result.filter(r => r.surgery);
    } else if (recordType === 'treatment') {
      result = result.filter(r => r.daily_treatments && r.daily_treatments.length > 0);
    } else if (recordType === 'release') {
      result = result.filter(r => r.release);
    }
    
    // Filter by date period
    const now = new Date();
    let startDate, endDate;
    
    if (periodType === 'month') {
      const [year, month] = selectedMonth.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else if (periodType === 'week') {
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (periodType === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      return result;
    }
    
    return result.filter(record => {
      const recordDate = new Date(getRecordDate(record));
      return recordDate >= startDate && recordDate <= endDate;
    });
  }, [records, recordType, periodType, selectedMonth, customStartDate, customEndDate]);

  // Paginate records
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    return filteredRecords.slice(startIndex, startIndex + recordsPerPage);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get display value for a field
  const getFieldValue = (record, field) => {
    const value = field.accessor(record);
    if (field.type === 'date') {
      return formatDate(value);
    }
    if (field.type === 'status') {
      return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          value === 'Released' ? 'bg-green-100 text-green-800' :
          value === 'Surgery Completed' ? 'bg-blue-100 text-blue-800' :
          value === 'Surgery Cancelled' ? 'bg-red-100 text-red-800' :
          value === 'Under Treatment' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value || 'N/A'}
        </span>
      );
    }
    return value || 'N/A';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {title} Records
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Period Filter */}
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg items-end">
          <div className="min-w-[150px]">
            <Label className="flex items-center gap-1 mb-2">
              <Calendar className="w-4 h-4" />
              Period
            </Label>
            <Select value={periodType} onValueChange={(v) => { setPeriodType(v); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Records</SelectItem>
                <SelectItem value="month">By Month</SelectItem>
                <SelectItem value="week">Current Week</SelectItem>
                <SelectItem value="custom">Custom Dates</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodType === 'month' && (
            <div className="min-w-[150px]">
              <Label className="mb-2 block">Month</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
              />
            </div>
          )}

          {periodType === 'custom' && (
            <>
              <div className="min-w-[150px]">
                <Label className="mb-2 block">Start Date</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => { setCustomStartDate(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <div className="min-w-[150px]">
                <Label className="mb-2 block">End Date</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => { setCustomEndDate(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </>
          )}

          <div className="flex-1 text-right">
            <span className="text-sm text-gray-600">
              Showing {filteredRecords.length} records
            </span>
          </div>
        </div>

        {/* Records Table */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="bg-green-600 text-white">
                <th className="p-3 text-left font-medium">Sr.</th>
                {fields.map((field, idx) => (
                  <th key={idx} className="p-3 text-left font-medium">{field.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={fields.length + 1} className="p-8 text-center text-gray-500">
                    No records found for the selected period
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record, idx) => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-gray-600">
                      {(currentPage - 1) * recordsPerPage + idx + 1}
                    </td>
                    {fields.map((field, fidx) => (
                      <td key={fidx} className="p-3">
                        {getFieldValue(record, field)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages} ({filteredRecords.length} total records)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecordsView;
