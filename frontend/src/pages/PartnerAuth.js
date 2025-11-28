import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription } from '../components/ui/alert';
import DocumentUploadSection from '../components/DocumentUploadSection';
import { Building, Mail, Phone, User, FileText, Globe, MapPin, Briefcase } from 'lucide-react';

function PartnerAuth() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Login form
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // Registration form - same fields as admin partner creation
  const [registrationForm, setRegistrationForm] = useState({
    company_name: '',
    business_type: '',
    tax_id: '',
    years_in_business: '',
    number_of_employees: '',
    expected_monthly_volume: '',
    business_address: '',
    website: '',
    contact_person_name: '',
    contact_person_email: '',
    contact_person_phone: '',
    contact_person_designation: '',
    password: '',
    confirm_password: '',
    documents: []
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await login(loginForm.email, loginForm.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (registrationForm.password !== registrationForm.confirm_password) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (registrationForm.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      // Remove confirm_password before sending to backend
      const { confirm_password, ...dataToSend } = registrationForm;
      
      const response = await fetch(`${BACKEND_URL}/api/partners/self-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });

      if (response.ok) {
        setSuccess('Registration submitted successfully! Your application is under review. You will be notified via email once approved.');
        // Reset form
        setRegistrationForm({
          company_name: '',
          business_type: '',
          tax_id: '',
          years_in_business: '',
          number_of_employees: '',
          expected_monthly_volume: '',
          business_address: '',
          website: '',
          contact_person_name: '',
          contact_person_email: '',
          contact_person_phone: '',
          contact_person_designation: '',
          password: '',
          confirm_password: '',
          documents: []
        });
        
        // Switch to login after 3 seconds
        setTimeout(() => {
          setIsLogin(true);
          setSuccess('');
        }, 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again later.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Building className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Partner Portal</h1>
          <p className="text-slate-300">SPM/PPM Enterprise System</p>
        </div>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-2xl">
                  {isLogin ? 'Partner Login' : 'Partner Registration'}
                </CardTitle>
                <CardDescription className="text-slate-300">
                  {isLogin 
                    ? 'Access your partner dashboard' 
                    : 'Register as a new partner - application will be reviewed by our team'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {error && (
              <Alert className="mb-6 bg-red-500/20 border-red-500/50">
                <AlertDescription className="text-red-200">{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="mb-6 bg-green-500/20 border-green-500/50">
                <AlertDescription className="text-green-200">{success}</AlertDescription>
              </Alert>
            )}

            {isLogin ? (
              // Login Form
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <Label className="text-white">Email</Label>
                  <Input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="partner@company.com"
                    required
                  />
                </div>

                <div>
                  <Label className="text-white">Password</Label>
                  <Input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>

                <div className="text-center space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="text-purple-400 hover:underline text-sm"
                  >
                    New partner? Register here
                  </button>
                  <br />
                  <Link to="/login" className="text-slate-400 hover:underline text-sm">
                    ← Back to main login
                  </Link>
                </div>
              </form>
            ) : (
              // Registration Form - Same as Admin Partner Creation
              <form onSubmit={handleRegister} className="space-y-6">
                {/* Company Information */}
                <div className="bg-white/5 p-6 rounded-lg border border-white/10">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Company Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white">Company Name *</Label>
                      <Input
                        value={registrationForm.company_name}
                        onChange={(e) => setRegistrationForm({ ...registrationForm, company_name: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-white">Business Type *</Label>
                      <Select
                        value={registrationForm.business_type}
                        onValueChange={(value) => setRegistrationForm({ ...registrationForm, business_type: value })}
                        required
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="retail">Retail Telecom</SelectItem>
                          <SelectItem value="wholesale">Wholesale Distributor</SelectItem>
                          <SelectItem value="online">Online/E-commerce</SelectItem>
                          <SelectItem value="enterprise">Enterprise Solutions</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white">Tax ID / Business Registration *</Label>
                      <Input
                        value={registrationForm.tax_id}
                        onChange={(e) => setRegistrationForm({ ...registrationForm, tax_id: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-white">Years in Business</Label>
                      <Input
                        type="number"
                        value={registrationForm.years_in_business}
                        onChange={(e) => setRegistrationForm({ ...registrationForm, years_in_business: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-white">Number of Employees</Label>
                      <Input
                        type="number"
                        value={registrationForm.number_of_employees}
                        onChange={(e) => setRegistrationForm({ ...registrationForm, number_of_employees: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-white">Expected Monthly Volume</Label>
                      <Input
                        value={registrationForm.expected_monthly_volume}
                        onChange={(e) => setRegistrationForm({ ...registrationForm, expected_monthly_volume: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="e.g., 100-500 units"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-white">Business Address *</Label>
                      <Textarea
                        value={registrationForm.business_address}
                        onChange={(e) => setRegistrationForm({ ...registrationForm, business_address: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-white">Website</Label>
                      <Input
                        type="url"
                        value={registrationForm.website}
                        onChange={(e) => setRegistrationForm({ ...registrationForm, website: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Person Information */}
                <div className="bg-white/5 p-6 rounded-lg border border-white/10">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Primary Contact Person
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white">Full Name *</Label>
                      <Input
                        value={registrationForm.contact_person_name}
                        onChange={(e) => setRegistrationForm({ ...registrationForm, contact_person_name: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-white">Email *</Label>
                      <Input
                        type="email"
                        value={registrationForm.contact_person_email}
                        onChange={(e) => setRegistrationForm({ ...registrationForm, contact_person_email: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-white">Phone *</Label>
                      <Input
                        type="tel"
                        value={registrationForm.contact_person_phone}
                        onChange={(e) => setRegistrationForm({ ...registrationForm, contact_person_phone: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-white">Designation</Label>
                      <Input
                        value={registrationForm.contact_person_designation}
                        onChange={(e) => setRegistrationForm({ ...registrationForm, contact_person_designation: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="e.g., Owner, Director, Manager"
                      />
                    </div>
                  </div>
                </div>

                {/* Account Credentials */}
                <div className="bg-white/5 p-6 rounded-lg border border-white/10">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Account Credentials
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white">Password *</Label>
                      <Input
                        type="password"
                        value={registrationForm.password}
                        onChange={(e) => setRegistrationForm({ ...registrationForm, password: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        minLength={6}
                        required
                      />
                      <p className="text-xs text-slate-400 mt-1">Minimum 6 characters</p>
                    </div>

                    <div>
                      <Label className="text-white">Confirm Password *</Label>
                      <Input
                        type="password"
                        value={registrationForm.confirm_password}
                        onChange={(e) => setRegistrationForm({ ...registrationForm, confirm_password: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Documents Upload */}
                <div className="bg-white/5 p-6 rounded-lg border border-white/10">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Supporting Documents
                  </h3>
                  <p className="text-slate-300 text-sm mb-4">
                    Please upload required legal and KYC documents (Business License, Tax Documents, Bank Statements, etc.)
                  </p>
                  <DocumentUploadSection
                    documents={registrationForm.documents}
                    onDocumentsChange={(docs) => setRegistrationForm({ ...registrationForm, documents: docs })}
                  />
                </div>

                {/* Terms and Submit */}
                <div className="space-y-4">
                  <Alert className="bg-blue-500/20 border-blue-500/50">
                    <AlertDescription className="text-blue-200">
                      <strong>Application Review Process:</strong> After submission, your application will be reviewed by our team. 
                      A tier will be assigned, followed by L1 and L2 approval. You will be notified via email at each stage.
                    </AlertDescription>
                  </Alert>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                  >
                    {loading ? 'Submitting Application...' : 'Submit Partner Application'}
                  </Button>
                </div>

                <div className="text-center space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setError('');
                      setSuccess('');
                    }}
                    className="text-purple-400 hover:underline text-sm"
                  >
                    Already registered? Login here
                  </button>
                  <br />
                  <Link to="/login" className="text-slate-400 hover:underline text-sm">
                    ← Back to main login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PartnerAuth;
