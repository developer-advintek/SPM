#!/usr/bin/env python3
"""
Partner Hub Document Upload End-to-End Test
Testing complete document upload workflow as requested by user
"""

import requests
import json
import base64
from datetime import datetime, timezone
import uuid

# Configuration
BASE_URL = "https://spm-portal.preview.emergentagent.com/api"

# Test credentials as specified by user
PM_CREDENTIALS = {
    "email": "pm@test.com",
    "password": "pm123"
}

PARTNER_CREDENTIALS = {
    "email": "partner@test.com", 
    "password": "partner123"
}

class DocumentUploadTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
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
    
    def authenticate(self, credentials, role_name):
        """Authenticate and get access token"""
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json=credentials,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.session.headers.update({
                    "Authorization": f"Bearer {self.auth_token}"
                })
                self.log_result(f"Authentication ({role_name})", True, f"Successfully authenticated as {role_name}")
                return True
            else:
                self.log_result(f"Authentication ({role_name})", False, f"Failed to authenticate: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result(f"Authentication ({role_name})", False, f"Authentication error: {str(e)}")
            return False
    
    def create_sample_document(self, doc_type, content):
        """Create a base64 encoded sample document"""
        sample_content = f"Sample {doc_type} document: {content}"
        return base64.b64encode(sample_content.encode()).decode()
    
    def test_pm_create_partner_with_documents(self):
        """Test 1: Create Partner with Documents (PM)"""
        print("\n🔍 Test 1: Create Partner with Documents (PM)")
        
        # Authenticate as PM
        if not self.authenticate(PM_CREDENTIALS, "Partner Manager"):
            return False
        
        # Partner data
        partner_data = {
            "company_name": "DocTest Solutions Inc.",
            "contact_person_name": "Alice Johnson",
            "contact_person_email": "alice.johnson@doctest.com",
            "contact_person_phone": "+1-555-0199",
            "website": "https://doctest-solutions.com",
            "business_type": "Technology Services",
            "tax_id": "98-7654321",
            "years_in_business": 6,
            "number_of_employees": 35,
            "expected_monthly_volume": "$180,000",
            "business_address": "456 Document Lane, Test City, TC 54321",
            "tier": "gold"
        }
        
        try:
            # Create partner using admin-create endpoint
            response = self.session.post(
                f"{BASE_URL}/partners/admin-create",
                json=partner_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                partner_id = result.get("partner_id")
                self.created_partners.append(partner_id)
                
                # Verify partner created with pending_review status
                partner_response = self.session.get(f"{BASE_URL}/partners/all")
                if partner_response.status_code == 200:
                    partners = partner_response.json()
                    created_partner = next((p for p in partners if p["id"] == partner_id), None)
                    
                    if created_partner and created_partner["status"] == "pending_level1":
                        self.log_result("Partner Creation", True, "Partner created with status 'pending_level1'")
                        
                        # Check onboarding progress (should be 30%)
                        progress = created_partner.get("onboarding_progress", 0)
                        if progress == 30:
                            self.log_result("Initial Progress", True, f"Onboarding progress is {progress}%")
                        else:
                            self.log_result("Initial Progress", False, f"Onboarding progress is {progress}%, expected 30%")
                        
                        # Now upload 3 documents
                        documents_to_upload = [
                            {
                                "document_type": "business_license",
                                "document_name": "business_license.pdf",
                                "document_data": self.create_sample_document("business_license", "Valid business license for DocTest Solutions Inc.")
                            },
                            {
                                "document_type": "kyc_document", 
                                "document_name": "kyc_verification.pdf",
                                "document_data": self.create_sample_document("kyc_document", "KYC verification documents for Alice Johnson")
                            },
                            {
                                "document_type": "tax_document",
                                "document_name": "tax_certificate.pdf", 
                                "document_data": self.create_sample_document("tax_document", "Tax registration certificate 98-7654321")
                            }
                        ]
                        
                        uploaded_count = 0
                        for doc in documents_to_upload:
                            doc_response = self.session.post(
                                f"{BASE_URL}/partners/{partner_id}/upload-document",
                                json=doc,
                                headers={"Content-Type": "application/json"}
                            )
                            
                            if doc_response.status_code == 200:
                                uploaded_count += 1
                                self.log_result(f"Document Upload ({doc['document_type']})", True, f"Successfully uploaded {doc['document_type']}")
                            else:
                                self.log_result(f"Document Upload ({doc['document_type']})", False, f"Failed to upload {doc['document_type']}: {doc_response.status_code}", doc_response.text)
                        
                        # Verify all 3 documents are in partner's documents array
                        final_partner_response = self.session.get(f"{BASE_URL}/partners/all")
                        if final_partner_response.status_code == 200:
                            final_partners = final_partner_response.json()
                            final_partner = next((p for p in final_partners if p["id"] == partner_id), None)
                            
                            if final_partner:
                                documents = final_partner.get("documents", [])
                                if len(documents) == 3:
                                    self.log_result("Documents Array", True, f"Partner has {len(documents)} documents in array")
                                    
                                    # Verify document types
                                    doc_types = [d.get("document_type") for d in documents]
                                    expected_types = ["business_license", "kyc_document", "tax_document"]
                                    if all(dt in doc_types for dt in expected_types):
                                        self.log_result("Document Types", True, "All required document types present")
                                    else:
                                        self.log_result("Document Types", False, f"Missing document types. Expected: {expected_types}, Got: {doc_types}")
                                else:
                                    self.log_result("Documents Array", False, f"Partner has {len(documents)} documents, expected 3")
                            else:
                                self.log_result("Documents Verification", False, "Partner not found for document verification")
                        
                        return True
                    else:
                        self.log_result("Partner Creation", False, f"Partner status is '{created_partner['status'] if created_partner else 'not found'}', expected 'pending_level1'")
                        return False
                else:
                    self.log_result("Partner Creation", False, f"Failed to retrieve partners: {partner_response.status_code}")
                    return False
            else:
                self.log_result("Partner Creation", False, f"Failed to create partner: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Partner Creation", False, f"Partner creation error: {str(e)}")
            return False
    
    def test_review_and_assign_tier(self):
        """Test 2: Review & Assign Tier"""
        print("\n🔍 Test 2: Review & Assign Tier")
        
        if not self.created_partners:
            self.log_result("Review & Assign Tier", False, "No partner available for review")
            return False
        
        partner_id = self.created_partners[0]
        
        try:
            # Get pending partners for review
            response = self.session.get(f"{BASE_URL}/partners/pending")
            
            if response.status_code == 200:
                pending_partners = response.json()
                test_partner = next((p for p in pending_partners if p["id"] == partner_id), None)
                
                if test_partner:
                    self.log_result("Pending Review Queue", True, f"Partner found in pending review queue")
                    
                    # Update tier using patch endpoint
                    review_data = {
                        "tier": "gold"
                    }
                    
                    review_response = self.session.patch(
                        f"{BASE_URL}/partners/{partner_id}",
                        json=review_data,
                        headers={"Content-Type": "application/json"}
                    )
                    
                    if review_response.status_code == 200:
                        self.log_result("Tier Assignment", True, "Successfully assigned gold tier to partner")
                        
                        # Verify tier was assigned
                        partner_response = self.session.get(f"{BASE_URL}/partners/all")
                        if partner_response.status_code == 200:
                            partners = partner_response.json()
                            updated_partner = next((p for p in partners if p["id"] == partner_id), None)
                            
                            if updated_partner and updated_partner.get("tier") == "gold":
                                self.log_result("Tier Verification", True, "Partner tier successfully updated to gold")
                                return True
                            else:
                                self.log_result("Tier Verification", False, f"Partner tier is '{updated_partner.get('tier') if updated_partner else 'not found'}', expected 'gold'")
                                return False
                        else:
                            self.log_result("Tier Verification", False, f"Failed to retrieve partner for tier verification: {partner_response.status_code}")
                            return False
                    else:
                        self.log_result("Tier Assignment", False, f"Failed to assign tier: {review_response.status_code}", review_response.text)
                        return False
                else:
                    self.log_result("Pending Review Queue", False, "Test partner not found in pending review queue")
                    return False
            else:
                self.log_result("Pending Review Queue", False, f"Failed to get pending partners: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Review & Assign Tier", False, f"Review and tier assignment error: {str(e)}")
            return False
    
    def test_verify_documents_persist(self):
        """Test 3: Verify Documents Persist"""
        print("\n🔍 Test 3: Verify Documents Persist")
        
        if not self.created_partners:
            self.log_result("Documents Persistence", False, "No partner available for document verification")
            return False
        
        partner_id = self.created_partners[0]
        
        try:
            # Get partner portal data
            response = self.session.get(f"{BASE_URL}/partners/{partner_id}/portal")
            
            if response.status_code == 200:
                portal_data = response.json()
                partner = portal_data.get("partner")
                
                if partner:
                    documents = partner.get("documents", [])
                    
                    if len(documents) == 3:
                        self.log_result("Documents Count", True, f"All 3 documents persist in partner portal")
                        
                        # Verify document types match
                        doc_types = [d.get("document_type") for d in documents]
                        expected_types = ["business_license", "kyc_document", "tax_document"]
                        
                        if all(dt in doc_types for dt in expected_types):
                            self.log_result("Document Types Match", True, "All document types match expected types")
                            
                            # Verify document names are correct
                            doc_names = [d.get("document_name") for d in documents]
                            expected_names = ["business_license.pdf", "kyc_verification.pdf", "tax_certificate.pdf"]
                            
                            if all(dn in doc_names for dn in expected_names):
                                self.log_result("Document Names", True, "All document names are correct")
                                return True
                            else:
                                self.log_result("Document Names", False, f"Document names mismatch. Expected: {expected_names}, Got: {doc_names}")
                                return False
                        else:
                            self.log_result("Document Types Match", False, f"Document types mismatch. Expected: {expected_types}, Got: {doc_types}")
                            return False
                    else:
                        self.log_result("Documents Count", False, f"Found {len(documents)} documents, expected 3")
                        return False
                else:
                    self.log_result("Documents Persistence", False, "Partner data not found in portal response")
                    return False
            else:
                self.log_result("Documents Persistence", False, f"Failed to get partner portal: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Documents Persistence", False, f"Document persistence verification error: {str(e)}")
            return False
    
    def test_partner_self_registration_with_documents(self):
        """Test 4: Test Self-Registration with Documents (Partner)"""
        print("\n🔍 Test 4: Test Self-Registration with Documents (Partner)")
        
        # Authenticate as Partner
        if not self.authenticate(PARTNER_CREDENTIALS, "Partner"):
            return False
        
        # Self-registration data
        partner_data = {
            "company_name": "SelfReg Document Corp",
            "contact_person_name": "Bob Wilson",
            "contact_person_email": "bob.wilson@selfreg-doc.com",
            "contact_person_phone": "+1-555-0288",
            "website": "https://selfreg-document.com",
            "business_type": "Document Management",
            "years_in_business": 4,
            "number_of_employees": 20,
            "expected_monthly_volume": "$120,000",
            "user_id": str(uuid.uuid4())  # Simulate partner user ID
        }
        
        try:
            # Self-register partner
            response = self.session.post(
                f"{BASE_URL}/partners/self-register",
                json=partner_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                partner_id = result.get("partner_id")
                
                if partner_id:
                    self.log_result("Partner Self-Registration", True, "Partner successfully self-registered")
                    
                    # Upload 2 documents for self-registered partner
                    documents_to_upload = [
                        {
                            "document_type": "business_license",
                            "document_name": "self_reg_business_license.pdf",
                            "document_data": self.create_sample_document("business_license", "Self-registered business license for SelfReg Document Corp")
                        },
                        {
                            "document_type": "tax_document",
                            "document_name": "self_reg_tax_cert.pdf",
                            "document_data": self.create_sample_document("tax_document", "Self-registered tax certificate")
                        }
                    ]
                    
                    uploaded_count = 0
                    for doc in documents_to_upload:
                        doc_response = self.session.post(
                            f"{BASE_URL}/partners/{partner_id}/upload-document",
                            json=doc,
                            headers={"Content-Type": "application/json"}
                        )
                        
                        if doc_response.status_code == 200:
                            uploaded_count += 1
                            self.log_result(f"Self-Reg Document Upload ({doc['document_type']})", True, f"Successfully uploaded {doc['document_type']}")
                        else:
                            self.log_result(f"Self-Reg Document Upload ({doc['document_type']})", False, f"Failed to upload {doc['document_type']}: {doc_response.status_code}", doc_response.text)
                    
                    # Verify partner was created and documents saved
                    partner_response = self.session.get(f"{BASE_URL}/partners/all")
                    if partner_response.status_code == 200:
                        partners = partner_response.json()
                        self_reg_partner = next((p for p in partners if p["id"] == partner_id), None)
                        
                        if self_reg_partner:
                            self.log_result("Self-Reg Partner Created", True, "Self-registered partner found in system")
                            
                            documents = self_reg_partner.get("documents", [])
                            if len(documents) == 2:
                                self.log_result("Self-Reg Documents Saved", True, f"Both documents saved for self-registered partner")
                                return True
                            else:
                                self.log_result("Self-Reg Documents Saved", False, f"Found {len(documents)} documents, expected 2")
                                return False
                        else:
                            self.log_result("Self-Reg Partner Created", False, "Self-registered partner not found in system")
                            return False
                    else:
                        self.log_result("Self-Reg Verification", False, f"Failed to retrieve partners for verification: {partner_response.status_code}")
                        return False
                else:
                    self.log_result("Partner Self-Registration", False, "No partner_id returned from self-registration")
                    return False
            else:
                self.log_result("Partner Self-Registration", False, f"Failed to self-register partner: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Partner Self-Registration", False, f"Self-registration error: {str(e)}")
            return False
    
    def run_document_upload_tests(self):
        """Run all document upload end-to-end tests"""
        print("🚀 Starting Partner Hub Document Upload End-to-End Tests")
        print("=" * 70)
        
        # Test 1: Create Partner with Documents (PM)
        test1_success = self.test_pm_create_partner_with_documents()
        
        # Test 2: Review & Assign Tier (only if test 1 passed)
        test2_success = False
        if test1_success:
            test2_success = self.test_review_and_assign_tier()
        
        # Test 3: Verify Documents Persist (only if previous tests passed)
        test3_success = False
        if test1_success:  # Can run even if test2 failed
            test3_success = self.test_verify_documents_persist()
        
        # Test 4: Test Self-Registration with Documents (Partner) - independent test
        test4_success = self.test_partner_self_registration_with_documents()
        
        # Summary
        print("\n📊 Document Upload Test Summary:")
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
    tester = DocumentUploadTester()
    results = tester.run_document_upload_tests()
    
    # Save results to file
    with open("/app/document_upload_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Test results saved to: /app/document_upload_test_results.json")

if __name__ == "__main__":
    main()