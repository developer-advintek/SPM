#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for SPM/PPM Platform
Tests all Phase 2-5 backend APIs with real-world data
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

class SPMTester:
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
                response = self.session.post(url, headers=headers, json=data)
            elif method == 'PUT':
                response = self.session.put(url, headers=headers, json=data)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            self.log(f"{method} {endpoint} -> {response.status_code}")
            
            if response.status_code >= 400:
                self.log(f"Error response: {response.text}", "ERROR")
                
            return response
            
        except Exception as e:
            self.log(f"Request failed: {str(e)}", "ERROR")
            return None
    
    def setup_test_data(self):
        """Create test users and products"""
        self.log("Setting up test data...")
        
        # Create admin user
        admin_data = {
            "email": "admin@spmplatform.com",
            "full_name": "System Administrator",
            "role": "admin",
            "password": "SecureAdmin123!"
        }
        
        response = self.make_request('POST', '/api/auth/register', admin_data)
        if response and response.status_code == 200:
            result = response.json()
            self.auth_token = result.get('access_token')
            self.test_data['admin_user'] = result.get('user')
            self.log("Admin user created successfully")
        else:
            # Try to login if user exists
            login_data = {"email": admin_data["email"], "password": admin_data["password"]}
            response = self.make_request('POST', '/api/auth/login', login_data)
            if response and response.status_code == 200:
                result = response.json()
                self.auth_token = result.get('access_token')
                self.test_data['admin_user'] = result.get('user')
                self.log("Admin user logged in successfully")
        
        # Create sales rep user
        rep_data = {
            "email": "sarah.johnson@spmplatform.com",
            "full_name": "Sarah Johnson",
            "role": "rep",
            "territory_id": "territory-west",
            "password": "SalesRep123!"
        }
        
        response = self.make_request('POST', '/api/auth/register', rep_data)
        if response and response.status_code == 200:
            self.test_data['sales_rep'] = response.json().get('user')
            self.log("Sales rep user created successfully")
        
        # Create test products
        products = [
            {
                "sku": "CLOUD-PRO-001",
                "name": "Cloud Professional License",
                "category": "Software",
                "commission_rate_code": "STANDARD",
                "gross_margin_percent": 75.50,
                "base_commission_rate": 8.25
            },
            {
                "sku": "ENTERPRISE-002",
                "name": "Enterprise Security Suite",
                "category": "Security",
                "commission_rate_code": "PREMIUM",
                "gross_margin_percent": 82.30,
                "base_commission_rate": 12.50
            }
        ]
        
        self.test_data['products'] = []
        for product in products:
            response = self.make_request('POST', '/api/products', product)
            if response and response.status_code == 200:
                self.test_data['products'].append(response.json())
                self.log(f"Product {product['sku']} created successfully")
    
    def test_transaction_apis(self):
        """Test Transaction Processing APIs"""
        self.log("=== Testing Transaction Processing APIs ===")
        
        if not self.test_data.get('products') or not self.test_data.get('sales_rep'):
            self.log("Missing test data for transaction tests", "ERROR")
            return False
            
        # Test 1: Create transaction
        transaction_data = {
            "transaction_date": datetime.now(timezone.utc).isoformat(),
            "product_id": self.test_data['products'][0]['id'],
            "sku": self.test_data['products'][0]['sku'],
            "quantity": 5,
            "unit_price": 2500.00,
            "sales_rep_id": self.test_data['sales_rep']['id'],
            "customer_id": "customer-acme-corp",
            "customer_segment": "Enterprise",
            "sales_channel": "Direct",
            "territory_id": "territory-west"
        }
        
        response = self.make_request('POST', '/api/transactions', transaction_data)
        if not response or response.status_code != 200:
            self.log("Failed to create transaction", "ERROR")
            return False
            
        transaction = response.json()
        self.test_data['transaction'] = transaction
        self.log(f"Transaction created: {transaction['id']}")
        
        # Test 2: List transactions
        response = self.make_request('GET', '/api/transactions')
        if not response or response.status_code != 200:
            self.log("Failed to list transactions", "ERROR")
            return False
            
        transactions = response.json()
        self.log(f"Retrieved {len(transactions)} transactions")
        
        # Test 3: Get specific transaction
        response = self.make_request('GET', f"/api/transactions/{transaction['id']}")
        if not response or response.status_code != 200:
            self.log("Failed to get transaction by ID", "ERROR")
            return False
            
        # Test 4: Apply credit split
        credit_split_data = {
            "transaction_id": transaction['id'],
            "assignments": [
                {
                    "user_id": self.test_data['sales_rep']['id'],
                    "credit_percent": 70,
                    "role": "Primary Sales Rep"
                },
                {
                    "user_id": self.test_data['admin_user']['id'],
                    "credit_percent": 30,
                    "role": "Sales Manager"
                }
            ],
            "assignment_reason": "Manager assisted with enterprise deal closure"
        }
        
        response = self.make_request('POST', f"/api/transactions/{transaction['id']}/credit-split", credit_split_data)
        if not response or response.status_code != 200:
            self.log("Failed to apply credit split", "ERROR")
            return False
            
        self.log("Credit split applied successfully")
        
        # Test 5: Get commission calculations
        response = self.make_request('GET', f"/api/transactions/{transaction['id']}/commissions")
        if not response or response.status_code != 200:
            self.log("Failed to get commission calculations", "ERROR")
            return False
            
        commissions = response.json()
        self.log(f"Retrieved {len(commissions)} commission calculations")
        
        return True
    
    def test_spiff_apis(self):
        """Test Spiff Center APIs"""
        self.log("=== Testing Spiff Center APIs ===")
        
        # Test 1: Create spiff
        spiff_data = {
            "name": "Q4 Cloud Sales Accelerator",
            "description": "Bonus incentive for cloud product sales in Q4",
            "start_date": datetime.now(timezone.utc).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=90)).isoformat(),
            "target_products": ["CLOUD-PRO-001"],
            "target_segments": ["Enterprise", "Mid-Market"],
            "incentive_amount": 500.00,
            "incentive_type": "fixed",
            "eligibility_criteria": {
                "min_deal_size": 10000,
                "territory": ["territory-west", "territory-east"]
            }
        }
        
        response = self.make_request('POST', '/api/spiffs', spiff_data)
        if not response or response.status_code != 200:
            self.log("Failed to create spiff", "ERROR")
            return False
            
        spiff = response.json()
        self.test_data['spiff'] = spiff
        self.log(f"Spiff created: {spiff['id']}")
        
        # Test 2: List all spiffs
        response = self.make_request('GET', '/api/spiffs')
        if not response or response.status_code != 200:
            self.log("Failed to list spiffs", "ERROR")
            return False
            
        spiffs = response.json()
        self.log(f"Retrieved {len(spiffs)} spiffs")
        
        # Test 3: Get active spiffs
        response = self.make_request('GET', '/api/spiffs/active')
        if not response or response.status_code != 200:
            self.log("Failed to get active spiffs", "ERROR")
            return False
            
        active_spiffs = response.json()
        self.log(f"Retrieved {len(active_spiffs)} active spiffs")
        
        # Test 4: Activate spiff
        response = self.make_request('PUT', f"/api/spiffs/{spiff['id']}/activate")
        if not response or response.status_code != 200:
            self.log("Failed to activate spiff", "ERROR")
            return False
            
        self.log("Spiff activated successfully")
        
        # Test 5: Calculate spiff payout
        if self.test_data.get('sales_rep'):
            response = self.make_request('POST', f"/api/spiffs/{spiff['id']}/calculate/{self.test_data['sales_rep']['id']}")
            if response and response.status_code == 200:
                payout_calc = response.json()
                self.log(f"Spiff payout calculated: ${payout_calc.get('payout_amount', 0)}")
        
        return True
    
    def test_payout_apis(self):
        """Test Payout Management APIs"""
        self.log("=== Testing Payout Management APIs ===")
        
        if not self.test_data.get('sales_rep'):
            self.log("Missing sales rep for payout tests", "ERROR")
            return False
            
        # Test 1: Calculate payout
        payout_data = {
            "payout_period_start": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat(),
            "payout_period_end": datetime.now(timezone.utc).isoformat(),
            "user_id": self.test_data['sales_rep']['id'],
            "currency": "USD"
        }
        
        response = self.make_request('POST', '/api/payouts/calculate', payout_data)
        if not response or response.status_code != 200:
            self.log("Failed to calculate payout", "ERROR")
            return False
            
        payout = response.json()
        self.test_data['payout'] = payout
        self.log(f"Payout calculated: ${payout.get('net_payout', 0)} {payout.get('currency', 'USD')}")
        
        # Test 2: List payouts
        response = self.make_request('GET', '/api/payouts')
        if not response or response.status_code != 200:
            self.log("Failed to list payouts", "ERROR")
            return False
            
        payouts = response.json()
        self.log(f"Retrieved {len(payouts)} payouts")
        
        # Test 3: Get specific payout
        response = self.make_request('GET', f"/api/payouts/{payout['id']}")
        if not response or response.status_code != 200:
            self.log("Failed to get payout by ID", "ERROR")
            return False
            
        # Test 4: Submit for approval
        response = self.make_request('POST', f"/api/payouts/{payout['id']}/submit-approval")
        if response and response.status_code == 200:
            self.log("Payout submitted for approval")
        
        # Test 5: Approve payout
        response = self.make_request('POST', f"/api/payouts/{payout['id']}/approve", {
            "approver_id": self.test_data['admin_user']['id'],
            "comments": "Approved after review"
        })
        if response and response.status_code == 200:
            self.log("Payout approved")
        
        # Test 6: Process payout
        response = self.make_request('POST', f"/api/payouts/{payout['id']}/process")
        if response and response.status_code == 200:
            self.log("Payout processed successfully")
        
        # Test 7: Export payout CSV
        response = self.make_request('GET', f"/api/payouts/{payout['id']}/export")
        if response and response.status_code == 200:
            self.log("Payout CSV exported successfully")
        
        return True
    
    def test_strategic_apis(self):
        """Test Strategic Planning APIs"""
        self.log("=== Testing Strategic Planning APIs ===")
        
        # Test 1: Create territory
        territory_data = {
            "name": "Western Region",
            "description": "California, Nevada, Arizona territories",
            "geography": ["California", "Nevada", "Arizona"],
            "account_potential": 2500000.00,
            "assigned_rep_id": self.test_data.get('sales_rep', {}).get('id')
        }
        
        response = self.make_request('POST', '/api/strategic/territories', territory_data)
        if not response or response.status_code != 200:
            self.log("Failed to create territory", "ERROR")
            return False
            
        territory = response.json()
        self.test_data['territory'] = territory
        self.log(f"Territory created: {territory['name']}")
        
        # Test 2: List territories
        response = self.make_request('GET', '/api/strategic/territories')
        if not response or response.status_code != 200:
            self.log("Failed to list territories", "ERROR")
            return False
            
        territories = response.json()
        self.log(f"Retrieved {len(territories)} territories")
        
        # Test 3: Create quota
        quota_data = {
            "user_id": self.test_data.get('sales_rep', {}).get('id', 'test-user'),
            "period_start": datetime.now(timezone.utc).isoformat(),
            "period_end": (datetime.now(timezone.utc) + timedelta(days=90)).isoformat(),
            "quota_amount": 500000.00,
            "quota_type": "revenue",
            "assignment_method": "top_down"
        }
        
        response = self.make_request('POST', '/api/strategic/quotas', quota_data)
        if not response or response.status_code != 200:
            self.log("Failed to create quota", "ERROR")
            return False
            
        quota = response.json()
        self.test_data['quota'] = quota
        self.log(f"Quota created: ${quota.get('quota_amount', 0)}")
        
        # Test 4: List quotas
        response = self.make_request('GET', '/api/strategic/quotas')
        if not response or response.status_code != 200:
            self.log("Failed to list quotas", "ERROR")
            return False
            
        quotas = response.json()
        self.log(f"Retrieved {len(quotas)} quotas")
        
        # Test 5: Activate quota
        response = self.make_request('PUT', f"/api/strategic/quotas/{quota['id']}/activate")
        if not response or response.status_code != 200:
            self.log("Failed to activate quota", "ERROR")
            return False
            
        self.log("Quota activated successfully")
        
        # Test 6: Create forecast
        forecast_data = {
            "scenario_name": "Q4 2024 Conservative Forecast",
            "period_start": datetime.now(timezone.utc).isoformat(),
            "period_end": (datetime.now(timezone.utc) + timedelta(days=90)).isoformat(),
            "assumptions": {
                "growth_rate": 0.15,
                "market_conditions": "stable",
                "new_product_impact": 0.05
            }
        }
        
        response = self.make_request('POST', '/api/strategic/forecasts', forecast_data)
        if not response or response.status_code != 200:
            self.log("Failed to create forecast", "ERROR")
            return False
            
        forecast = response.json()
        self.test_data['forecast'] = forecast
        self.log(f"Forecast created: {forecast['scenario_name']}")
        
        # Test 7: List forecasts
        response = self.make_request('GET', '/api/strategic/forecasts')
        if not response or response.status_code != 200:
            self.log("Failed to list forecasts", "ERROR")
            return False
            
        forecasts = response.json()
        self.log(f"Retrieved {len(forecasts)} forecasts")
        
        # Test 8: Create NFM
        nfm_data = {
            "metric_name": "Customer Satisfaction Score",
            "metric_type": "percentage",
            "target_value": 95.0,
            "user_id": self.test_data.get('sales_rep', {}).get('id', 'test-user'),
            "measurement_period": "Q4-2024",
            "link_to_commission": True,
            "multiplier_effect": 1.1,
            "threshold_requirement": 90.0
        }
        
        response = self.make_request('POST', '/api/strategic/nfm', nfm_data)
        if not response or response.status_code != 200:
            self.log("Failed to create NFM", "ERROR")
            return False
            
        nfm = response.json()
        self.test_data['nfm'] = nfm
        self.log(f"NFM created: {nfm['metric_name']}")
        
        # Test 9: List NFMs
        response = self.make_request('GET', '/api/strategic/nfm')
        if not response or response.status_code != 200:
            self.log("Failed to list NFMs", "ERROR")
            return False
            
        nfms = response.json()
        self.log(f"Retrieved {len(nfms)} NFMs")
        
        return True
    
    def test_accounting_apis(self):
        """Test Accounting Ledger APIs"""
        self.log("=== Testing Accounting Ledger APIs ===")
        
        transaction_id = self.test_data.get('transaction', {}).get('id', 'test-transaction')
        
        # Test 1: Create ledger entry
        response = self.make_request('POST', '/api/accounting/ledger/entry', {
            "transaction_id": transaction_id,
            "account_type": "commission_expense",
            "debit": 1250.00,
            "credit": 0,
            "description": "Commission expense for enterprise deal"
        })
        
        if not response or response.status_code != 200:
            self.log("Failed to create ledger entry", "ERROR")
            return False
            
        ledger_entry = response.json()
        self.log(f"Ledger entry created: {ledger_entry['id']}")
        
        # Test 2: Get ledger entries
        response = self.make_request('GET', '/api/accounting/ledger/entries', params={
            "account_type": "commission_expense",
            "limit": 50
        })
        
        if not response or response.status_code != 200:
            self.log("Failed to get ledger entries", "ERROR")
            return False
            
        entries = response.json()
        self.log(f"Retrieved {len(entries)} ledger entries")
        
        # Test 3: Get account balance
        response = self.make_request('GET', '/api/accounting/ledger/balance', params={
            "account_type": "commission_expense"
        })
        
        if not response or response.status_code != 200:
            self.log("Failed to get account balance", "ERROR")
            return False
            
        balance = response.json()
        self.log(f"Account balance: ${balance.get('balance', 0)}")
        
        # Test 4: Create revenue recognition schedule
        response = self.make_request('POST', '/api/accounting/revenue/recognize', {
            "transaction_id": transaction_id
        })
        
        if not response or response.status_code != 200:
            self.log("Failed to create revenue recognition", "ERROR")
            return False
            
        revenue_rec = response.json()
        self.log(f"Revenue recognition created: {revenue_rec['id']}")
        
        # Test 5: Get revenue schedule
        response = self.make_request('GET', f"/api/accounting/revenue/schedule/{transaction_id}")
        
        if not response or response.status_code != 200:
            self.log("Failed to get revenue schedule", "ERROR")
            return False
            
        schedule = response.json()
        self.log(f"Revenue schedule retrieved with {len(schedule.get('recognition_schedule', []))} periods")
        
        return True
    
    def run_all_tests(self):
        """Run all API tests"""
        self.log("Starting comprehensive SPM/PPM backend API testing...")
        self.log(f"Testing against: {self.base_url}")
        
        # Setup
        self.setup_test_data()
        
        if not self.auth_token:
            self.log("Failed to authenticate - cannot continue tests", "ERROR")
            return False
        
        # Run all test suites
        results = {
            "transactions": self.test_transaction_apis(),
            "spiffs": self.test_spiff_apis(),
            "payouts": self.test_payout_apis(),
            "strategic": self.test_strategic_apis(),
            "accounting": self.test_accounting_apis()
        }
        
        # Summary
        self.log("=== TEST SUMMARY ===")
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for module, result in results.items():
            status = "PASS" if result else "FAIL"
            self.log(f"{module.upper()}: {status}")
        
        self.log(f"Overall: {passed}/{total} test suites passed")
        
        return passed == total

if __name__ == "__main__":
    tester = SPMTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)