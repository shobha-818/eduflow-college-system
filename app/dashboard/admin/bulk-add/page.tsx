'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Upload, Download, Users, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

interface ExcelUser {
  Name: string;
  Email: string;
  Role: string;
  Department: string;
  Phone: string;
  'Student ID': string;
}

interface ProcessResult {
  email: string;
  success: boolean;
  error?: string;
}

export default function BulkAddPage() {
  const router = useRouter();
  const [data, setData] = useState<ExcelUser[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessResult[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const parsedData = XLSX.utils.sheet_to_json<ExcelUser>(ws);
        
        // Basic validation
        const validData = parsedData.filter(row => row.Name && row.Email && row.Role);
        setData(validData);
        setResults([]);
        toast.success(`Loaded ${validData.length} valid records`);
      } catch (error) {
        toast.error('Failed to parse Excel file');
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const templateData = [{
      Name: 'John Doe',
      Email: 'john@example.com',
      Role: 'student',
      Department: 'Computer Science',
      Phone: '+91 9876543210',
      'Student ID': 'CS-001'
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'EduFlow_Bulk_User_Template.xlsx');
  };

  const processBulkAdd = async () => {
    if (data.length === 0) return;
    setIsProcessing(true);
    const newResults: ProcessResult[] = [];

    const defaultPassword = 'Student@123';

    for (let i = 0; i < data.length; i++) {
      const user = data[i];
      try {
        // Rate limiting protection: Wait 500ms between requests
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 500));

        const verificationToken = crypto.randomUUID();

        // 1. Create the user in Supabase Auth
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: user.Email,
          password: defaultPassword,
          options: {
            data: {
              name: user.Name,
              role: user.Role.toLowerCase(),
              department: user.Department,
              phone: user.Phone,
              employee_id: user['Student ID'],
              email_verified: false,
              is_approved: true,
              verification_token: verificationToken
            }
          }
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error('Failed to create auth user');

        // Optional: Trigger welcome email via background API
        fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'verification',
            recipients: [{ email: user.Email, id: authData.user.id }],
            data: {
              email: user.Email,
              name: user.Name,
              role: user.Role.toLowerCase(),
              department: user.Department,
              phone: user.Phone,
              tempPassword: defaultPassword,
              verificationToken: verificationToken,
              userId: authData.user.id
            }
          }),
        }).catch(err => console.error('Notification error:', err));

        newResults.push({ email: user.Email, success: true });
      } catch (error: any) {
        newResults.push({ 
          email: user.Email, 
          success: false, 
          error: error.message || 'Unknown error' 
        });
      }
      // Update state progressively so user sees progress
      setResults([...newResults]);
    }

    setIsProcessing(false);
    
    const successes = newResults.filter(r => r.success).length;
    const failures = newResults.filter(r => !r.success).length;
    
    if (failures === 0) {
      toast.success(`Successfully added all ${successes} users!`);
    } else {
      toast.warning(`Added ${successes} users, but ${failures} failed.`);
    }
  };

  const successes = results.filter(r => r.success).length;
  const failures = results.filter(r => !r.success).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/users">
          <Button variant="ghost" size="icon">
            <ChevronLeft size={20} />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bulk Add Users</h1>
          <p className="text-muted-foreground">Import multiple users via Excel or CSV</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Download size={20} /> Step 1: Download Template
          </h2>
          <p className="text-sm text-muted-foreground">
            Download our standard Excel template. Fill in the user details making sure not to change the column headers.
          </p>
          <Button onClick={downloadTemplate} variant="outline" className="w-full">
            Download Template
          </Button>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Upload size={20} /> Step 2: Upload Data
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload the filled Excel or CSV file to preview the data before processing.
          </p>
          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isProcessing}
            />
            <Button className="w-full pointer-events-none">
              Select File
            </Button>
          </div>
        </Card>
      </div>

      {data.length > 0 && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users size={20} /> Preview & Process ({data.length} records)
            </h2>
            <Button 
              onClick={processBulkAdd} 
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing {results.length}/{data.length}...
                </>
              ) : (
                'Add All Users'
              )}
            </Button>
          </div>

          {(successes > 0 || failures > 0) && (
            <div className="flex gap-4 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle size={20} />
                <span className="font-medium">{successes} Successful</span>
              </div>
              <div className="flex items-center gap-2 text-destructive">
                <XCircle size={20} />
                <span className="font-medium">{failures} Failed</span>
              </div>
            </div>
          )}

          <div className="border rounded-md overflow-hidden overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((user, index) => {
                  const result = results.find(r => r.email === user.Email);
                  return (
                    <tr key={index} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        {!result ? (
                          <span className="text-muted-foreground">Pending</span>
                        ) : result.success ? (
                          <span className="text-green-600 flex items-center gap-1"><CheckCircle size={14}/> Success</span>
                        ) : (
                          <span className="text-destructive flex items-center gap-1" title={result.error}>
                            <XCircle size={14}/> Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{user.Name}</td>
                      <td className="px-4 py-3">{user.Email}</td>
                      <td className="px-4 py-3 capitalize">{user.Role}</td>
                      <td className="px-4 py-3">{user.Department}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
