import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import axios from 'axios';
import { toast } from 'sonner';
import { MapPin, Target, TrendingUp, Award, BarChart3 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const Strategic = () => {
  const [territories, setTerritories] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [nfms, setNfms] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [terrResp, quotaResp, forecastResp, nfmResp, userResp] = await Promise.all([
        axios.get(`${API}/strategic/territories`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}),
        axios.get(`${API}/strategic/quotas`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}),
        axios.get(`${API}/strategic/forecasts`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}),
        axios.get(`${API}/strategic/nfm`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}),
        axios.get(`${API}/users`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }})
      ]);
      
      setTerritories(terrResp.data);
      setQuotas(quotaResp.data);
      setForecasts(forecastResp.data);
      setNfms(nfmResp.data);
      setUsers(userResp.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  const createTerritory = async (data) => {
    try {
      await axios.post(`${API}/strategic/territories`, data, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Territory created!');
      fetchAll();
    } catch (error) {
      toast.error('Failed to create territory');
    }
  };

  const createQuota = async (data) => {
    try {
      await axios.post(`${API}/strategic/quotas`, data, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Quota created!');
      fetchAll();
    } catch (error) {
      toast.error('Failed to create quota');
    }
  };

  const createForecast = async (data) => {
    try {
      await axios.post(`${API}/strategic/forecasts`, data, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Forecast created!');
      fetchAll();
    } catch (error) {
      toast.error('Failed to create forecast');
    }
  };

  const createNFM = async (data) => {
    try {
      await axios.post(`${API}/strategic/nfm`, data, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('NFM created!');
      fetchAll();
    } catch (error) {
      toast.error('Failed to create NFM');
    }
  };

  const activateQuota = async (quotaId) => {
    try {
      await axios.put(`${API}/strategic/quotas/${quotaId}/activate`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Quota activated!');
      fetchAll();
    } catch (error) {
      toast.error('Failed to activate quota');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
          Strategic Planning
        </h1>
        <p className="text-slate-400">Territories, Quotas, Forecasting & Performance Metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Territories</p>
                <p className="text-2xl font-bold text-white">{territories.length}</p>
              </div>
              <MapPin className="w-8 h-8 text-indigo-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Active Quotas</p>
                <p className="text-2xl font-bold text-purple-400">{quotas.filter(q => q.status === 'active').length}</p>
              </div>
              <Target className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Forecasts</p>
                <p className="text-2xl font-bold text-blue-400">{forecasts.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">NFMs</p>
                <p className="text-2xl font-bold text-pink-400">{nfms.length}</p>
              </div>
              <Award className="w-8 h-8 text-pink-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="territories" className="space-y-4">
        <TabsList className="bg-slate-800/50 border-slate-700/50">
          <TabsTrigger value="territories" className="text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            Territories
          </TabsTrigger>
          <TabsTrigger value="quotas" className="text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            Quotas
          </TabsTrigger>
          <TabsTrigger value="forecasts" className="text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            Forecasting
          </TabsTrigger>
          <TabsTrigger value="nfm" className="text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            NFMs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="territories">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {territories.map(territory => (
              <Card key={territory.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-slate-100">{territory.name}</CardTitle>
                    <Badge className={territory.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                      {territory.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300 text-sm mb-3">{territory.description}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Regions:</span>
                      <span className="text-white">{territory.geography?.join(', ') || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Potential:</span>
                      <span className="text-indigo-400 font-bold">${parseFloat(territory.account_potential || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Assigned Rep:</span>
                      <span className="text-white">{territory.assigned_rep_id ? territory.assigned_rep_id.slice(0, 8) : 'Unassigned'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="quotas">
          <div className="space-y-3">
            {quotas.map(quota => (
              <Card key={quota.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-white font-semibold">Quota #{quota.id.slice(0, 8)}</p>
                        <Badge className={quota.status === 'active' ? 'bg-green-500' : quota.status === 'completed' ? 'bg-blue-500' : 'bg-gray-500'}>
                          {quota.status}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-sm mb-3">
                        User: {quota.user_id.slice(0, 8)} | Period: {new Date(quota.period_start).toLocaleDateString()} - {new Date(quota.period_end).toLocaleDateString()}
                      </p>
                      <div className="bg-slate-700/20 rounded-lg p-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-400">Quota Amount:</span>
                          <span className="text-white font-bold">${parseFloat(quota.quota_amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-400">Current Attainment:</span>
                          <span className="text-purple-400 font-bold">${parseFloat(quota.current_attainment || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Achievement:</span>
                          <span className="text-green-400 font-bold">{parseFloat(quota.attainment_percent || 0).toFixed(1)}%</span>
                        </div>
                        <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                            style={{ width: `${Math.min(parseFloat(quota.attainment_percent || 0), 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      {quota.status === 'draft' && (
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-green-500 to-emerald-500"
                          onClick={() => activateQuota(quota.id)}
                        >
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="forecasts">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {forecasts.map(forecast => (
              <Card key={forecast.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-slate-100">{forecast.scenario_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="bg-slate-700/20 rounded-lg p-3">
                      <p className="text-slate-400 text-xs mb-1">Projected Revenue</p>
                      <p className="text-blue-400 font-bold text-2xl">${parseFloat(forecast.projected_revenue).toFixed(2)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-700/20 rounded-lg p-3">
                        <p className="text-slate-400 text-xs mb-1">Projected Payout</p>
                        <p className="text-green-400 font-bold">${parseFloat(forecast.projected_payout).toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-700/20 rounded-lg p-3">
                        <p className="text-slate-400 text-xs mb-1">COS %</p>
                        <p className="text-purple-400 font-bold">{parseFloat(forecast.projected_cos_percent).toFixed(2)}%</p>
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm">
                      Period: {new Date(forecast.period_start).toLocaleDateString()} - {new Date(forecast.period_end).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="nfm">
          <div className="space-y-3">
            {nfms.map(nfm => (
              <Card key={nfm.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white font-semibold mb-1">{nfm.metric_name}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-400">Type: <span className="text-white">{nfm.metric_type}</span></span>
                        <span className="text-slate-400">Period: <span className="text-white">{nfm.measurement_period}</span></span>
                        {nfm.link_to_commission && (
                          <Badge className="bg-pink-500">Linked to Commission</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-xs">Target vs Actual</p>
                      <p className="text-white font-bold">
                        {parseFloat(nfm.target_value).toFixed(2)} / {parseFloat(nfm.actual_value || 0).toFixed(2)}
                      </p>
                      {nfm.link_to_commission && nfm.multiplier_effect && (
                        <p className="text-pink-400 text-sm">Multiplier: {nfm.multiplier_effect}x</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Strategic;