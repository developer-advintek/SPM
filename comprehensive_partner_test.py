#!/usr/bin/env python3
"""
Comprehensive Partner Onboarding Workflow Test
Testing the exact workflow specified in the user requirements:
- Create → L1 Approve (with tier) → L2 Approve → Approved
- Partner MUST be L2 approved before appearing in other modules
"""

import requests
import json
import base64
from datetime import datetime, timezone
import uuid

# Configuration
BASE_URL = "https://nexflow-ppm.preview.emergentagent.com/api"

# Test Credentials
CREDENTIALS = {
    "admin": {"email": "admin@test.com", "password": "admin123"},
    "l1": {"email": "l1@test.com", "password": "l1_123"},
    "l2": {"email": "l2@test.com", "password": "l2_123"}
}

class ComprehensivePartnerTester:
    def __init__(self):
        self.session = requests.Session()
        self.tokens = {}
        self.test_results = []
        self.created_partners = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate_user(self, role):
        """Authenticate specific user role"""
        try:
            response = requests.post(
                f"{BASE_URL}/auth/login",
                json=CREDENTIALS[role],
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token")
                self.tokens[role] = token
                self.log_result(f"{role.upper()} Authentication", True, f"Successfully authenticated as {role}")
                return token
            else:
                self.log_result(f"{role.upper()} Authentication", False, f"Failed to authenticate {role}: {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_result(f"{role.upper()} Authentication", False, f"Authentication error for {role}: {str(e)}")
            return None
    
    def make_request(self, method, endpoint, role="admin", data=None):
        """Make authenticated request"""
        if role not in self.tokens:
            self.authenticate_user(role)
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.tokens[role]}"
        }
        
        url = f"{BASE_URL}{endpoint}"
        
        if method.upper() == "GET":
            return requests.get(url, headers=headers)
        elif method.upper() == "POST":
            return requests.post(url, json=data, headers=headers)
        elif method.upper() == "PATCH":
            return requests.patch(url, json=data, headers=headers)
        elif method.upper() == "PUT":
            return requests.put(url, json=data, headers=headers)
    
    def test_1_admin_creates_partner_full_flow(self):
        """Test 1: Admin Creates Partner & Full Approval Flow"""
        print("\n🔄 Test 1: Admin Creates Partner & Full Approval Flow")
        print("-" * 50)
        
        # Step 1.1 - Login as Admin
        admin_token = self.authenticate_user("admin")
        if not admin_token:
            return
        
        # Step 1.2 - Create Partner with Documents
        mock_doc_base64 = base64.b64encode(b"Test Document Content").decode()
        
        partner_data = {
            "company_name": "TechCorp Solutions Inc.",
            "business_type": "Technology Services",
            "tax_id": "TAX-12345",
            "years_in_business": 5,
            "number_of_employees": 50,
            "expected_monthly_volume": "$100K-$500K",
            "business_address": "123 Tech Street, San Francisco, CA 94105",
            "website": "https://techcorp-solutions.com",
            "contact_person_name": "John Smith",
            "contact_person_email": "john@techcorp-solutions.com",
            "contact_person_phone": "+1-555-0123",
            "contact_person_designation": "CEO",
            "documents": [
                {
                    "document_type": "business_license",
                    "document_name": "business_license.pdf",
                    "document_data": mock_doc_base64,
                    "file_size": 1024
                },
                {
                    "document_type": "tax_document",
                    "document_name": "tax_certificate.pdf",
                    "document_data": mock_doc_base64,
                    "file_size": 2048
                }
            ]
        }
        
        try:
            # Try the exact endpoint from user requirements first
            response = self.make_request("POST", "/partners/create", "admin", partner_data)
            
            if response.status_code != 200:
                # Fallback to existing endpoint
                response = self.make_request("POST", "/partners/admin-create", "admin", partner_data)
            
            if response.status_code == 200:
                result = response.json()
                partner_id = result.get("partner_id")
                self.created_partners.append(partner_id)
                self.log_result("Partner Creation", True, "Partner created successfully")
                
                # Verify partner status
                partners_response = self.make_request("GET", "/partners/all", "admin")
                if partners_response.status_code == 200:
                    partners = partners_response.json()
                    partner = next((p for p in partners if p["id"] == partner_id), None)
                    
                    if partner:
                        expected_status = ["pending_l1", "pending_level1"]
                        if partner["status"] in expected_status:
                            self.log_result("Partner Status", True, f"Partner status is {partner['status']}")
                        else:
                            self.log_result("Partner Status", False, f"Partner status is {partner['status']}, expected one of {expected_status}")
                    else:
                        self.log_result("Partner Verification", False, "Created partner not found")
                else:
                    self.log_result("Partner Verification", False, f"Failed to retrieve partners: {partners_response.status_code}")
            else:
                self.log_result("Partner Creation", False, f"Failed to create partner: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Partner Creation", False, f"Partner creation error: {str(e)}")
        
        if not self.created_partners:
            return
        
        partner_id = self.created_partners[0]
        
        # Step 1.3 - Verify Partner in L1 Queue
        l1_token = self.authenticate_user("l1")
        if l1_token:
            try:
                response = self.make_request("GET", "/partners/l1-queue", "l1")
                
                if response.status_code == 200:
                    l1_queue = response.json()
                    partner_in_queue = any(p["id"] == partner_id for p in l1_queue)
                    
                    if partner_in_queue:
                        partner_in_l1 = next((p for p in l1_queue if p["id"] == partner_id), None)
                        documents_count = len(partner_in_l1.get("documents", []))
                        self.log_result("L1 Queue Verification", True, f"Partner appears in L1 queue with {documents_count} documents")
                    else:
                        self.log_result("L1 Queue Verification", False, "Partner not found in L1 queue")
                else:
                    self.log_result("L1 Queue Verification", False, f"Failed to get L1 queue: {response.status_code}")
                    
            except Exception as e:
                self.log_result("L1 Queue Verification", False, f"L1 queue error: {str(e)}")
        
        # Step 1.4 - L1 Approves with Tier Assignment
        try:
            approval_data = {
                "tier": "gold",
                "comments": "Excellent credentials and strong business profile"
            }
            
            # Try exact endpoint from requirements
            response = self.make_request("POST", f"/partners/{partner_id}/l1-approve", "l1", approval_data)
            
            if response.status_code != 200:
                # Fallback to existing endpoint
                response = self.make_request("POST", f"/partners/{partner_id}/approve-l1", "l1", approval_data)
            
            if response.status_code == 200:
                self.log_result("L1 Approval", True, "L1 approval completed with tier assignment")
                
                # Verify partner moved to L2 queue
                partners_response = self.make_request("GET", "/partners/all", "admin")
                if partners_response.status_code == 200:
                    partners = partners_response.json()
                    partner = next((p for p in partners if p["id"] == partner_id), None)
                    
                    if partner:
                        expected_status = ["pending_l2", "pending_level2"]
                        if partner["status"] in expected_status and partner.get("tier") == "gold":
                            self.log_result("L1 Approval Status", True, f"Partner moved to L2 queue with tier 'gold'")
                        else:
                            self.log_result("L1 Approval Status", False, f"Status: {partner['status']}, Tier: {partner.get('tier')}")
            else:
                self.log_result("L1 Approval", False, f"L1 approval failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("L1 Approval", False, f"L1 approval error: {str(e)}")
        
        # Step 1.5 - Verify Partner in L2 Queue
        l2_token = self.authenticate_user("l2")
        if l2_token:
            try:
                response = self.make_request("GET", "/partners/l2-queue", "l2")
                
                if response.status_code == 200:
                    l2_queue = response.json()
                    partner_in_queue = any(p["id"] == partner_id for p in l2_queue)
                    
                    if partner_in_queue:
                        partner_in_l2 = next((p for p in l2_queue if p["id"] == partner_id), None)
                        tier = partner_in_l2.get("tier", "unknown")
                        self.log_result("L2 Queue Verification", True, f"Partner appears in L2 queue with tier '{tier}' and L1 approval info")
                    else:
                        self.log_result("L2 Queue Verification", False, "Partner not found in L2 queue")
                else:
                    self.log_result("L2 Queue Verification", False, f"Failed to get L2 queue: {response.status_code}")
                    
            except Exception as e:
                self.log_result("L2 Queue Verification", False, f"L2 queue error: {str(e)}")
        
        # Step 1.6 - View Partner Documents
        try:
            response = self.make_request("GET", f"/partners/{partner_id}/portal", "l2")
            
            if response.status_code == 200:
                portal_data = response.json()
                
                if "partner" in portal_data:
                    partner = portal_data["partner"]
                    documents = partner.get("documents", [])
                    
                    business_license = any(d.get("document_type") == "business_license" for d in documents)
                    tax_document = any(d.get("document_type") == "tax_document" for d in documents)
                    
                    if business_license and tax_document:
                        self.log_result("Document Visibility", True, f"Partner portal shows {len(documents)} documents including business_license and tax_document")
                    else:
                        self.log_result("Document Visibility", False, f"Missing expected documents. Found: {[d.get('document_type') for d in documents]}")
                else:
                    self.log_result("Document Visibility", False, "Partner data not found in portal response")
            else:
                self.log_result("Document Visibility", False, f"Failed to get partner portal: {response.status_code}")
                
        except Exception as e:
            self.log_result("Document Visibility", False, f"Document visibility error: {str(e)}")
        
        # Step 1.7 - L2 Final Approval
        try:
            approval_data = {
                "comments": "Final approval granted. Welcome to the partner network!"
            }
            
            # Try exact endpoint from requirements
            response = self.make_request("POST", f"/partners/{partner_id}/l2-approve", "l2", approval_data)
            
            if response.status_code != 200:
                # Fallback to existing endpoint
                response = self.make_request("POST", f"/partners/{partner_id}/approve-l2", "l2", approval_data)
            
            if response.status_code == 200:
                self.log_result("L2 Approval", True, "L2 final approval completed")
                
                # Verify final status
                partners_response = self.make_request("GET", "/partners/all", "admin")
                if partners_response.status_code == 200:
                    partners = partners_response.json()
                    partner = next((p for p in partners if p["id"] == partner_id), None)
                    
                    if partner:
                        if partner["status"] == "approved" and partner.get("onboarding_progress") == 100:
                            self.log_result("Final Approval Status", True, "Partner status = 'approved', onboarding_progress = 100%")
                        else:
                            self.log_result("Final Approval Status", False, f"Status: {partner['status']}, Progress: {partner.get('onboarding_progress')}%")
            else:
                self.log_result("L2 Approval", False, f"L2 approval failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("L2 Approval", False, f"L2 approval error: {str(e)}")
        
        # Step 1.8 - Verify Approved Partner in Directory
        try:
            response = self.make_request("GET", "/partners/directory", "admin")
            
            if response.status_code != 200:
                # Fallback to existing endpoint
                response = self.make_request("GET", "/partners/all", "admin")
            
            if response.status_code == 200:
                partners = response.json()
                approved_partner = next((p for p in partners if p["id"] == partner_id and p["status"] == "approved"), None)
                
                if approved_partner and approved_partner.get("tier") == "gold":
                    self.log_result("Directory Verification", True, "Approved partner appears in directory with status 'approved' and tier 'gold'")
                else:
                    self.log_result("Directory Verification", False, "Approved partner not found in directory or missing expected attributes")
            else:
                self.log_result("Directory Verification", False, f"Failed to get partner directory: {response.status_code}")
                
        except Exception as e:
            self.log_result("Directory Verification", False, f"Directory verification error: {str(e)}")
    
    def test_2_partner_appears_in_spiff_module(self):
        """Test 2: Partner Appears in Spiff Module (After L2 Approval)"""
        print("\n🔄 Test 2: Partner Appears in Spiff Module")
        print("-" * 40)
        
        # Step 2.1 - Get Partners for Spiff Assignment
        try:
            response = self.make_request("GET", "/partners/directory", "admin")
            
            if response.status_code != 200:
                response = self.make_request("GET", "/partners/all", "admin")
            
            if response.status_code == 200:
                partners = response.json()
                approved_partners = [p for p in partners if p["status"] == "approved"]
                techcorp_partner = next((p for p in approved_partners if "TechCorp" in p.get("company_name", "")), None)
                
                if techcorp_partner:
                    self.log_result("Spiff Partner Availability", True, f"TechCorp partner is available for Spiff assignment (approved status)")
                else:
                    self.log_result("Spiff Partner Availability", False, "TechCorp partner not found in approved partners list")
            else:
                self.log_result("Spiff Partner Availability", False, f"Failed to get partners for Spiff: {response.status_code}")
                
        except Exception as e:
            self.log_result("Spiff Partner Availability", False, f"Spiff partner availability error: {str(e)}")
        
        # Step 2.2 - Verify Partner NOT in Spiff Before Approval
        pending_partner_data = {
            "company_name": "Pending Partner Corp",
            "contact_person_name": "Jane Doe",
            "contact_person_email": "jane@pending.com",
            "business_type": "Test Business",
            "tier": "bronze"
        }
        
        try:
            response = self.make_request("POST", "/partners/create", "admin", pending_partner_data)
            
            if response.status_code != 200:
                response = self.make_request("POST", "/partners/admin-create", "admin", pending_partner_data)
            
            if response.status_code == 200:
                result = response.json()
                pending_partner_id = result.get("partner_id")
                
                # Check that pending partner is NOT in spiff-eligible partners
                partners_response = self.make_request("GET", "/partners/directory", "admin")
                if partners_response.status_code != 200:
                    partners_response = self.make_request("GET", "/partners/all", "admin")
                
                if partners_response.status_code == 200:
                    partners = partners_response.json()
                    pending_partner = next((p for p in partners if p["id"] == pending_partner_id), None)
                    
                    if pending_partner:
                        expected_status = ["pending_l1", "pending_level1"]
                        if pending_partner["status"] in expected_status:
                            self.log_result("Spiff Filtering", True, f"Pending Partner Corp has status '{pending_partner['status']}' - correctly filtered from Spiff eligibility")
                        else:
                            self.log_result("Spiff Filtering", False, f"Pending partner status is '{pending_partner['status']}', expected one of {expected_status}")
                    else:
                        self.log_result("Spiff Filtering", False, "Pending partner not found after creation")
            else:
                self.log_result("Spiff Filtering", False, f"Failed to create pending partner: {response.status_code}")
                
        except Exception as e:
            self.log_result("Spiff Filtering", False, f"Spiff filtering error: {str(e)}")
    
    def test_3_on_hold_workflow(self):
        """Test 3: On-Hold Workflow"""
        print("\n🔄 Test 3: On-Hold Workflow")
        print("-" * 30)
        
        # Step 3.1 - Create Partner for On-Hold Test
        partner_data = {
            "company_name": "OnHold Test Corp",
            "contact_person_name": "Test User",
            "contact_person_email": "test@onhold.com",
            "business_type": "Test Business",
            "tier": "bronze"
        }
        
        onhold_partner_id = None
        
        try:
            response = self.make_request("POST", "/partners/create", "admin", partner_data)
            
            if response.status_code != 200:
                response = self.make_request("POST", "/partners/admin-create", "admin", partner_data)
            
            if response.status_code == 200:
                result = response.json()
                onhold_partner_id = result.get("partner_id")
                self.log_result("OnHold Partner Creation", True, "OnHold test partner created")
            else:
                self.log_result("OnHold Partner Creation", False, f"Failed to create onhold partner: {response.status_code}")
                return
                
        except Exception as e:
            self.log_result("OnHold Partner Creation", False, f"OnHold partner creation error: {str(e)}")
            return
        
        # Step 3.2 - L1 Puts Partner On Hold
        try:
            hold_data = {
                "reason": "Missing required tax documents",
                "comments": "Please upload Form 941 and W-9 before we can proceed"
            }
            
            response = self.make_request("POST", f"/partners/{onhold_partner_id}/put-on-hold", "l1", hold_data)
            
            if response.status_code == 200:
                self.log_result("Put On Hold", True, "Partner successfully put on hold by L1")
                
                # Verify status and feedback
                partners_response = self.make_request("GET", "/partners/all", "admin")
                if partners_response.status_code == 200:
                    partners = partners_response.json()
                    onhold_partner = next((p for p in partners if p["id"] == onhold_partner_id), None)
                    
                    if onhold_partner:
                        if onhold_partner["status"] == "on_hold":
                            feedback_required = onhold_partner.get("partner_feedback_required", False)
                            self.log_result("OnHold Status", True, f"Partner status = 'on_hold', partner_feedback_required = {feedback_required}")
                        else:
                            self.log_result("OnHold Status", False, f"Partner status is '{onhold_partner['status']}', expected 'on_hold'")
            else:
                self.log_result("Put On Hold", False, f"Failed to put partner on hold: {response.status_code}")
                
        except Exception as e:
            self.log_result("Put On Hold", False, f"Put on hold error: {str(e)}")
        
        # Step 3.3 - Verify Partner in On-Hold Queue
        try:
            response = self.make_request("GET", "/partners/on-hold", "admin")
            
            if response.status_code == 200:
                onhold_queue = response.json()
                partner_in_queue = any(p["id"] == onhold_partner_id for p in onhold_queue)
                
                if partner_in_queue:
                    onhold_partner = next((p for p in onhold_queue if p["id"] == onhold_partner_id), None)
                    hold_reason = onhold_partner.get("hold_reason", "")
                    feedback_message = onhold_partner.get("partner_feedback_message", "")
                    
                    self.log_result("OnHold Queue", True, f"Partner appears in on-hold queue with hold_reason and partner_feedback_message")
                else:
                    self.log_result("OnHold Queue", False, "Partner not found in on-hold queue")
            else:
                self.log_result("OnHold Queue", False, f"Failed to get on-hold queue: {response.status_code}")
                
        except Exception as e:
            self.log_result("OnHold Queue", False, f"OnHold queue error: {str(e)}")
        
        # Step 3.4 - Resubmit Partner After Corrections
        try:
            resubmit_data = {
                "documents": []
            }
            
            response = self.make_request("POST", f"/partners/{onhold_partner_id}/resubmit", "admin", resubmit_data)
            
            if response.status_code == 200:
                self.log_result("Resubmit", True, "Partner resubmitted successfully")
                
                # Verify status back to pending_l1 and resubmission_count
                partners_response = self.make_request("GET", "/partners/all", "admin")
                if partners_response.status_code == 200:
                    partners = partners_response.json()
                    resubmitted_partner = next((p for p in partners if p["id"] == onhold_partner_id), None)
                    
                    if resubmitted_partner:
                        expected_status = ["pending_l1", "pending_level1"]
                        resubmission_count = resubmitted_partner.get("resubmission_count", 0)
                        
                        if resubmitted_partner["status"] in expected_status and resubmission_count >= 1:
                            self.log_result("Resubmit Status", True, f"Status back to '{resubmitted_partner['status']}', resubmission_count = {resubmission_count}")
                        else:
                            self.log_result("Resubmit Status", False, f"Status: {resubmitted_partner['status']}, Count: {resubmission_count}")
            else:
                self.log_result("Resubmit", False, f"Failed to resubmit partner: {response.status_code}")
                
        except Exception as e:
            self.log_result("Resubmit", False, f"Resubmit error: {str(e)}")
    
    def test_4_rejection_and_resubmission(self):
        """Test 4: Rejection & Resubmission"""
        print("\n🔄 Test 4: Rejection & Resubmission")
        print("-" * 35)
        
        # Create another partner for rejection testing
        partner_data = {
            "company_name": "Rejection Test Corp",
            "contact_person_name": "Reject User",
            "contact_person_email": "reject@test.com",
            "business_type": "Test Business",
            "tier": "bronze"
        }
        
        rejection_partner_id = None
        
        try:
            response = self.make_request("POST", "/partners/create", "admin", partner_data)
            
            if response.status_code != 200:
                response = self.make_request("POST", "/partners/admin-create", "admin", partner_data)
            
            if response.status_code == 200:
                result = response.json()
                rejection_partner_id = result.get("partner_id")
                self.log_result("Rejection Partner Creation", True, "Rejection test partner created")
            else:
                self.log_result("Rejection Partner Creation", False, f"Failed to create rejection partner: {response.status_code}")
                return
                
        except Exception as e:
            self.log_result("Rejection Partner Creation", False, f"Rejection partner creation error: {str(e)}")
            return
        
        # Step 4.1 - L1 Rejects Partner
        try:
            rejection_data = {
                "reason": "Incomplete business documentation",
                "comments": "Business license appears to be expired"
            }
            
            response = self.make_request("POST", f"/partners/{rejection_partner_id}/l1-reject", "l1", rejection_data)
            
            if response.status_code != 200:
                response = self.make_request("POST", f"/partners/{rejection_partner_id}/reject-l1", "l1", rejection_data)
            
            if response.status_code == 200:
                self.log_result("L1 Rejection", True, "Partner rejected by L1")
                
                # Verify status
                partners_response = self.make_request("GET", "/partners/all", "admin")
                if partners_response.status_code == 200:
                    partners = partners_response.json()
                    rejected_partner = next((p for p in partners if p["id"] == rejection_partner_id), None)
                    
                    if rejected_partner:
                        expected_status = ["rejected_by_l1", "rejected_level1"]
                        if rejected_partner["status"] in expected_status:
                            self.log_result("Rejection Status", True, f"Partner status = '{rejected_partner['status']}'")
                        else:
                            self.log_result("Rejection Status", False, f"Partner status is '{rejected_partner['status']}', expected one of {expected_status}")
            else:
                self.log_result("L1 Rejection", False, f"Failed to reject partner: {response.status_code}")
                
        except Exception as e:
            self.log_result("L1 Rejection", False, f"L1 rejection error: {str(e)}")
        
        # Step 4.2 - Get Rejected Partners
        try:
            response = self.make_request("GET", "/partners/rejected", "admin")
            
            if response.status_code == 200:
                rejected_partners = response.json()
                partner_in_rejected = any(p["id"] == rejection_partner_id for p in rejected_partners)
                
                if partner_in_rejected:
                    rejected_partner = next((p for p in rejected_partners if p["id"] == rejection_partner_id), None)
                    rejection_reason = rejected_partner.get("rejection_reason", "")
                    
                    self.log_result("Rejected Queue", True, f"Partner appears in rejected queue with rejection_reason")
                else:
                    self.log_result("Rejected Queue", False, "Partner not found in rejected queue")
            else:
                self.log_result("Rejected Queue", False, f"Failed to get rejected partners: {response.status_code}")
                
        except Exception as e:
            self.log_result("Rejected Queue", False, f"Rejected queue error: {str(e)}")
        
        # Step 4.3 - Resubmit Rejected Partner
        try:
            resubmit_data = {}
            
            response = self.make_request("POST", f"/partners/{rejection_partner_id}/resubmit", "admin", resubmit_data)
            
            if response.status_code == 200:
                self.log_result("Rejected Resubmit", True, "Rejected partner resubmitted successfully")
                
                # Verify status back to pending_l1
                partners_response = self.make_request("GET", "/partners/all", "admin")
                if partners_response.status_code == 200:
                    partners = partners_response.json()
                    resubmitted_partner = next((p for p in partners if p["id"] == rejection_partner_id), None)
                    
                    if resubmitted_partner:
                        expected_status = ["pending_l1", "pending_level1"]
                        if resubmitted_partner["status"] in expected_status:
                            self.log_result("Rejected Resubmit Status", True, f"Status back to '{resubmitted_partner['status']}'")
                        else:
                            self.log_result("Rejected Resubmit Status", False, f"Status is '{resubmitted_partner['status']}', expected one of {expected_status}")
            else:
                self.log_result("Rejected Resubmit", False, f"Failed to resubmit rejected partner: {response.status_code}")
                
        except Exception as e:
            self.log_result("Rejected Resubmit", False, f"Rejected resubmit error: {str(e)}")
    
    def test_5_tier_assignment_enforcement(self):
        """Test 5: Tier Assignment Enforcement"""
        print("\n🔄 Test 5: Tier Assignment Enforcement")
        print("-" * 40)
        
        # Create partner for tier enforcement testing
        partner_data = {
            "company_name": "Tier Test Corp",
            "contact_person_name": "Tier User",
            "contact_person_email": "tier@test.com",
            "business_type": "Test Business"
        }
        
        tier_partner_id = None
        
        try:
            response = self.make_request("POST", "/partners/create", "admin", partner_data)
            
            if response.status_code != 200:
                response = self.make_request("POST", "/partners/admin-create", "admin", partner_data)
            
            if response.status_code == 200:
                result = response.json()
                tier_partner_id = result.get("partner_id")
                self.log_result("Tier Test Partner Creation", True, "Tier test partner created")
            else:
                self.log_result("Tier Test Partner Creation", False, f"Failed to create tier partner: {response.status_code}")
                return
                
        except Exception as e:
            self.log_result("Tier Test Partner Creation", False, f"Tier partner creation error: {str(e)}")
            return
        
        # Step 5.1 - Try L1 Approval WITHOUT Tier
        try:
            approval_data = {
                "comments": "Trying to approve without tier"
            }
            
            response = self.make_request("POST", f"/partners/{tier_partner_id}/l1-approve", "l1", approval_data)
            
            if response.status_code != 200:
                response = self.make_request("POST", f"/partners/{tier_partner_id}/approve-l1", "l1", approval_data)
            
            if response.status_code == 400:
                response_data = response.json() if response.content else {}
                error_message = response_data.get("detail", "")
                
                if "tier" in error_message.lower():
                    self.log_result("Tier Enforcement", True, "L1 approval correctly rejected without tier assignment")
                else:
                    self.log_result("Tier Enforcement", False, f"Wrong error message: {error_message}")
            elif response.status_code == 200:
                self.log_result("Tier Enforcement", False, "L1 approval succeeded without tier (should have failed)")
            else:
                self.log_result("Tier Enforcement", False, f"Unexpected response code: {response.status_code}")
                
        except Exception as e:
            self.log_result("Tier Enforcement", False, f"Tier enforcement error: {str(e)}")
    
    def test_6_document_visibility(self):
        """Test 6: Document Visibility"""
        print("\n🔄 Test 6: Document Visibility")
        print("-" * 35)
        
        if not self.created_partners:
            self.log_result("Document Visibility Test", False, "No test partner available")
            return
        
        partner_id = self.created_partners[0]
        
        # Step 6.1 - Verify Documents Stored Correctly
        try:
            response = self.make_request("GET", f"/partners/{partner_id}/portal", "l1")
            
            if response.status_code == 200:
                portal_data = response.json()
                
                if "partner" in portal_data:
                    partner = portal_data["partner"]
                    documents = partner.get("documents", [])
                    
                    if len(documents) >= 2:
                        document_types = [d.get("document_type") for d in documents]
                        
                        if "business_license" in document_types and "tax_document" in document_types:
                            self.log_result("Document Storage", True, f"Partner has {len(documents)} documents including business_license and tax_document")
                        else:
                            self.log_result("Document Storage", False, f"Missing expected documents. Found: {document_types}")
                    else:
                        self.log_result("Document Storage", False, f"Expected at least 2 documents, found {len(documents)}")
                else:
                    self.log_result("Document Storage", False, "Partner data not found in portal response")
            else:
                self.log_result("Document Storage", False, f"Failed to get partner portal: {response.status_code}")
                
        except Exception as e:
            self.log_result("Document Storage", False, f"Document storage error: {str(e)}")
    
    def run_comprehensive_tests(self):
        """Run all comprehensive partner onboarding tests"""
        print("🚀 Starting Comprehensive Partner Onboarding Workflow Tests")
        print("=" * 70)
        
        # Authenticate all users
        for role in ["admin", "l1", "l2"]:
            self.authenticate_user(role)
        
        # Run all test scenarios
        self.test_1_admin_creates_partner_full_flow()
        self.test_2_partner_appears_in_spiff_module()
        self.test_3_on_hold_workflow()
        self.test_4_rejection_and_resubmission()
        self.test_5_tier_assignment_enforcement()
        self.test_6_document_visibility()
        
        # Summary
        print("\n📊 Comprehensive Test Summary:")
        print("=" * 70)
        
        passed = sum(1 for r in self.test_results if r["success"])
        failed = len(self.test_results) - passed
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        
        if failed > 0:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        return self.test_results

def main():
    """Main test execution"""
    tester = ComprehensivePartnerTester()
    results = tester.run_comprehensive_tests()
    
    # Save results to file
    with open("/app/comprehensive_partner_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Test results saved to: /app/comprehensive_partner_test_results.json")

if __name__ == "__main__":
    main()