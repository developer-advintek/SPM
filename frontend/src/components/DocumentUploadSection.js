import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FileText, Plus, X } from 'lucide-react';

const DOCUMENT_TYPES = [
  { value: 'business_license', label: 'Business License' },
  { value: 'tax_document', label: 'Tax Document' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'signed_agreement', label: 'Signed Agreement' },
  { value: 'identity_proof', label: 'Identity Proof' },
  { value: 'kyc_document', label: 'KYC Document' }
];

function DocumentUploadSection({ documents, onDocumentsChange }) {
  const [currentDoc, setCurrentDoc] = useState({
    document_type: '',
    document_name: '',
    document_data: ''
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentDoc({
          ...currentDoc,
          document_name: file.name,
          document_data: reader.result.split(',')[1] // Base64 without data:... prefix
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const addDocument = () => {
    if (!currentDoc.document_type) {
      alert('Please select document type');
      return;
    }
    if (!currentDoc.document_data) {
      alert('Please select a file');
      return;
    }

    const newDocuments = [...documents, currentDoc];
    onDocumentsChange(newDocuments);

    // Reset
    setCurrentDoc({
      document_type: '',
      document_name: '',
      document_data: ''
    });

    // Clear file input
    const fileInput = document.getElementById('doc-file-input');
    if (fileInput) fileInput.value = '';
  };

  const removeDocument = (index) => {
    const newDocuments = documents.filter((_, i) => i !== index);
    onDocumentsChange(newDocuments);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          KYC & Legal Documents
        </h3>
        <p className="text-slate-400 text-sm mb-4">
          Upload required documents for verification (PDF, JPG, PNG - Max 5MB each)
        </p>
      </div>

      {/* Upload Form */}
      <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Document Type */}
          <div>
            <Label className="text-white text-sm mb-1">Document Type</Label>
            <Select
              value={currentDoc.document_type}
              onValueChange={(value) => setCurrentDoc({ ...currentDoc, document_type: value })}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div>
            <Label className="text-white text-sm mb-1">Choose File</Label>
            <Input
              id="doc-file-input"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          {/* Add Button */}
          <div className="flex items-end">
            <Button
              type="button"
              onClick={addDocument}
              disabled={!currentDoc.document_type || !currentDoc.document_data}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {currentDoc.document_name && (
          <p className="text-xs text-slate-300">
            Selected: {currentDoc.document_name}
          </p>
        )}
      </div>

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <p className="text-white text-sm font-medium">
            Uploaded Documents ({documents.length}):
          </p>
          {documents.map((doc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-white/10 rounded border border-white/10"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-white text-sm font-medium">
                    {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                  </p>
                  <p className="text-slate-400 text-xs">{doc.document_name}</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => removeDocument(idx)}
                size="sm"
                className="bg-red-600 hover:bg-red-700 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DocumentUploadSection;
