import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../contexts/AuthContext';

export const Analytics = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([
    { rank: 1, name: 'Alice Johnson', earnings: 45000, attainment: 125 },
    { rank: 2, name: 'Bob Smith', earnings: 42000, attainment: 118 },
    { rank: 3, name: 'Carol White', earnings: 38000, attainment: 105 }
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="analytics-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Analytics & Reports</h1>
          <p className="text-slate-400">Insights, forecasting & performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="btn-export-pdf">Export PDF</Button>
          <Button variant="outline" data-testid="btn-export-excel">Export Excel</Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="forecasting" data-testid="tab-forecasting">Forecasting</TabsTrigger>
          <TabsTrigger value="channel" data-testid="tab-channel">Channel Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="revenue-overview-card">
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Revenue</span>
                    <span className="font-bold text-xl">$2,450,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Commission Paid</span>
                    <span className="font-bold text-xl text-blue-600">$122,500</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">COS %</span>
                    <span className="font-bold text-xl">5.0%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="team-performance-card">
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-600">Team Quota Attainment</span>
                      <span className="font-semibold">92%</span>
                    </div>
                    <Progress value={92} data-testid="team-quota-progress" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-600">Average Deal Size</span>
                      <span className="font-semibold">$24,500</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-600">Win Rate</span>
                      <span className="font-semibold">68%</span>
                    </div>
                    <Progress value={68} data-testid="win-rate-progress" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="risk-analysis-card" className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Risk Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded" data-testid="risk-item-variance">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">Payout Variance Detected</p>
                        <p className="text-sm text-slate-600">Q1 2025 payouts are 8% above forecast</p>
                      </div>
                      <Badge variant="secondary">Medium</Badge>
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded" data-testid="risk-item-attainment">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">Strong Attainment Trend</p>
                        <p className="text-sm text-slate-600">Team is on track to exceed annual targets</p>
                      </div>
                      <Badge variant="default">Positive</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard">
          <Card data-testid="leaderboard-card">
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded hover:bg-slate-100 transition-colors"
                    data-testid={`leaderboard-entry-${idx}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        entry.rank === 1 ? 'bg-yellow-400' :
                        entry.rank === 2 ? 'bg-slate-300' :
                        entry.rank === 3 ? 'bg-orange-400' :
                        'bg-blue-100'
                      }`} data-testid={`rank-${entry.rank}`}>
                        {entry.rank}
                      </div>
                      <div>
                        <p className="font-semibold">{entry.name}</p>
                        <p className="text-sm text-slate-600">Attainment: {entry.attainment}%</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg" data-testid={`earnings-${idx}`}>${entry.earnings.toLocaleString()}</p>
                      <p className="text-sm text-slate-600">Earnings</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasting">
          <Card data-testid="forecasting-card">
            <CardHeader>
              <CardTitle>Scenario Modeling & Forecasting</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50" data-testid="scenario-conservative">
                    <h3 className="font-semibold mb-2">Conservative</h3>
                    <p className="text-sm text-slate-600 mb-3">Revenue: $2.8M</p>
                    <div className="space-y-1 text-sm">
                      <p>Projected Payout: <span className="font-semibold">$140K</span></p>
                      <p>COS: <span className="font-semibold">5.0%</span></p>
                    </div>
                  </div>
                  <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50" data-testid="scenario-realistic">
                    <h3 className="font-semibold mb-2">Realistic</h3>
                    <p className="text-sm text-slate-600 mb-3">Revenue: $3.2M</p>
                    <div className="space-y-1 text-sm">
                      <p>Projected Payout: <span className="font-semibold">$160K</span></p>
                      <p>COS: <span className="font-semibold">5.0%</span></p>
                    </div>
                  </div>
                  <div className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50" data-testid="scenario-optimistic">
                    <h3 className="font-semibold mb-2">Optimistic</h3>
                    <p className="text-sm text-slate-600 mb-3">Revenue: $3.8M</p>
                    <div className="space-y-1 text-sm">
                      <p>Projected Payout: <span className="font-semibold">$190K</span></p>
                      <p>COS: <span className="font-semibold">5.0%</span></p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded">
                  <h3 className="font-semibold mb-3">Variance Report</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Current Plan vs Realistic</span>
                      <span className="text-green-600 font-semibold">+12%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payout Variance</span>
                      <span className="text-blue-600 font-semibold">$20K</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channel">
          <Card data-testid="channel-health-card">
            <CardHeader>
              <CardTitle>Partner Health Scorecard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded" data-testid="partner-scorecard-1">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">Acme Partners</h3>
                      <p className="text-sm text-slate-600">Gold Tier</p>
                    </div>
                    <Badge variant="default">Healthy</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">NFM Compliance</p>
                      <p className="font-semibold">95%</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Profitability</p>
                      <p className="font-semibold text-green-600">High</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Deal Volume</p>
                      <p className="font-semibold">42/month</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded" data-testid="partner-scorecard-2">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">Beta Solutions</h3>
                      <p className="text-sm text-slate-600">Silver Tier</p>
                    </div>
                    <Badge variant="secondary">At Risk</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">NFM Compliance</p>
                      <p className="font-semibold">72%</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Profitability</p>
                      <p className="font-semibold text-yellow-600">Medium</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Deal Volume</p>
                      <p className="font-semibold">18/month</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
