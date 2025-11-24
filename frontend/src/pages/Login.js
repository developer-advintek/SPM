import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('rep');
  const { login, register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegister) {
        await register({ email, password, full_name: fullName, role });
        toast.success('Registration successful!');
      } else {
        await login(email, password);
        toast.success('Login successful!');
      }
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    }
  };

  const handleGoogleLogin = async () => {
    // Mock Google login
    try {
      await googleLogin({
        google_id: 'mock-google-id-' + Date.now(),
        email: 'user@example.com',
        name: 'Google User'
      });
      toast.success('Google login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Google login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      <Card className="w-full max-w-md relative z-10" data-testid="login-card">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/50">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription className="text-slate-300">SPM/PPM Enterprise System</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-slate-100 font-semibold">Full Name</Label>
                <Input
                  id="fullName"
                  data-testid="input-fullname"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-white/10 border-white/30 text-white placeholder:text-slate-400"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-100 font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                data-testid="input-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/10 border-white/30 text-white placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-100 font-semibold">Password</Label>
              <Input
                id="password"
                type="password"
                data-testid="input-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/10 border-white/30 text-white placeholder:text-slate-400"
              />
            </div>
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="role" className="text-slate-100 font-semibold">Role</Label>
                <select
                  id="role"
                  data-testid="select-role"
                  className="w-full p-3 border rounded-lg bg-white/10 border-white/30 text-white"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="rep">Sales Rep</option>
                  <option value="manager">Manager</option>
                  <option value="finance">Finance</option>
                  <option value="admin">Admin</option>
                  <option value="partner">Partner</option>
                </select>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button type="submit" className="w-full" data-testid="btn-submit">
              {isRegister ? 'Register' : 'Login'}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin} data-testid="btn-google">
              Continue with Google
            </Button>
            <button
              type="button"
              className="text-sm text-blue-600 hover:underline"
              onClick={() => setIsRegister(!isRegister)}
              data-testid="btn-toggle-mode"
            >
              {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
