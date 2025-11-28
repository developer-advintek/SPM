#!/usr/bin/env python3
"""
COMPLETE PARTNER ONBOARDING E2E TEST - RETRY
Testing complete partner approval workflow: Admin creates → L1 approves with tier → L2 approves
Verifying partner only appears in other modules after L2 approval
"""

import requests
import json
import base64
from datetime import datetime, timezone
import uuid

# Configuration
BASE_URL = "https://partnerpro-2.preview.emergentagent.com/api"

# Test Credentials (VERIFIED)
TEST_CREDENTIALS = {
    "admin": {"email": "admin@test.com", "password": "admin123"},
    "l1": {"email": "l1@test.com", "password": "l1_123"},
    "l2": {"email": "l2@test.com", "password": "l2_123"}
}

class PartnerOnboardingTester:
    def __init__(self):
        self.session = requests.Session()
        self.tokens = {}  # Store tokens for different users
        self.test_results = []
        self.created_partners = []
        self.created_products = []
        
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
    
    def authenticate_user(self, user_type):
        """Authenticate specific user type and store token"""
        try:
            credentials = TEST_CREDENTIALS[user_type]
            response = requests.post(
                f"{BASE_URL}/auth/login",
                json=credentials,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token")
                self.tokens[user_type] = token
                self.log_result(f"{user_type.upper()} Authentication", True, f"Successfully authenticated as {user_type}")
                return token
            else:
                self.log_result(f"{user_type.upper()} Authentication", False, f"Failed to authenticate {user_type}: {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_result(f"{user_type.upper()} Authentication", False, f"{user_type} authentication error: {str(e)}")
            return None
    
    def get_headers(self, user_type):
        """Get headers with authorization for specific user"""
        token = self.tokens.get(user_type)
        if not token:
            return {"Content-Type": "application/json"}
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    
    def create_test_products(self):
        """Create test products for assignment"""
        products_data = [
            {
                "sku": "PROD-001",
                "name": "Enterprise Software License",
                "category": "Software",
                "commission_rate_code": "STANDARD",
                "gross_margin_percent": "45.50",
                "base_commission_rate": "8.75"
            },
            {
                "sku": "PROD-002", 
                "name": "Professional Services Package",
                "category": "Services",
                "commission_rate_code": "PREMIUM",
                "gross_margin_percent": "60.00",
                "base_commission_rate": "12.50"
            }
        ]
        
        for product_data in products_data:
            try:
                response = self.session.post(
                    f"{BASE_URL}/products",
                    json=product_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    product = response.json()
                    self.created_products.append(product["id"])
                    self.log_result("Product Creation", True, f"Created product: {product_data['name']}")
                else:
                    self.log_result("Product Creation", False, f"Failed to create product: {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_result("Product Creation", False, f"Product creation error: {str(e)}")
    
    def test_1_admin_creates_partner(self):
        """Test 1: Complete Partner Approval Flow - Step 1: Admin Creates Partner"""
        partner_data = {
            "company_name": "Nexus Technologies Ltd",
            "business_type": "Software Development",
            "tax_id": "TAX-98765",
            "years_in_business": 8,
            "number_of_employees": 120,
            "expected_monthly_volume": "$500K-$1M",
            "business_address": "456 Innovation Drive, Austin, TX 78701",
            "website": "https://nexus-tech.com",
            "contact_person_name": "Sarah Johnson",
            "contact_person_email": "sarah@nexus-tech.com",
            "contact_person_phone": "+1-555-9876",
            "contact_person_designation": "VP of Partnerships"
        }
        
        try:
            response = requests.post(
                f"{BASE_URL}/partners/create",
                json=partner_data,
                headers=self.get_headers("admin")
            )
            
            if response.status_code == 200:
                result = response.json()
                partner_id = result.get("partner_id")
                self.created_partners.append(partner_id)
                
                # Verify partner was created with correct status
                partner_response = requests.get(
                    f"{BASE_URL}/partners/directory",
                    headers=self.get_headers("admin")
                )
                
                if partner_response.status_code == 200:
                    partners = partner_response.json()
                    created_partner = next((p for p in partners if p["id"] == partner_id), None)
                    
                    if created_partner and created_partner["status"] == "pending_l1":
                        self.log_result("Step 1 - Admin Creates Partner", True, "Partner created with status 'pending_l1'")
                        return partner_id
                    else:
                        self.log_result("Step 1 - Admin Creates Partner", False, f"Partner status is '{created_partner['status'] if created_partner else 'not found'}', expected 'pending_l1'")
                else:
                    self.log_result("Step 1 - Admin Creates Partner", False, f"Failed to retrieve partners: {partner_response.status_code}")
            else:
                self.log_result("Step 1 - Admin Creates Partner", False, f"Failed to create partner: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Step 1 - Admin Creates Partner", False, f"Partner creation error: {str(e)}")
        
        return None
    
    def test_2_l1_gets_queue_and_approves(self, partner_id):
        """Test 2: Step 2 - L1 Gets Queue & Approves with Tier"""
        if not partner_id:
            self.log_result("Step 2 - L1 Queue & Approve", False, "No partner ID available")
            return False
            
        try:
            # L1 gets queue
            response = requests.get(
                f"{BASE_URL}/partners/l1-queue",
                headers=self.get_headers("l1")
            )
            
            if response.status_code == 200:
                l1_queue = response.json()
                partner_in_queue = any(p["id"] == partner_id for p in l1_queue)
                
                if partner_in_queue:
                    self.log_result("Step 2a - L1 Gets Queue", True, f"Partner found in L1 queue ({len(l1_queue)} total partners)")
                    
                    # L1 Approve with GOLD tier
                    approval_data = {
                        "tier": "gold",
                        "comments": "Approved for Gold tier partnership"
                    }
                    
                    approve_response = requests.post(
                        f"{BASE_URL}/partners/{partner_id}/l1-approve",
                        json=approval_data,
                        headers=self.get_headers("l1")
                    )
                    
                    if approve_response.status_code == 200:
                        # Verify status changed to pending_l2 and tier set to gold
                        partner_response = requests.get(
                            f"{BASE_URL}/partners/directory",
                            headers=self.get_headers("admin")
                        )
                        
                        if partner_response.status_code == 200:
                            partners = partner_response.json()
                            partner = next((p for p in partners if p["id"] == partner_id), None)
                            
                            if partner and partner["status"] == "pending_l2" and partner.get("tier") == "gold":
                                self.log_result("Step 2b - L1 Approve with Tier", True, "Partner status 'pending_l2', tier set to 'gold'")
                                return True
                            else:
                                self.log_result("Step 2b - L1 Approve with Tier", False, f"Status: {partner['status'] if partner else 'not found'}, Tier: {partner.get('tier') if partner else 'N/A'}")
                        else:
                            self.log_result("Step 2b - L1 Approve with Tier", False, f"Failed to verify partner: {partner_response.status_code}")
                    else:
                        self.log_result("Step 2b - L1 Approve with Tier", False, f"L1 approval failed: {approve_response.status_code}", approve_response.text)
                else:
                    self.log_result("Step 2a - L1 Gets Queue", False, "Partner not found in L1 queue")
            else:
                self.log_result("Step 2a - L1 Gets Queue", False, f"Failed to get L1 queue: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Step 2 - L1 Queue & Approve", False, f"L1 approval error: {str(e)}")
        
        return False
    
    def test_3_l2_gets_queue_and_approves(self, partner_id):
        """Test 3: Step 3 - L2 Gets Queue & Final Approval"""
        if not partner_id:
            self.log_result("Step 3 - L2 Queue & Approve", False, "No partner ID available")
            return False
            
        try:
            # L2 gets queue
            response = requests.get(
                f"{BASE_URL}/partners/l2-queue",
                headers=self.get_headers("l2")
            )
            
            if response.status_code == 200:
                l2_queue = response.json()
                partner_in_queue = any(p["id"] == partner_id for p in l2_queue)
                
                if partner_in_queue:
                    self.log_result("Step 3a - L2 Gets Queue", True, f"Partner found in L2 queue ({len(l2_queue)} total partners)")
                    
                    # L2 Final Approve
                    approval_data = {
                        "comments": "Final approval completed. Welcome aboard!"
                    }
                    
                    approve_response = requests.post(
                        f"{BASE_URL}/partners/{partner_id}/l2-approve",
                        json=approval_data,
                        headers=self.get_headers("l2")
                    )
                    
                    if approve_response.status_code == 200:
                        # Verify status changed to approved and onboarding_progress 100
                        partner_response = requests.get(
                            f"{BASE_URL}/partners/directory",
                            headers=self.get_headers("admin")
                        )
                        
                        if partner_response.status_code == 200:
                            partners = partner_response.json()
                            partner = next((p for p in partners if p["id"] == partner_id), None)
                            
                            if partner and partner["status"] == "approved" and partner.get("onboarding_progress") == 100:
                                self.log_result("Step 3b - L2 Final Approve", True, "Partner status 'approved', onboarding_progress 100%")
                                return True
                            else:
                                self.log_result("Step 3b - L2 Final Approve", False, f"Status: {partner['status'] if partner else 'not found'}, Progress: {partner.get('onboarding_progress') if partner else 'N/A'}%")
                        else:
                            self.log_result("Step 3b - L2 Final Approve", False, f"Failed to verify partner: {partner_response.status_code}")
                    else:
                        self.log_result("Step 3b - L2 Final Approve", False, f"L2 approval failed: {approve_response.status_code}", approve_response.text)
                else:
                    self.log_result("Step 3a - L2 Gets Queue", False, "Partner not found in L2 queue")
            else:
                self.log_result("Step 3a - L2 Gets Queue", False, f"Failed to get L2 queue: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Step 3 - L2 Queue & Approve", False, f"L2 approval error: {str(e)}")
        
        return False
    
    def test_l2_approval_queue(self):
        """Test 4: L2 Approval Queue"""
        try:
            response = self.session.get(f"{BASE_URL}/partners/l2-queue")
            
            if response.status_code == 200:
                l2_queue = response.json()
                
                # Check if our partner moved to L2 queue
                if self.created_partners:
                    partner_in_queue = any(p["id"] in self.created_partners for p in l2_queue)
                    if partner_in_queue:
                        self.log_result("L2 Approval Queue", True, f"Partner successfully moved to L2 queue ({len(l2_queue)} partners)")
                    else:
                        self.log_result("L2 Approval Queue", False, "Test partner not found in L2 queue")
                else:
                    self.log_result("L2 Approval Queue", True, f"L2 queue retrieved with {len(l2_queue)} partners")
            else:
                self.log_result("L2 Approval Queue", False, f"Failed to get L2 queue: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("L2 Approval Queue", False, f"L2 queue error: {str(e)}")
    
    def test_l2_approval_workflow(self):
        """Test 5: L2 Approval Workflow"""
        if not self.created_partners:
            self.log_result("L2 Approval", False, "No test partner available for L2 approval")
            return
            
        partner_id = self.created_partners[0]
        approval_data = {
            "comments": "Final review completed. Partner meets all requirements for full approval."
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/partners/{partner_id}/approve-l2",
                json=approval_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                # Verify partner status changed to approved
                partner_response = self.session.get(f"{BASE_URL}/partners/all")
                if partner_response.status_code == 200:
                    partners = partner_response.json()
                    partner = next((p for p in partners if p["id"] == partner_id), None)
                    
                    if partner:
                        if partner["status"] == "approved":
                            self.log_result("L2 Approval Status", True, "Partner status changed to 'approved'")
                            
                            # Verify L2 step in approval_workflow is marked as approved
                            workflow = partner.get("approval_workflow", [])
                            l2_step = next((s for s in workflow if s["level"] == 2), None)
                            
                            if l2_step and l2_step["status"] == "approved":
                                self.log_result("L2 Approval Workflow", True, "L2 step marked as 'approved' in workflow")
                            else:
                                self.log_result("L2 Approval Workflow", False, "L2 step not properly marked as approved")
                            
                            # Verify onboarding progress reaches 90%
                            if partner.get("onboarding_progress", 0) >= 90:
                                self.log_result("L2 Onboarding Progress", True, f"Onboarding progress is {partner['onboarding_progress']}%")
                            else:
                                self.log_result("L2 Onboarding Progress", False, f"Onboarding progress is {partner.get('onboarding_progress', 0)}%, expected >= 90%")
                        else:
                            self.log_result("L2 Approval Status", False, f"Partner status is '{partner['status']}', expected 'approved'")
                    else:
                        self.log_result("L2 Approval", False, "Partner not found after L2 approval")
                else:
                    self.log_result("L2 Approval", False, f"Failed to retrieve partner after L2 approval: {partner_response.status_code}")
            else:
                self.log_result("L2 Approval", False, f"Failed to approve L2: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("L2 Approval", False, f"L2 approval error: {str(e)}")
    
    def test_product_assignment(self):
        """Test 6: Product Assignment"""
        if not self.created_partners or not self.created_products:
            self.log_result("Product Assignment", False, "No test partner or products available")
            return
            
        partner_id = self.created_partners[0]
        assignment_data = {
            "product_ids": self.created_products
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/partners/{partner_id}/assign-products",
                json=assignment_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                # Verify products are assigned and onboarding progress reaches 100%
                partner_response = self.session.get(f"{BASE_URL}/partners/all")
                if partner_response.status_code == 200:
                    partners = partner_response.json()
                    partner = next((p for p in partners if p["id"] == partner_id), None)
                    
                    if partner:
                        assigned_products = partner.get("assigned_products", [])
                        if set(assigned_products) == set(self.created_products):
                            self.log_result("Product Assignment", True, f"Successfully assigned {len(assigned_products)} products")
                            
                            # Verify onboarding progress reaches 100%
                            if partner.get("onboarding_progress", 0) == 100:
                                self.log_result("Product Assignment Progress", True, "Onboarding progress reached 100%")
                            else:
                                self.log_result("Product Assignment Progress", False, f"Onboarding progress is {partner.get('onboarding_progress', 0)}%, expected 100%")
                        else:
                            self.log_result("Product Assignment", False, f"Product assignment mismatch. Expected: {self.created_products}, Got: {assigned_products}")
                    else:
                        self.log_result("Product Assignment", False, "Partner not found after product assignment")
                else:
                    self.log_result("Product Assignment", False, f"Failed to retrieve partner after product assignment: {partner_response.status_code}")
            else:
                self.log_result("Product Assignment", False, f"Failed to assign products: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Product Assignment", False, f"Product assignment error: {str(e)}")
    
    def test_partner_portal(self):
        """Test 7: Partner Portal"""
        if not self.created_partners:
            self.log_result("Partner Portal", False, "No test partner available")
            return
            
        partner_id = self.created_partners[0]
        
        try:
            response = self.session.get(f"{BASE_URL}/partners/{partner_id}/portal")
            
            if response.status_code == 200:
                portal_data = response.json()
                
                # Verify it returns partner details with assigned products
                if "partner" in portal_data and "assigned_products" in portal_data:
                    partner = portal_data["partner"]
                    assigned_products = portal_data["assigned_products"]
                    
                    if partner["id"] == partner_id:
                        self.log_result("Partner Portal Data", True, f"Portal returned partner details with {len(assigned_products)} assigned products")
                        
                        # Verify partner is in complete state
                        if partner.get("status") == "approved" and partner.get("onboarding_progress") == 100:
                            self.log_result("Partner Portal State", True, "Partner is in complete approved state")
                        else:
                            self.log_result("Partner Portal State", False, f"Partner state incomplete: status={partner.get('status')}, progress={partner.get('onboarding_progress')}%")
                    else:
                        self.log_result("Partner Portal", False, "Portal returned wrong partner data")
                else:
                    self.log_result("Partner Portal", False, "Portal response missing required fields")
            else:
                self.log_result("Partner Portal", False, f"Failed to get partner portal: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Partner Portal", False, f"Partner portal error: {str(e)}")
    
    def test_rejection_workflow(self):
        """Test 8: Rejection Workflow"""
        # Create a new partner for rejection testing
        partner_data = {
            "company_name": "RejectionTest Corp",
            "contact_person_name": "John Doe",
            "contact_person_email": "john.doe@rejectiontest.com",
            "contact_person_phone": "+1-555-9999",
            "business_type": "Test Business",
            "tier": "bronze"
        }
        
        try:
            # Create partner
            response = self.session.post(
                f"{BASE_URL}/partners/admin-create",
                json=partner_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                rejection_partner_id = result.get("partner_id")
                
                # Reject at L1
                rejection_data = {
                    "reason": "Insufficient documentation provided",
                    "comments": "Missing required business license and tax documents"
                }
                
                reject_response = self.session.post(
                    f"{BASE_URL}/partners/{rejection_partner_id}/reject-l1",
                    json=rejection_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if reject_response.status_code == 200:
                    # Verify status changed to rejected_level1 and rejection_count incremented
                    partner_response = self.session.get(f"{BASE_URL}/partners/all")
                    if partner_response.status_code == 200:
                        partners = partner_response.json()
                        rejected_partner = next((p for p in partners if p["id"] == rejection_partner_id), None)
                        
                        if rejected_partner:
                            if rejected_partner["status"] == "rejected_level1":
                                self.log_result("Rejection Status", True, "Partner status changed to 'rejected_level1'")
                                
                                if rejected_partner.get("rejection_count", 0) >= 1:
                                    self.log_result("Rejection Count", True, f"Rejection count incremented to {rejected_partner['rejection_count']}")
                                else:
                                    self.log_result("Rejection Count", False, f"Rejection count is {rejected_partner.get('rejection_count', 0)}, expected >= 1")
                            else:
                                self.log_result("Rejection Status", False, f"Partner status is '{rejected_partner['status']}', expected 'rejected_level1'")
                        else:
                            self.log_result("Rejection Workflow", False, "Rejected partner not found")
                    else:
                        self.log_result("Rejection Workflow", False, f"Failed to retrieve partner after rejection: {partner_response.status_code}")
                else:
                    self.log_result("Rejection Workflow", False, f"Failed to reject partner: {reject_response.status_code}", reject_response.text)
            else:
                self.log_result("Rejection Workflow", False, f"Failed to create partner for rejection test: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Rejection Workflow", False, f"Rejection workflow error: {str(e)}")
    
    def test_document_upload(self):
        """Test 9: Document Upload"""
        if not self.created_partners:
            self.log_result("Document Upload", False, "No test partner available")
            return
            
        partner_id = self.created_partners[0]
        
        # Create a sample base64 encoded document (simple text file)
        sample_document = "This is a sample business license document for testing purposes."
        encoded_document = base64.b64encode(sample_document.encode()).decode()
        
        document_data = {
            "document_type": "business_license",
            "document_name": "business_license.pdf",
            "document_data": encoded_document
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/partners/{partner_id}/upload-document",
                json=document_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                # Verify document was added to partner's documents array
                partner_response = self.session.get(f"{BASE_URL}/partners/all")
                if partner_response.status_code == 200:
                    partners = partner_response.json()
                    partner = next((p for p in partners if p["id"] == partner_id), None)
                    
                    if partner:
                        documents = partner.get("documents", [])
                        uploaded_doc = next((d for d in documents if d["document_type"] == "business_license"), None)
                        
                        if uploaded_doc:
                            self.log_result("Document Upload", True, f"Document successfully uploaded and added to partner's documents array")
                        else:
                            self.log_result("Document Upload", False, "Uploaded document not found in partner's documents")
                    else:
                        self.log_result("Document Upload", False, "Partner not found after document upload")
                else:
                    self.log_result("Document Upload", False, f"Failed to retrieve partner after document upload: {partner_response.status_code}")
            else:
                self.log_result("Document Upload", False, f"Failed to upload document: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Document Upload", False, f"Document upload error: {str(e)}")
    
    def test_partner_self_registration(self):
        """Test 10: Partner Self-Registration"""
        partner_data = {
            "company_name": "SelfReg Solutions Ltd",
            "contact_person_name": "Mike Wilson",
            "contact_person_email": "mike.wilson@selfreg.com",
            "contact_person_phone": "+1-555-7777",
            "website": "https://selfreg-solutions.com",
            "business_type": "Software Development",
            "years_in_business": 5,
            "number_of_employees": 25,
            "expected_monthly_volume": "$150,000",
            "user_id": str(uuid.uuid4())  # Simulate a user ID
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/partners/register",
                json=partner_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                partner_id = result.get("partner_id")
                
                if partner_id:
                    # Verify partner was created with pending_review status
                    partner_response = self.session.get(f"{BASE_URL}/partners/all")
                    if partner_response.status_code == 200:
                        partners = partner_response.json()
                        self_reg_partner = next((p for p in partners if p["id"] == partner_id), None)
                        
                        if self_reg_partner and self_reg_partner["status"] == "pending_review":
                            self.log_result("Partner Self-Registration", True, "Partner self-registered with status 'pending_review'")
                        else:
                            self.log_result("Partner Self-Registration", False, f"Partner status is '{self_reg_partner['status'] if self_reg_partner else 'not found'}', expected 'pending_review'")
                    else:
                        self.log_result("Partner Self-Registration", False, f"Failed to retrieve partner after self-registration: {partner_response.status_code}")
                else:
                    self.log_result("Partner Self-Registration", False, "No partner_id returned from self-registration")
            else:
                self.log_result("Partner Self-Registration", False, f"Failed to self-register partner: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Partner Self-Registration", False, f"Self-registration error: {str(e)}")
    
    def test_pending_partners_queue(self):
        """Test 11: Pending Partners Queue"""
        try:
            response = self.session.get(f"{BASE_URL}/partners/pending")
            
            if response.status_code == 200:
                pending_partners = response.json()
                self.log_result("Pending Partners Queue", True, f"Retrieved {len(pending_partners)} pending partners")
            else:
                self.log_result("Pending Partners Queue", False, f"Failed to get pending partners: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Pending Partners Queue", False, f"Pending partners queue error: {str(e)}")
    
    def test_request_more_info(self):
        """Test 12: Request More Information"""
        if not self.created_partners:
            self.log_result("Request More Info", False, "No test partner available")
            return
            
        partner_id = self.created_partners[0]
        request_data = {
            "message": "Please provide additional financial statements and business references."
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/partners/{partner_id}/request-more",
                json=request_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                self.log_result("Request More Info", True, "Information request sent successfully")
            else:
                self.log_result("Request More Info", False, f"Failed to request more info: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Request More Info", False, f"Request more info error: {str(e)}")
    
    def test_partner_deactivation(self):
        """Test 13: Partner Deactivation"""
        # Create a partner specifically for deactivation testing
        partner_data = {
            "company_name": "DeactivationTest Corp",
            "contact_person_name": "Jane Smith",
            "contact_person_email": "jane.smith@deactivationtest.com",
            "business_type": "Test Business",
            "tier": "bronze"
        }
        
        try:
            # Create partner
            response = self.session.post(
                f"{BASE_URL}/partners/admin-create",
                json=partner_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                deactivation_partner_id = result.get("partner_id")
                
                # Deactivate partner
                deactivation_data = {
                    "reason": "Business closure - partner requested deactivation"
                }
                
                deactivate_response = self.session.post(
                    f"{BASE_URL}/partners/{deactivation_partner_id}/deactivate",
                    json=deactivation_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if deactivate_response.status_code == 200:
                    # Verify status changed to inactive
                    partner_response = self.session.get(f"{BASE_URL}/partners/all")
                    if partner_response.status_code == 200:
                        partners = partner_response.json()
                        deactivated_partner = next((p for p in partners if p["id"] == deactivation_partner_id), None)
                        
                        if deactivated_partner and deactivated_partner["status"] == "inactive":
                            self.log_result("Partner Deactivation", True, "Partner successfully deactivated with status 'inactive'")
                        else:
                            self.log_result("Partner Deactivation", False, f"Partner status is '{deactivated_partner['status'] if deactivated_partner else 'not found'}', expected 'inactive'")
                    else:
                        self.log_result("Partner Deactivation", False, f"Failed to retrieve partner after deactivation: {partner_response.status_code}")
                else:
                    self.log_result("Partner Deactivation", False, f"Failed to deactivate partner: {deactivate_response.status_code}", deactivate_response.text)
            else:
                self.log_result("Partner Deactivation", False, f"Failed to create partner for deactivation test: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Partner Deactivation", False, f"Partner deactivation error: {str(e)}")
    
    def run_all_tests(self):
        """Run all Partner Hub tests"""
        print("🚀 Starting Partner Hub Backend API Tests")
        print("=" * 60)
        
        # Step 1: Authenticate
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return
        
        # Step 2: Create test products
        self.create_test_products()
        
        # Step 3: Run the complete test flow
        print("\n📋 Running Partner Hub Test Flow:")
        print("-" * 40)
        
        self.test_admin_partner_creation()
        self.test_l1_approval_queue()
        self.test_l1_approval_workflow()
        self.test_l2_approval_queue()
        self.test_l2_approval_workflow()
        self.test_product_assignment()
        self.test_partner_portal()
        self.test_rejection_workflow()
        self.test_document_upload()
        
        # Additional Partner Hub tests
        print("\n📋 Running Additional Partner Hub Tests:")
        print("-" * 40)
        self.test_partner_self_registration()
        self.test_pending_partners_queue()
        self.test_request_more_info()
        self.test_partner_deactivation()
        
        # Summary
        print("\n📊 Test Summary:")
        print("=" * 60)
        
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
    tester = PartnerHubTester()
    results = tester.run_all_tests()
    
    # Save results to file
    with open("/app/partner_hub_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Test results saved to: /app/partner_hub_test_results.json")

if __name__ == "__main__":
    main()