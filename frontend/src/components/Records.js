import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import RecordsView from './RecordsView';
import { Truck, Eye, Scissors, Pill, Apple, Home } from 'lucide-react';

const Records = () => {
  // Field definitions for each record type
  const catchingFields = [
    { header: 'Case No', accessor: (r) => r.case_number },
    { header: 'Date', accessor: (r) => r.catching?.date_time || r.created_at, type: 'date' },
    { header: 'Address', accessor: (r) => r.catching?.address?.substring(0, 50) + (r.catching?.address?.length > 50 ? '...' : '') },
    { header: 'Ward', accessor: (r) => r.catching?.ward_number },
    { header: 'Photos', accessor: (r) => r.catching?.photo_links?.length || 0 },
    { header: 'Status', accessor: (r) => r.status, type: 'status' },
  ];

  const surgeryFields = [
    { header: 'Case No', accessor: (r) => r.case_number },
    { header: 'Surgery Date', accessor: (r) => r.surgery?.surgery_date, type: 'date' },
    { header: 'Gender', accessor: (r) => r.initial_observation?.gender },
    { header: 'Weight', accessor: (r) => r.surgery?.weight ? `${r.surgery.weight} kg` : 'N/A' },
    { header: 'Type', accessor: (r) => r.surgery?.surgery_type },
    { header: 'Pre-Status', accessor: (r) => r.surgery?.pre_surgery_status },
    { header: 'Photos', accessor: (r) => r.surgery?.photo_links?.length || 0 },
    { header: 'Status', accessor: (r) => r.status, type: 'status' },
  ];

  const treatmentFields = [
    { header: 'Case No', accessor: (r) => r.case_number },
    { header: 'Last Treatment', accessor: (r) => r.daily_treatments?.[r.daily_treatments.length - 1]?.date, type: 'date' },
    { header: 'Days Post-Op', accessor: (r) => r.daily_treatments?.[r.daily_treatments.length - 1]?.day_post_surgery },
    { header: 'Wound Condition', accessor: (r) => r.daily_treatments?.[r.daily_treatments.length - 1]?.wound_condition },
    { header: 'Treatment Count', accessor: (r) => r.daily_treatments?.length || 0 },
    { header: 'Kennel', accessor: (r) => r.initial_observation?.kennel_number },
    { header: 'Status', accessor: (r) => r.status, type: 'status' },
  ];

  const feedingFields = [
    { header: 'Date', accessor: (r) => r.date, type: 'date' },
    { header: 'Meal Time', accessor: (r) => r.meal_time },
    { header: 'Kennels Fed', accessor: (r) => r.kennel_numbers?.length || 0 },
    { header: 'Total Quantity', accessor: (r) => `${r.total_quantity} kg` },
    { header: 'Not Fed', accessor: (r) => r.animals_not_fed?.length || 0 },
    { header: 'Photos', accessor: (r) => r.photo_links?.length || 0 },
    { header: 'Remarks', accessor: (r) => r.remarks?.substring(0, 30) || '-' },
  ];

  const releaseFields = [
    { header: 'Case No', accessor: (r) => r.case_number },
    { header: 'Release Date', accessor: (r) => r.release?.date_time, type: 'date' },
    { header: 'Gender', accessor: (r) => r.initial_observation?.gender },
    { header: 'Location', accessor: (r) => r.release?.address?.substring(0, 40) + (r.release?.address?.length > 40 ? '...' : '') },
    { header: 'Catching Date', accessor: (r) => r.catching?.date_time || r.created_at, type: 'date' },
    { header: 'Surgery Date', accessor: (r) => r.surgery?.surgery_date, type: 'date' },
    { header: 'Photos', accessor: (r) => r.release?.photo_links?.length || 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Records</h1>
        <p className="text-gray-600">View all records with filtering and pagination</p>
      </div>

      <Tabs defaultValue="catching" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="catching" className="flex items-center gap-1">
            <Truck className="w-4 h-4" />
            Catching
          </TabsTrigger>
          <TabsTrigger value="surgery" className="flex items-center gap-1">
            <Scissors className="w-4 h-4" />
            Surgery
          </TabsTrigger>
          <TabsTrigger value="treatment" className="flex items-center gap-1">
            <Pill className="w-4 h-4" />
            Treatment
          </TabsTrigger>
          <TabsTrigger value="feeding" className="flex items-center gap-1">
            <Apple className="w-4 h-4" />
            Feeding
          </TabsTrigger>
          <TabsTrigger value="release" className="flex items-center gap-1">
            <Home className="w-4 h-4" />
            Release
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catching">
          <RecordsView 
            recordType="catching" 
            title="Catching"
            fields={catchingFields}
          />
        </TabsContent>

        <TabsContent value="surgery">
          <RecordsView 
            recordType="surgery" 
            title="Surgery"
            fields={surgeryFields}
          />
        </TabsContent>

        <TabsContent value="treatment">
          <RecordsView 
            recordType="treatment" 
            title="Treatment"
            fields={treatmentFields}
          />
        </TabsContent>

        <TabsContent value="feeding">
          <RecordsView 
            recordType="feeding" 
            title="Feeding"
            fields={feedingFields}
          />
        </TabsContent>

        <TabsContent value="release">
          <RecordsView 
            recordType="release" 
            title="Release"
            fields={releaseFields}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Records;
