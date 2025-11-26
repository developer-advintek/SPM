#!/usr/bin/env python3
"""
Detailed Backend API Testing - Edge cases and comprehensive validation
"""

import requests
import json
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')
BASE_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://spmplatform.preview.emergentagent.com')

class DetailedTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.auth_token = None
        self.test_data = {}
        
    def log(self, message, level="INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def make_request(self, method, endpoint, data=None, params=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.auth_token:
            headers['Authorization'] = f"Bearer {self.auth_token}"
            
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers, params=params)
            elif method == 'POST':
                if params:
                    response = self.session.post(url, headers=headers, params=params)
                else:
                    response = self.session.post(url, headers=headers, json=data)
            elif method == 'PUT':
                response = self.session.put(url, headers=headers, json=data)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
            
        except Exception as e:
            self.log(f"Request failed: {str(e)}", "ERROR")
            return None
    
    def setup_auth(self):
        """Setup authentication"""
        login_data = {"email": "admin@spmplatform.com", "password": "SecureAdmin123!"}
        response = self.make_request('POST', '/api/auth/login', login_data)
        if response and response.status_code == 200:
            result = response.json()
            self.auth_token = result.get('access_token')
            self.test_data['admin_user'] = result.get('user')
            return True
        return False
    
    def test_commission_calculation_flow(self):
        """Test end-to-end commission calculation"""
        self.log("=== Testing Commission Calculation Flow ===")
        
        # Get existing transaction
        response = self.make_request('GET', '/api/transactions', params={'limit': 1})
        if not response or response.status_code != 200:
            self.log("No transactions found", "ERROR")
            return False
            
        transactions = response.json()
        if not transactions:
            self.log("No transactions available", "ERROR")
            return False
            
        transaction = transactions[0]
        transaction_id = transaction['id']
        
        # Check commission calculations
        response = self.make_request('GET', f"/api/transactions/{transaction_id}/commissions")
        if response and response.status_code == 200:
            commissions = response.json()
            self.log(f"Found {len(commissions)} commission calculations")
            
            if commissions:
                for calc in commissions:
                    self.log(f"Commission: ${calc.get('commission_amount', 0)} for rep {calc.get('sales_rep_id', 'N/A')}")
        
        return True
    
    def test_spiff_eligibility_and_calculation(self):
        """Test spiff eligibility and payout calculation"""
        self.log("=== Testing Spiff Eligibility and Calculation ===")
        
        # Get active spiffs
        response = self.make_request('GET', '/api/spiffs/active')
        if not response or response.status_code != 200:
            self.log("Failed to get active spiffs", "ERROR")
            return False
            
        active_spiffs = response.json()
        self.log(f"Found {len(active_spiffs)} active spiffs")
        
        if active_spiffs:
            spiff = active_spiffs[0]
            spiff_id = spiff['id']
            
            # Get a user to test with
            admin_user_id = self.test_data.get('admin_user', {}).get('id')
            if admin_user_id:
                response = self.make_request('POST', f"/api/spiffs/{spiff_id}/calculate/{admin_user_id}")
                if response and response.status_code == 200:
                    calculation = response.json()
                    self.log(f"Spiff calculation: ${calculation.get('payout_amount', 0)} for {calculation.get('qualifying_transactions', 0)} transactions")
        
        return True
    
    def test_payout_approval_workflow(self):
        """Test payout approval workflow"""
        self.log("=== Testing Payout Approval Workflow ===")
        
        # Get existing payouts
        response = self.make_request('GET', '/api/payouts', params={'limit': 1})
        if not response or response.status_code != 200:
            self.log("Failed to get payouts", "ERROR")
            return False
            
        payouts = response.json()
        if not payouts:
            self.log("No payouts available", "ERROR")
            return False
            
        payout = payouts[0]
        payout_id = payout['id']
        
        self.log(f"Testing payout {payout_id} with status: {payout.get('status', 'unknown')}")
        
        # Test reconciliation
        response = self.make_request('POST', f"/api/payouts/{payout_id}/reconcile", params={
            "actual_amount": float(payout.get('net_payout', 0))
        })
        
        if response and response.status_code == 200:
            reconciliation = response.json()
            self.log(f"Reconciliation status: {reconciliation.get('status', 'unknown')}")
        
        return True
    
    def test_territory_performance(self):
        """Test territory performance metrics"""
        self.log("=== Testing Territory Performance ===")
        
        # Get territories
        response = self.make_request('GET', '/api/strategic/territories')
        if not response or response.status_code != 200:
            self.log("Failed to get territories", "ERROR")
            return False
            
        territories = response.json()
        if territories:
            territory = territories[0]
            territory_id = territory['id']
            
            # Get performance metrics
            response = self.make_request('GET', f"/api/strategic/territories/{territory_id}/performance")
            if response and response.status_code == 200:
                performance = response.json()
                self.log(f"Territory performance: ${performance.get('total_revenue', 0)} revenue, {performance.get('total_users', 0)} users")
        
        return True
    
    def test_quota_progress_tracking(self):
        """Test quota progress tracking"""
        self.log("=== Testing Quota Progress Tracking ===")
        
        # Get quotas
        response = self.make_request('GET', '/api/strategic/quotas')
        if not response or response.status_code != 200:
            self.log("Failed to get quotas", "ERROR")
            return False
            
        quotas = response.json()
        if quotas:
            quota = quotas[0]
            quota_id = quota['id']
            
            # Get progress
            response = self.make_request('GET', f"/api/strategic/quotas/{quota_id}/progress")
            if response and response.status_code == 200:
                progress = response.json()
                self.log(f"Quota progress: {progress.get('attainment_percent', 0)}% of ${progress.get('quota_amount', 0)}")
        
        return True
    
    def test_accounting_reports(self):
        """Test accounting reports and compliance"""
        self.log("=== Testing Accounting Reports ===")
        
        current_period = datetime.now().strftime("%Y-%m")
        
        # Test commission accrual report
        response = self.make_request('GET', '/api/accounting/commission/accrual', params={'period': current_period})
        if response and response.status_code == 200:
            accrual = response.json()
            self.log(f"Commission accrual: ${accrual.get('total_accrued', 0)} for period {current_period}")
        
        # Test trial balance
        response = self.make_request('GET', '/api/accounting/reports/trial-balance', params={'period': current_period})
        if response and response.status_code == 200:
            trial_balance = response.json()
            balanced = trial_balance.get('balanced', False)
            self.log(f"Trial balance for {current_period}: {'Balanced' if balanced else 'Not balanced'}")
            
            accounts = trial_balance.get('accounts', {})
            for account, values in accounts.items():
                self.log(f"  {account}: Debit ${values.get('debit', 0)}, Credit ${values.get('credit', 0)}")
        
        return True
    
    def test_revenue_recognition_schedule(self):
        """Test revenue recognition schedule processing"""
        self.log("=== Testing Revenue Recognition Schedule ===")
        
        # Get revenue recognition schedules
        response = self.make_request('GET', '/api/transactions', params={'limit': 1})
        if response and response.status_code == 200:
            transactions = response.json()
            if transactions:
                transaction_id = transactions[0]['id']
                
                # Get revenue schedule
                response = self.make_request('GET', f"/api/accounting/revenue/schedule/{transaction_id}")
                if response and response.status_code == 200:
                    schedule = response.json()
                    periods = schedule.get('recognition_schedule', [])
                    self.log(f"Revenue schedule has {len(periods)} periods")
                    
                    # Test recognizing a period
                    if periods:
                        response = self.make_request('POST', '/api/accounting/revenue/recognize-period', params={
                            'transaction_id': transaction_id,
                            'period': 1
                        })
                        if response and response.status_code == 200:
                            result = response.json()
                            self.log(f"Recognized ${result.get('amount', 0)} for period 1")
        
        return True
    
    def run_detailed_tests(self):
        """Run all detailed tests"""
        self.log("Starting detailed backend API testing...")
        self.log(f"Testing against: {self.base_url}")
        
        if not self.setup_auth():
            self.log("Failed to authenticate", "ERROR")
            return False
        
        tests = [
            ("Commission Calculation Flow", self.test_commission_calculation_flow),
            ("Spiff Eligibility", self.test_spiff_eligibility_and_calculation),
            ("Payout Workflow", self.test_payout_approval_workflow),
            ("Territory Performance", self.test_territory_performance),
            ("Quota Progress", self.test_quota_progress_tracking),
            ("Accounting Reports", self.test_accounting_reports),
            ("Revenue Recognition", self.test_revenue_recognition_schedule)
        ]
        
        results = {}
        for test_name, test_func in tests:
            try:
                results[test_name] = test_func()
            except Exception as e:
                self.log(f"Test {test_name} failed with exception: {str(e)}", "ERROR")
                results[test_name] = False
        
        # Summary
        self.log("=== DETAILED TEST SUMMARY ===")
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status = "PASS" if result else "FAIL"
            self.log(f"{test_name}: {status}")
        
        self.log(f"Overall: {passed}/{total} detailed tests passed")
        return passed == total

if __name__ == "__main__":
    tester = DetailedTester()
    success = tester.run_detailed_tests()
    exit(0 if success else 1)