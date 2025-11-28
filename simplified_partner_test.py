#!/usr/bin/env python3
"""
Simplified Partner Onboarding Workflow Test
Testing the partner workflow using admin credentials for all operations
to verify the API endpoints and workflow logic
"""

import requests
import json
import base64
from datetime import datetime, timezone

# Configuration
BASE_URL = "https://partnerpro-2.preview.emergentagent.com/api"
ADMIN_CREDENTIALS = {"email": "admin@test.com", "password": "admin123"}

class SimplifiedPartnerTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
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
    
    def authenticate_admin(self):
        """Authenticate as admin"""
        try:
            response = requests.post(
                f"{BASE_URL}/auth/login",
                json=ADMIN_CREDENTIALS,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                self.session.headers.update({
                    "Authorization": f"Bearer {self.admin_token}"
                })
                self.log_result("Admin Authentication", True, "Successfully authenticated as admin")
                return True
            else:
                self.log_result("Admin Authentication", False, f"Failed to authenticate: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def test_partner_creation_workflow(self):
        """Test the complete partner creation and approval workflow"""
        print("\n🔄 Testing Partner Creation & Approval Workflow")
        print("-" * 50)
        
        # Step 1: Create Partner with Documents
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
            # Test the /partners/create endpoint
            response = self.session.post(
                f"{BASE_URL}/partners/create",
                json=partner_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                partner_id = result.get("partner_id")
                self.created_partners.append(partner_id)
                self.log_result("Partner Creation", True, "Partner created successfully with /partners/create endpoint")
                
                # Verify partner status
                partners_response = self.session.get(f"{BASE_URL}/partners/directory")
                if partners_response.status_code == 200:
                    partners = partners_response.json()
                    partner = next((p for p in partners if p["id"] == partner_id), None)
                    
                    if partner:
                        if partner["status"] == "pending_l1":
                            self.log_result("Partner Status", True, f"Partner status is 'pending_l1' as expected")
                            
                            # Check documents
                            documents = partner.get("documents", [])
                            if len(documents) >= 2:
                                self.log_result("Document Storage", True, f"Partner has {len(documents)} documents stored")
                            else:
                                self.log_result("Document Storage", False, f"Expected 2+ documents, found {len(documents)}")
                        else:
                            self.log_result("Partner Status", False, f"Partner status is '{partner['status']}', expected 'pending_l1'")
                    else:
                        self.log_result("Partner Verification", False, "Created partner not found in directory")
                else:
                    self.log_result("Partner Verification", False, f"Failed to retrieve partners: {partners_response.status_code}")
            else:
                self.log_result("Partner Creation", False, f"Failed to create partner: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Partner Creation", False, f"Partner creation error: {str(e)}")
        
        if not self.created_partners:
            return
        
        partner_id = self.created_partners[0]
        
        # Step 2: Test L1 Queue
        try:
            response = self.session.get(f"{BASE_URL}/partners/l1-queue")
            
            if response.status_code == 200:
                l1_queue = response.json()
                partner_in_queue = any(p["id"] == partner_id for p in l1_queue)
                
                if partner_in_queue:
                    self.log_result("L1 Queue", True, f"Partner appears in L1 queue ({len(l1_queue)} total partners)")
                else:
                    self.log_result("L1 Queue", False, "Partner not found in L1 queue")
            else:
                self.log_result("L1 Queue", False, f"Failed to get L1 queue: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("L1 Queue", False, f"L1 queue error: {str(e)}")
        
        # Step 3: Test L1 Approval (with tier assignment)
        try:
            approval_data = {
                "tier": "gold",
                "comments": "Excellent credentials and strong business profile"
            }
            
            response = self.session.post(
                f"{BASE_URL}/partners/{partner_id}/l1-approve",
                json=approval_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                self.log_result("L1 Approval", True, "L1 approval completed with tier assignment")
                
                # Verify partner moved to L2 queue
                partners_response = self.session.get(f"{BASE_URL}/partners/directory")
                if partners_response.status_code == 200:
                    partners = partners_response.json()
                    partner = next((p for p in partners if p["id"] == partner_id), None)
                    
                    if partner:
                        if partner["status"] == "pending_l2" and partner.get("tier") == "gold":
                            self.log_result("L1 Approval Status", True, f"Partner moved to L2 queue with tier 'gold'")
                        else:
                            self.log_result("L1 Approval Status", False, f"Status: {partner['status']}, Tier: {partner.get('tier')}")
            else:
                self.log_result("L1 Approval", False, f"L1 approval failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("L1 Approval", False, f"L1 approval error: {str(e)}")
        
        # Step 4: Test L2 Queue
        try:
            response = self.session.get(f"{BASE_URL}/partners/l2-queue")
            
            if response.status_code == 200:
                l2_queue = response.json()
                partner_in_queue = any(p["id"] == partner_id for p in l2_queue)
                
                if partner_in_queue:
                    self.log_result("L2 Queue", True, f"Partner appears in L2 queue ({len(l2_queue)} total partners)")
                else:
                    self.log_result("L2 Queue", False, "Partner not found in L2 queue")
            else:
                self.log_result("L2 Queue", False, f"Failed to get L2 queue: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("L2 Queue", False, f"L2 queue error: {str(e)}")
        
        # Step 5: Test L2 Final Approval
        try:
            approval_data = {
                "comments": "Final approval granted. Welcome to the partner network!"
            }
            
            response = self.session.post(
                f"{BASE_URL}/partners/{partner_id}/l2-approve",
                json=approval_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                self.log_result("L2 Approval", True, "L2 final approval completed")
                
                # Verify final status
                partners_response = self.session.get(f"{BASE_URL}/partners/directory")
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
    
    def test_tier_enforcement(self):
        """Test that L1 approval requires tier assignment"""
        print("\n🔄 Testing Tier Assignment Enforcement")
        print("-" * 40)
        
        # Create partner for tier enforcement testing
        partner_data = {
            "company_name": "Tier Test Corp",
            "contact_person_name": "Tier User",
            "contact_person_email": "tier@test.com",
            "business_type": "Test Business"
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/partners/create",
                json=partner_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                tier_partner_id = result.get("partner_id")
                
                # Try L1 approval WITHOUT tier
                approval_data = {
                    "comments": "Trying to approve without tier"
                }
                
                reject_response = self.session.post(
                    f"{BASE_URL}/partners/{tier_partner_id}/l1-approve",
                    json=approval_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if reject_response.status_code == 400:
                    response_data = reject_response.json() if reject_response.content else {}
                    error_message = response_data.get("detail", "")
                    
                    if "tier" in error_message.lower():
                        self.log_result("Tier Enforcement", True, "L1 approval correctly rejected without tier assignment")
                    else:
                        self.log_result("Tier Enforcement", False, f"Wrong error message: {error_message}")
                elif reject_response.status_code == 200:
                    self.log_result("Tier Enforcement", False, "L1 approval succeeded without tier (should have failed)")
                else:
                    self.log_result("Tier Enforcement", False, f"Unexpected response code: {reject_response.status_code}")
            else:
                self.log_result("Tier Test Partner Creation", False, f"Failed to create tier partner: {response.status_code}")
                
        except Exception as e:
            self.log_result("Tier Enforcement", False, f"Tier enforcement error: {str(e)}")
    
    def test_rejection_workflow(self):
        """Test partner rejection and resubmission"""
        print("\n🔄 Testing Rejection & Resubmission Workflow")
        print("-" * 45)
        
        # Create partner for rejection testing
        partner_data = {
            "company_name": "Rejection Test Corp",
            "contact_person_name": "Reject User",
            "contact_person_email": "reject@test.com",
            "business_type": "Test Business"
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/partners/create",
                json=partner_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                rejection_partner_id = result.get("partner_id")
                
                # Reject at L1
                rejection_data = {
                    "reason": "Incomplete business documentation",
                    "comments": "Business license appears to be expired"
                }
                
                reject_response = self.session.post(
                    f"{BASE_URL}/partners/{rejection_partner_id}/l1-reject",
                    json=rejection_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if reject_response.status_code == 200:
                    self.log_result("L1 Rejection", True, "Partner rejected by L1")
                    
                    # Verify status
                    partners_response = self.session.get(f"{BASE_URL}/partners/directory")
                    if partners_response.status_code == 200:
                        partners = partners_response.json()
                        rejected_partner = next((p for p in partners if p["id"] == rejection_partner_id), None)
                        
                        if rejected_partner and rejected_partner["status"] == "rejected_by_l1":
                            self.log_result("Rejection Status", True, f"Partner status = 'rejected_by_l1'")
                            
                            # Test resubmission
                            resubmit_data = {}
                            
                            resubmit_response = self.session.post(
                                f"{BASE_URL}/partners/{rejection_partner_id}/resubmit",
                                json=resubmit_data,
                                headers={"Content-Type": "application/json"}
                            )
                            
                            if resubmit_response.status_code == 200:
                                self.log_result("Resubmission", True, "Rejected partner resubmitted successfully")
                                
                                # Verify status back to pending_l1
                                partners_response = self.session.get(f"{BASE_URL}/partners/directory")
                                if partners_response.status_code == 200:
                                    partners = partners_response.json()
                                    resubmitted_partner = next((p for p in partners if p["id"] == rejection_partner_id), None)
                                    
                                    if resubmitted_partner and resubmitted_partner["status"] == "pending_l1":
                                        self.log_result("Resubmission Status", True, f"Status back to 'pending_l1'")
                                    else:
                                        self.log_result("Resubmission Status", False, f"Status is '{resubmitted_partner['status'] if resubmitted_partner else 'not found'}'")
                            else:
                                self.log_result("Resubmission", False, f"Failed to resubmit: {resubmit_response.status_code}")
                        else:
                            self.log_result("Rejection Status", False, f"Partner status is '{rejected_partner['status'] if rejected_partner else 'not found'}'")
                else:
                    self.log_result("L1 Rejection", False, f"Failed to reject partner: {reject_response.status_code}")
            else:
                self.log_result("Rejection Partner Creation", False, f"Failed to create rejection partner: {response.status_code}")
                
        except Exception as e:
            self.log_result("Rejection Workflow", False, f"Rejection workflow error: {str(e)}")
    
    def test_on_hold_workflow(self):
        """Test putting partner on hold"""
        print("\n🔄 Testing On-Hold Workflow")
        print("-" * 30)
        
        # Create partner for on-hold testing
        partner_data = {
            "company_name": "OnHold Test Corp",
            "contact_person_name": "Hold User",
            "contact_person_email": "hold@test.com",
            "business_type": "Test Business"
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/partners/create",
                json=partner_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                hold_partner_id = result.get("partner_id")
                
                # Put partner on hold
                hold_data = {
                    "reason": "Missing required tax documents",
                    "comments": "Please upload Form 941 and W-9 before we can proceed"
                }
                
                hold_response = self.session.post(
                    f"{BASE_URL}/partners/{hold_partner_id}/put-on-hold",
                    json=hold_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if hold_response.status_code == 200:
                    self.log_result("Put On Hold", True, "Partner successfully put on hold")
                    
                    # Verify status and check on-hold queue
                    onhold_response = self.session.get(f"{BASE_URL}/partners/on-hold")
                    if onhold_response.status_code == 200:
                        onhold_partners = onhold_response.json()
                        partner_in_hold = any(p["id"] == hold_partner_id for p in onhold_partners)
                        
                        if partner_in_hold:
                            self.log_result("OnHold Queue", True, f"Partner appears in on-hold queue")
                        else:
                            self.log_result("OnHold Queue", False, "Partner not found in on-hold queue")
                    else:
                        self.log_result("OnHold Queue", False, f"Failed to get on-hold queue: {onhold_response.status_code}")
                else:
                    self.log_result("Put On Hold", False, f"Failed to put partner on hold: {hold_response.status_code}")
            else:
                self.log_result("OnHold Partner Creation", False, f"Failed to create hold partner: {response.status_code}")
                
        except Exception as e:
            self.log_result("OnHold Workflow", False, f"OnHold workflow error: {str(e)}")
    
    def test_document_visibility(self):
        """Test document visibility through partner portal"""
        print("\n🔄 Testing Document Visibility")
        print("-" * 35)
        
        if not self.created_partners:
            self.log_result("Document Visibility Test", False, "No test partner available")
            return
        
        partner_id = self.created_partners[0]
        
        try:
            response = self.session.get(f"{BASE_URL}/partners/{partner_id}/portal")
            
            if response.status_code == 200:
                portal_data = response.json()
                
                if "partner" in portal_data:
                    partner = portal_data["partner"]
                    documents = partner.get("documents", [])
                    
                    if len(documents) >= 2:
                        document_types = [d.get("document_type") for d in documents]
                        
                        if "business_license" in document_types and "tax_document" in document_types:
                            self.log_result("Document Visibility", True, f"Partner portal shows {len(documents)} documents including business_license and tax_document")
                        else:
                            self.log_result("Document Visibility", False, f"Missing expected documents. Found: {document_types}")
                    else:
                        self.log_result("Document Visibility", False, f"Expected at least 2 documents, found {len(documents)}")
                else:
                    self.log_result("Document Visibility", False, "Partner data not found in portal response")
            else:
                self.log_result("Document Visibility", False, f"Failed to get partner portal: {response.status_code}")
                
        except Exception as e:
            self.log_result("Document Visibility", False, f"Document visibility error: {str(e)}")
    
    def run_all_tests(self):
        """Run all simplified partner tests"""
        print("🚀 Starting Simplified Partner Onboarding Workflow Tests")
        print("=" * 70)
        
        # Authenticate
        if not self.authenticate_admin():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return
        
        # Run all tests
        self.test_partner_creation_workflow()
        self.test_tier_enforcement()
        self.test_rejection_workflow()
        self.test_on_hold_workflow()
        self.test_document_visibility()
        
        # Summary
        print("\n📊 Test Summary:")
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
    tester = SimplifiedPartnerTester()
    results = tester.run_all_tests()
    
    # Save results to file
    with open("/app/simplified_partner_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Test results saved to: /app/simplified_partner_test_results.json")

if __name__ == "__main__":
    main()