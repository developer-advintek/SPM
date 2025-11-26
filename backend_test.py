#!/usr/bin/env python3
"""
Comprehensive Partner Hub Backend API Tests
Testing multi-level approval workflow for Partner Hub module
"""

import requests
import json
import base64
from datetime import datetime, timezone
import uuid

# Configuration
BASE_URL = "https://spm-portal.preview.emergentagent.com/api"
TEST_CREDENTIALS = {
    "email": "admin@test.com",
    "password": "admin123"
}

class PartnerHubTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
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
    
    def authenticate(self):
        """Authenticate and get access token"""
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json=TEST_CREDENTIALS,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.session.headers.update({
                    "Authorization": f"Bearer {self.auth_token}"
                })
                self.log_result("Authentication", True, "Successfully authenticated as admin")
                return True
            else:
                self.log_result("Authentication", False, f"Failed to authenticate: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Authentication error: {str(e)}")
            return False
    
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
    
    def test_admin_partner_creation(self):
        """Test 1: Admin Partner Creation"""
        partner_data = {
            "company_name": "TechCorp Solutions Inc.",
            "contact_person_name": "Sarah Johnson",
            "contact_person_email": "sarah.johnson@techcorp.com",
            "contact_person_phone": "+1-555-0123",
            "website": "https://techcorp-solutions.com",
            "business_type": "Technology Consulting",
            "tax_id": "12-3456789",
            "years_in_business": 8,
            "number_of_employees": 45,
            "expected_monthly_volume": "$250,000",
            "business_address": "123 Innovation Drive, Tech City, TC 12345",
            "tier": "silver"
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/partners/admin-create",
                json=partner_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                partner_id = result.get("partner_id")
                self.created_partners.append(partner_id)
                
                # Verify partner was created with correct status
                partner_response = self.session.get(f"{BASE_URL}/partners/all")
                if partner_response.status_code == 200:
                    partners = partner_response.json()
                    created_partner = next((p for p in partners if p["id"] == partner_id), None)
                    
                    if created_partner:
                        if created_partner["status"] == "pending_level1":
                            self.log_result("Admin Partner Creation", True, "Partner created with status 'pending_level1'")
                            
                            # Verify approval workflow initialization
                            workflow = created_partner.get("approval_workflow", [])
                            if len(workflow) == 2:
                                l1_step = next((s for s in workflow if s["level"] == 1), None)
                                l2_step = next((s for s in workflow if s["level"] == 2), None)
                                
                                if l1_step and l2_step and l1_step["status"] == "pending" and l2_step["status"] == "pending":
                                    self.log_result("Approval Workflow Init", True, "L1 and L2 approval steps initialized correctly")
                                else:
                                    self.log_result("Approval Workflow Init", False, "Approval workflow steps not properly initialized")
                            else:
                                self.log_result("Approval Workflow Init", False, f"Expected 2 workflow steps, got {len(workflow)}")
                        else:
                            self.log_result("Admin Partner Creation", False, f"Partner status is '{created_partner['status']}', expected 'pending_level1'")
                    else:
                        self.log_result("Admin Partner Creation", False, "Created partner not found in partners list")
                else:
                    self.log_result("Admin Partner Creation", False, f"Failed to retrieve partners: {partner_response.status_code}")
            else:
                self.log_result("Admin Partner Creation", False, f"Failed to create partner: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Admin Partner Creation", False, f"Partner creation error: {str(e)}")
    
    def test_l1_approval_queue(self):
        """Test 2: L1 Approval Queue"""
        try:
            response = self.session.get(f"{BASE_URL}/partners/l1-queue")
            
            if response.status_code == 200:
                l1_queue = response.json()
                
                # Check if our created partner is in the L1 queue
                if self.created_partners:
                    partner_in_queue = any(p["id"] in self.created_partners for p in l1_queue)
                    if partner_in_queue:
                        self.log_result("L1 Approval Queue", True, f"L1 queue contains {len(l1_queue)} partners including our test partner")
                    else:
                        self.log_result("L1 Approval Queue", False, "Test partner not found in L1 queue")
                else:
                    self.log_result("L1 Approval Queue", True, f"L1 queue retrieved with {len(l1_queue)} partners")
            else:
                self.log_result("L1 Approval Queue", False, f"Failed to get L1 queue: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("L1 Approval Queue", False, f"L1 queue error: {str(e)}")
    
    def test_l1_approval_workflow(self):
        """Test 3: L1 Approval Workflow"""
        if not self.created_partners:
            self.log_result("L1 Approval", False, "No test partner available for L1 approval")
            return
            
        partner_id = self.created_partners[0]
        approval_data = {
            "comments": "Partner documentation looks good. Business model is solid and financials are acceptable."
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/partners/{partner_id}/approve-l1",
                json=approval_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                # Verify partner status changed to pending_level2
                partner_response = self.session.get(f"{BASE_URL}/partners/all")
                if partner_response.status_code == 200:
                    partners = partner_response.json()
                    partner = next((p for p in partners if p["id"] == partner_id), None)
                    
                    if partner and partner["status"] == "pending_level2":
                        self.log_result("L1 Approval Status", True, "Partner status changed to 'pending_level2'")
                        
                        # Verify L1 step in approval_workflow is marked as approved
                        workflow = partner.get("approval_workflow", [])
                        l1_step = next((s for s in workflow if s["level"] == 1), None)
                        
                        if l1_step and l1_step["status"] == "approved":
                            self.log_result("L1 Approval Workflow", True, "L1 step marked as 'approved' in workflow")
                        else:
                            self.log_result("L1 Approval Workflow", False, "L1 step not properly marked as approved")
                    else:
                        self.log_result("L1 Approval Status", False, f"Partner status is '{partner['status'] if partner else 'not found'}', expected 'pending_level2'")
                else:
                    self.log_result("L1 Approval", False, f"Failed to retrieve partner after approval: {partner_response.status_code}")
            else:
                self.log_result("L1 Approval", False, f"Failed to approve L1: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("L1 Approval", False, f"L1 approval error: {str(e)}")
    
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