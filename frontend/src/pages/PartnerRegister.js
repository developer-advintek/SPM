import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const PartnerRegister = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Company Information
    company_name: '',
    contact_name: '',
    contact_email: '',
    phone: '',
    website: '',
    
    // Step 2: Business Details
    business_type: '',
    years_in_business: '',
    number_of_employees: '',
    expected_monthly_volume: '',
    
    // Step 3: KYC Documents
    documents: {
      business_license: null,
      tax_id: null,
      identity_proof: null,
      bank_statement: null,
      signed_agreement: null
    },
    
    // Step 4: Account Details
    password: '',
    confirm_password: '',
    
    // Step 5: Agreement
    terms_accepted: false,
    privacy_accepted: false
  });

  const [uploadedFiles, setUploadedFiles] = useState({
    business_license: null,
    tax_id: null,
    identity_proof: null,
    bank_statement: null,
    signed_agreement: null
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleFileUpload = (documentType, event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should not exceed 5MB');
        return;
      }
      
      setUploadedFiles({
        ...uploadedFiles,
        [documentType]: file
      });
      
      toast.success(`${file.name} uploaded successfully`);
    }
  };

  const handleNext = () => {
    // Validation for each step
    if (step === 1) {
      if (!formData.company_name || !formData.contact_name || !formData.contact_email) {
        toast.error('Please fill in all required fields');
        return;
      }
    }
    if (step === 2) {
      if (!formData.business_type || !formData.years_in_business) {
        toast.error('Please fill in all required fields');
        return;
      }
    }
    if (step === 3) {
      // Check required documents
      if (!uploadedFiles.business_license || !uploadedFiles.tax_id || !uploadedFiles.identity_proof) {
        toast.error('Please upload all required documents (Business License, Tax ID, Identity Proof)');
        return;
      }
    }
    if (step === 4) {
      if (!formData.password || formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      if (formData.password !== formData.confirm_password) {
        toast.error('Passwords do not match');
        return;
      }
    }
    
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.terms_accepted || !formData.privacy_accepted) {
      toast.error('Please accept all terms and agreements');
      return;
    }

    try {
      // Create user account (initially inactive until approved)
      const userResponse = await axios.post(`${API}/auth/register`, {
        email: formData.contact_email,
        full_name: formData.contact_name,
        password: formData.password,
        role: 'partner'
      });

      // Upload documents to backend
      const formDataToSend = new FormData();
      formDataToSend.append('company_name', formData.company_name);
      formDataToSend.append('contact_name', formData.contact_name);
      formDataToSend.append('contact_email', formData.contact_email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('website', formData.website);
      formDataToSend.append('business_type', formData.business_type);
      formDataToSend.append('years_in_business', formData.years_in_business);
      formDataToSend.append('number_of_employees', formData.number_of_employees);
      formDataToSend.append('expected_monthly_volume', formData.expected_monthly_volume);
      formDataToSend.append('user_id', userResponse.data.user.id);

      // Append documents
      Object.keys(uploadedFiles).forEach(key => {
        if (uploadedFiles[key]) {
          formDataToSend.append(key, uploadedFiles[key]);
        }
      });

      await axios.post(`${API}/partners/register`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Registration submitted! Your application is pending admin approval. You will receive an email once approved.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed. Please try again.');
    }
  };

  const progressPercentage = (step / 5) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-2xl relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Partner Registration
          </h1>
          <p className="text-slate-300">Join our partner network in 4 simple steps</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={progressPercentage} className="h-3" data-testid="registration-progress" />
          <div className="flex justify-between mt-2 text-sm text-slate-400">
            <span className={step >= 1 ? 'text-purple-400 font-semibold' : ''}>Company</span>
            <span className={step >= 2 ? 'text-purple-400 font-semibold' : ''}>Business</span>
            <span className={step >= 3 ? 'text-purple-400 font-semibold' : ''}>Documents</span>
            <span className={step >= 4 ? 'text-purple-400 font-semibold' : ''}>Account</span>
            <span className={step >= 5 ? 'text-purple-400 font-semibold' : ''}>Review</span>
          </div>
        </div>

        <Card data-testid="partner-register-card">
          <CardHeader>
            <CardTitle className="text-white text-2xl">
              Step {step} of 5: {
                step === 1 ? 'Company Information' :
                step === 2 ? 'Business Details' :
                step === 3 ? 'KYC Documents' :
                step === 4 ? 'Account Setup' :
                'Terms & Agreements'
              }
            </CardTitle>
            <CardDescription className="text-slate-300">
              {step === 1 && 'Tell us about your company'}
              {step === 2 && 'Provide your business information'}
              {step === 3 && 'Upload required verification documents'}
              {step === 4 && 'Create your login credentials'}
              {step === 5 && 'Review and accept our terms'}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Step 1: Company Information */}
              {step === 1 && (
                <>
                  <div>
                    <Label className="text-slate-100 font-semibold">Company Name *</Label>
                    <Input
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      required
                      placeholder="Acme Corporation"
                      className="bg-white/10 border-white/30 text-white placeholder:text-slate-400"
                      data-testid="input-company-name"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-100 font-semibold">Contact Name *</Label>
                    <Input
                      name="contact_name"
                      value={formData.contact_name}
                      onChange={handleInputChange}
                      required
                      placeholder="John Doe"
                      className="bg-white/10 border-white/30 text-white placeholder:text-slate-400"
                      data-testid="input-contact-name"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-100 font-semibold">Contact Email *</Label>
                    <Input
                      name="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={handleInputChange}
                      required
                      placeholder="john@acme.com"
                      className="bg-white/10 border-white/30 text-white placeholder:text-slate-400"
                      data-testid="input-contact-email"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-100 font-semibold">Phone Number</Label>
                    <Input
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                      className="bg-white/10 border-white/30 text-white placeholder:text-slate-400"
                      data-testid="input-phone"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-100 font-semibold">Website</Label>
                    <Input
                      name="website"
                      type="url"
                      value={formData.website}
                      onChange={handleInputChange}
                      placeholder="https://www.acme.com"
                      className="bg-white/10 border-white/30 text-white placeholder:text-slate-400"
                      data-testid="input-website"
                    />
                  </div>
                </>
              )}

              {/* Step 2: Business Details */}
              {step === 2 && (
                <>
                  <div>
                    <Label className="text-slate-100 font-semibold">Business Type *</Label>
                    <select
                      name="business_type"
                      value={formData.business_type}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border rounded-lg bg-white/10 border-white/30 text-white"
                      data-testid="select-business-type"
                    >
                      <option value="">Select type</option>
                      <option value="reseller">Reseller</option>
                      <option value="distributor">Distributor</option>
                      <option value="system_integrator">System Integrator</option>
                      <option value="consultant">Consultant</option>
                      <option value="value_added_reseller">Value Added Reseller (VAR)</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-slate-100 font-semibold">Years in Business *</Label>
                    <Input
                      name="years_in_business"
                      type="number"
                      value={formData.years_in_business}
                      onChange={handleInputChange}
                      required
                      placeholder="5"
                      className="bg-white/10 border-white/30 text-white placeholder:text-slate-400"
                      data-testid="input-years"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-100 font-semibold">Number of Employees</Label>
                    <select
                      name="number_of_employees"
                      value={formData.number_of_employees}
                      onChange={handleInputChange}
                      className="w-full p-3 border rounded-lg bg-white/10 border-white/30 text-white"
                      data-testid="select-employees"
                    >
                      <option value="">Select range</option>
                      <option value="1-10">1-10</option>
                      <option value="11-50">11-50</option>
                      <option value="51-200">51-200</option>
                      <option value="201-500">201-500</option>
                      <option value="500+">500+</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-slate-100 font-semibold">Expected Monthly Volume</Label>
                    <Input
                      name="expected_monthly_volume"
                      value={formData.expected_monthly_volume}
                      onChange={handleInputChange}
                      placeholder="e.g., $50,000"
                      className="bg-white/10 border-white/30 text-white placeholder:text-slate-400"
                      data-testid="input-volume"
                    />
                  </div>
                </>
              )}

              {/* Step 3: Account Setup */}
              {step === 3 && (
                <>
                  <div className="p-4 bg-blue-500/20 border border-blue-400/40 rounded-lg">
                    <p className="text-blue-100 text-sm">
                      <strong>Email:</strong> {formData.contact_email}
                    </p>
                    <p className="text-blue-200/80 text-xs mt-1">This will be your login email</p>
                  </div>
                  <div>
                    <Label className="text-slate-100 font-semibold">Password *</Label>
                    <Input
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      placeholder="Minimum 6 characters"
                      className="bg-white/10 border-white/30 text-white placeholder:text-slate-400"
                      data-testid="input-password"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-100 font-semibold">Confirm Password *</Label>
                    <Input
                      name="confirm_password"
                      type="password"
                      value={formData.confirm_password}
                      onChange={handleInputChange}
                      required
                      placeholder="Re-enter password"
                      className="bg-white/10 border-white/30 text-white placeholder:text-slate-400"
                      data-testid="input-confirm-password"
                    />
                  </div>
                </>
              )}

              {/* Step 4: Agreements */}
              {step === 4 && (
                <>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-700/30 border border-slate-600/30 rounded-lg max-h-60 overflow-y-auto">
                      <h3 className="font-semibold text-white mb-2">Partner Agreement Summary</h3>
                      <ul className="text-sm text-slate-300 space-y-2">
                        <li>• Commission rates will be determined based on your tier and performance</li>
                        <li>• You agree to maintain accurate records of all sales transactions</li>
                        <li>• Payments will be processed monthly after approval</li>
                        <li>• You will comply with all applicable laws and regulations</li>
                        <li>• Non-Financial Metrics (NFMs) may affect final commission calculations</li>
                        <li>• Your partnership can be reviewed and adjusted based on performance</li>
                      </ul>
                    </div>

                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        name="terms_accepted"
                        checked={formData.terms_accepted}
                        onChange={handleInputChange}
                        className="mt-1"
                        data-testid="checkbox-terms"
                      />
                      <label className="text-slate-200 text-sm">
                        I accept the <span className="text-purple-400 underline cursor-pointer">Terms and Conditions</span> and understand the partner agreement
                      </label>
                    </div>

                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        name="privacy_accepted"
                        checked={formData.privacy_accepted}
                        onChange={handleInputChange}
                        className="mt-1"
                        data-testid="checkbox-privacy"
                      />
                      <label className="text-slate-200 text-sm">
                        I accept the <span className="text-purple-400 underline cursor-pointer">Privacy Policy</span> and consent to data processing
                      </label>
                    </div>
                  </div>
                </>
              )}
            </CardContent>

            <CardFooter className="flex justify-between">
              <div>
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={handleBack} data-testid="btn-back">
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Link to="/login">
                  <Button type="button" variant="ghost" className="text-slate-300">
                    Already have an account?
                  </Button>
                </Link>
                {step < 4 ? (
                  <Button type="button" onClick={handleNext} data-testid="btn-next">
                    Next
                  </Button>
                ) : (
                  <Button type="submit" data-testid="btn-submit-registration" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                    Complete Registration
                  </Button>
                )}
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};
