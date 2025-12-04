#!/usr/bin/env python3
"""
ACCESS CONTROL SYSTEM - COMPLETE TESTING
Testing new Access Control system for custom roles, groups, and permissions
- Admin can create custom roles with specific permissions
- Admin can create groups and assign users to them
- Permissions are categorized and can be assigned to roles and groups
"""

import requests
import json
from datetime import datetime
import uuid

# Configuration
BASE_URL = "https://nexflow-ppm.preview.emergentagent.com"
API_URL = BASE_URL

# Test Credentials
ADMIN_CREDENTIALS = {"email": "admin@test.com", "password": "admin123"}
L1_CREDENTIALS = {"email": "l1@test.com", "password": "l1123"}

class AccessControlTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.l1_token = None
        self.test_results = []
        self.created_roles = []
        self.created_groups = []
        
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
                f"{API_URL}/api/auth/login",
                json=ADMIN_CREDENTIALS,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                self.log_result("Admin Authentication", True, "Successfully authenticated as admin")
                return True
            else:
                self.log_result("Admin Authentication", False, f"Failed: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Authentication", False, f"Error: {str(e)}")
            return False
    
    def authenticate_l1(self):
        """Authenticate as L1 user"""
        try:
            response = requests.post(
                f"{API_URL}/api/auth/login",
                json=L1_CREDENTIALS,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.l1_token = data.get("access_token")
                self.log_result("L1 Authentication", True, "Successfully authenticated as L1")
                return True
            else:
                self.log_result("L1 Authentication", False, f"Failed: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("L1 Authentication", False, f"Error: {str(e)}")
            return False
    
    def get_admin_headers(self):
        """Get headers with admin authorization"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.admin_token}"
        }
    
    def get_l1_headers(self):
        """Get headers with L1 authorization"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.l1_token}"
        }
    
    # ============= TEST 1: GET AVAILABLE PERMISSIONS =============
    
    def test_1_get_available_permissions(self):
        """Test 1: Get Available Permissions"""
        try:
            response = requests.get(
                f"{API_URL}/api/access-control/permissions",
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                permissions = data.get("permissions", [])
                categories = data.get("categories", {})
                
                if permissions and categories:
                    self.log_result("Test 1.2 - Get All Available Permissions", True, 
                                  f"Retrieved {len(permissions)} permissions with {len(categories)} categories")
                    
                    # Verify some expected permissions exist
                    expected_permissions = ["view_dashboard", "create_partners", "approve_l1", "manage_roles"]
                    missing = [p for p in expected_permissions if p not in permissions]
                    
                    if not missing:
                        self.log_result("Test 1.2 - Permission Validation", True, "All expected permissions found")
                    else:
                        self.log_result("Test 1.2 - Permission Validation", False, f"Missing permissions: {missing}")
                    
                    return True
                else:
                    self.log_result("Test 1.2 - Get All Available Permissions", False, "Empty permissions or categories")
            else:
                self.log_result("Test 1.2 - Get All Available Permissions", False, f"Failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Test 1.2 - Get All Available Permissions", False, f"Error: {str(e)}")
        
        return False
    
    # ============= TEST 2: CUSTOM ROLES MANAGEMENT =============
    
    def test_2_1_get_all_roles(self):
        """Test 2.1: Get All Roles (System + Custom)"""
        try:
            response = requests.get(
                f"{API_URL}/api/access-control/roles",
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                system_roles = data.get("system_roles", [])
                custom_roles = data.get("custom_roles", [])
                
                if system_roles:
                    self.log_result("Test 2.1 - Get All Roles", True, 
                                  f"Retrieved {len(system_roles)} system roles and {len(custom_roles)} custom roles")
                    return True
                else:
                    self.log_result("Test 2.1 - Get All Roles", False, "No system roles found")
            else:
                self.log_result("Test 2.1 - Get All Roles", False, f"Failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Test 2.1 - Get All Roles", False, f"Error: {str(e)}")
        
        return False
    
    def test_2_2_create_custom_role(self):
        """Test 2.2: Create Custom Role - Sales Manager"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            role_data = {
                "name": f"Sales Manager {timestamp}",
                "description": "Manages sales and commission workflows",
                "permissions": [
                    "view_sales",
                    "create_sales",
                    "edit_sales",
                    "view_products",
                    "view_partners",
                    "approve_commissions"
                ]
            }
            
            response = requests.post(
                f"{API_URL}/api/access-control/roles",
                json=role_data,
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                role_id = data.get("role_id")
                if role_id:
                    self.created_roles.append(role_id)
                    self.log_result("Test 2.2 - Create Custom Role", True, f"Sales Manager role created with ID: {role_id}")
                    return role_id
                else:
                    self.log_result("Test 2.2 - Create Custom Role", False, "No role_id returned")
            else:
                self.log_result("Test 2.2 - Create Custom Role", False, f"Failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Test 2.2 - Create Custom Role", False, f"Error: {str(e)}")
        
        return None
    
    def test_2_3_create_finance_role(self):
        """Test 2.3: Create Another Custom Role - Finance Manager"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            role_data = {
                "name": f"Finance Manager {timestamp}",
                "description": "Handles financial operations and payouts",
                "permissions": [
                    "view_sales",
                    "approve_commissions",
                    "process_payouts",
                    "view_reports",
                    "export_reports"
                ]
            }
            
            response = requests.post(
                f"{API_URL}/api/access-control/roles",
                json=role_data,
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                role_id = data.get("role_id")
                if role_id:
                    self.created_roles.append(role_id)
                    self.log_result("Test 2.3 - Create Finance Role", True, f"Finance Manager role created with ID: {role_id}")
                    return role_id
                else:
                    self.log_result("Test 2.3 - Create Finance Role", False, "No role_id returned")
            else:
                self.log_result("Test 2.3 - Create Finance Role", False, f"Failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Test 2.3 - Create Finance Role", False, f"Error: {str(e)}")
        
        return None
    
    def test_2_4_update_custom_role(self, role_id):
        """Test 2.4: Update Custom Role"""
        if not role_id:
            self.log_result("Test 2.4 - Update Custom Role", False, "No role ID available")
            return False
            
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            update_data = {
                "name": f"Sales Manager Updated {timestamp}",
                "description": "Manages sales, commissions, and partner relationships",
                "permissions": [
                    "view_sales",
                    "create_sales",
                    "edit_sales",
                    "view_products",
                    "view_partners",
                    "create_partners",
                    "approve_commissions",
                    "view_reports"
                ]
            }
            
            response = requests.put(
                f"{API_URL}/api/access-control/roles/{role_id}",
                json=update_data,
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 200:
                self.log_result("Test 2.4 - Update Custom Role", True, "Role updated with additional permissions")
                return True
            else:
                self.log_result("Test 2.4 - Update Custom Role", False, f"Failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Test 2.4 - Update Custom Role", False, f"Error: {str(e)}")
        
        return False
    
    def test_2_5_delete_role_check(self, role_id):
        """Test 2.5: Try to Delete Role (Should Fail if Users Assigned)"""
        if not role_id:
            self.log_result("Test 2.5 - Delete Role Check", False, "No role ID available")
            return False
            
        try:
            response = requests.delete(
                f"{API_URL}/api/access-control/roles/{role_id}",
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 200:
                self.log_result("Test 2.5 - Delete Role Check", True, "Role deleted successfully (no users assigned)")
                # Remove from created_roles since it's deleted
                if role_id in self.created_roles:
                    self.created_roles.remove(role_id)
                return True
            elif response.status_code == 400:
                self.log_result("Test 2.5 - Delete Role Check", True, "Role deletion blocked - users assigned (expected)")
                return True
            else:
                self.log_result("Test 2.5 - Delete Role Check", False, f"Unexpected response: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Test 2.5 - Delete Role Check", False, f"Error: {str(e)}")
        
        return False
    
    # ============= TEST 3: CUSTOM GROUPS MANAGEMENT =============
    
    def test_3_1_create_sales_group(self):
        """Test 3.1: Create Custom Group - Sales Team"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            group_data = {
                "name": f"Sales Team {timestamp}",
                "description": "All sales representatives and managers",
                "permissions": [
                    "view_sales",
                    "create_sales",
                    "view_products",
                    "view_partners"
                ],
                "user_ids": []
            }
            
            response = requests.post(
                f"{API_URL}/api/access-control/groups",
                json=group_data,
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                group_id = data.get("group_id")
                if group_id:
                    self.created_groups.append(group_id)
                    self.log_result("Test 3.1 - Create Sales Group", True, f"Sales Team group created with ID: {group_id}")
                    return group_id
                else:
                    self.log_result("Test 3.1 - Create Sales Group", False, "No group_id returned")
            else:
                self.log_result("Test 3.1 - Create Sales Group", False, f"Failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Test 3.1 - Create Sales Group", False, f"Error: {str(e)}")
        
        return None
    
    def test_3_2_create_finance_group(self):
        """Test 3.2: Create Finance Group"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            group_data = {
                "name": f"Finance Team {timestamp}",
                "description": "Financial operations team",
                "permissions": [
                    "approve_commissions",
                    "process_payouts",
                    "view_reports",
                    "export_reports"
                ],
                "user_ids": []
            }
            
            response = requests.post(
                f"{API_URL}/api/access-control/groups",
                json=group_data,
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                group_id = data.get("group_id")
                if group_id:
                    self.created_groups.append(group_id)
                    self.log_result("Test 3.2 - Create Finance Group", True, f"Finance Team group created with ID: {group_id}")
                    return group_id
                else:
                    self.log_result("Test 3.2 - Create Finance Group", False, "No group_id returned")
            else:
                self.log_result("Test 3.2 - Create Finance Group", False, f"Failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Test 3.2 - Create Finance Group", False, f"Error: {str(e)}")
        
        return None
    
    def test_3_3_get_all_groups(self):
        """Test 3.3: Get All Groups"""
        try:
            response = requests.get(
                f"{API_URL}/api/access-control/groups",
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                groups = data.get("groups", [])
                total = data.get("total", 0)
                
                if groups:
                    self.log_result("Test 3.3 - Get All Groups", True, f"Retrieved {total} groups")
                    return True
                else:
                    self.log_result("Test 3.3 - Get All Groups", False, "No groups found")
            else:
                self.log_result("Test 3.3 - Get All Groups", False, f"Failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Test 3.3 - Get All Groups", False, f"Error: {str(e)}")
        
        return False
    
    def test_3_4_update_group(self, group_id):
        """Test 3.4: Update Group"""
        if not group_id:
            self.log_result("Test 3.4 - Update Group", False, "No group ID available")
            return False
            
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            update_data = {
                "name": f"Sales & Marketing Team {timestamp}",
                "description": "Sales representatives, managers, and marketing staff",
                "permissions": [
                    "view_sales",
                    "create_sales",
                    "view_products",
                    "view_partners",
                    "view_spiffs",
                    "view_dashboard"
                ],
                "user_ids": []
            }
            
            response = requests.put(
                f"{API_URL}/api/access-control/groups/{group_id}",
                json=update_data,
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 200:
                self.log_result("Test 3.4 - Update Group", True, "Group updated successfully")
                return True
            else:
                self.log_result("Test 3.4 - Update Group", False, f"Failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Test 3.4 - Update Group", False, f"Error: {str(e)}")
        
        return False
    
    def test_3_5_delete_group(self, group_id):
        """Test 3.5: Delete Group"""
        if not group_id:
            self.log_result("Test 3.5 - Delete Group", False, "No group ID available")
            return False
            
        try:
            response = requests.delete(
                f"{API_URL}/api/access-control/groups/{group_id}",
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 200:
                self.log_result("Test 3.5 - Delete Group", True, "Group deleted successfully")
                # Remove from created_groups since it's deleted
                if group_id in self.created_groups:
                    self.created_groups.remove(group_id)
                return True
            else:
                self.log_result("Test 3.5 - Delete Group", False, f"Failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Test 3.5 - Delete Group", False, f"Error: {str(e)}")
        
        return False
    
    # ============= TEST 4: USER PERMISSIONS RETRIEVAL =============
    
    def test_4_1_get_admin_permissions(self):
        """Test 4.1: Get Admin User Permissions"""
        try:
            # First get admin user ID
            users_response = requests.get(
                f"{API_URL}/api/users",
                headers=self.get_admin_headers()
            )
            
            if users_response.status_code == 200:
                users = users_response.json()
                admin_user = next((u for u in users if u.get('email') == 'admin@test.com'), None)
                
                if admin_user:
                    admin_user_id = admin_user['id']
                    
                    # Get permissions
                    perm_response = requests.get(
                        f"{API_URL}/api/access-control/users/{admin_user_id}/permissions",
                        headers=self.get_admin_headers()
                    )
                    
                    if perm_response.status_code == 200:
                        data = perm_response.json()
                        permissions = data.get("permissions", [])
                        role = data.get("role")
                        
                        if permissions and role == "admin":
                            self.log_result("Test 4.1 - Get Admin Permissions", True, 
                                          f"Admin has {len(permissions)} permissions (role: {role})")
                            return True
                        else:
                            self.log_result("Test 4.1 - Get Admin Permissions", False, "No permissions or incorrect role")
                    else:
                        self.log_result("Test 4.1 - Get Admin Permissions", False, f"Failed to get permissions: {perm_response.status_code}")
                else:
                    self.log_result("Test 4.1 - Get Admin Permissions", False, "Admin user not found")
            else:
                self.log_result("Test 4.1 - Get Admin Permissions", False, f"Failed to get users: {users_response.status_code}")
                
        except Exception as e:
            self.log_result("Test 4.1 - Get Admin Permissions", False, f"Error: {str(e)}")
        
        return False
    
    # ============= TEST 5: VALIDATION TESTS =============
    
    def test_5_1_duplicate_role_name(self):
        """Test 5.1: Try to Create Duplicate Role Name"""
        try:
            role_data = {
                "name": "Sales Manager",  # This should already exist
                "description": "Duplicate",
                "permissions": []
            }
            
            response = requests.post(
                f"{API_URL}/api/access-control/roles",
                json=role_data,
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 400:
                error_data = response.json()
                if "already exists" in error_data.get("detail", "").lower():
                    self.log_result("Test 5.1 - Duplicate Role Name", True, "400 Bad Request - Role name already exists")
                    return True
                else:
                    self.log_result("Test 5.1 - Duplicate Role Name", False, f"Wrong error message: {error_data}")
            else:
                self.log_result("Test 5.1 - Duplicate Role Name", False, f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Test 5.1 - Duplicate Role Name", False, f"Error: {str(e)}")
        
        return False
    
    def test_5_2_duplicate_group_name(self):
        """Test 5.2: Try to Create Duplicate Group Name"""
        try:
            group_data = {
                "name": "Sales Team",  # This should already exist
                "description": "Duplicate",
                "permissions": [],
                "user_ids": []
            }
            
            response = requests.post(
                f"{API_URL}/api/access-control/groups",
                json=group_data,
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 400:
                error_data = response.json()
                if "already exists" in error_data.get("detail", "").lower():
                    self.log_result("Test 5.2 - Duplicate Group Name", True, "400 Bad Request - Group name already exists")
                    return True
                else:
                    self.log_result("Test 5.2 - Duplicate Group Name", False, f"Wrong error message: {error_data}")
            else:
                self.log_result("Test 5.2 - Duplicate Group Name", False, f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Test 5.2 - Duplicate Group Name", False, f"Error: {str(e)}")
        
        return False
    
    def test_5_3_non_admin_access(self):
        """Test 5.3: Try Access as Non-Admin (Should Fail)"""
        if not self.l1_token:
            self.log_result("Test 5.3 - Non-Admin Access", False, "L1 token not available")
            return False
            
        try:
            # Try to get roles as L1 user
            response = requests.get(
                f"{API_URL}/api/access-control/roles",
                headers=self.get_l1_headers()
            )
            
            if response.status_code == 403:
                error_data = response.json()
                if "admin access required" in error_data.get("detail", "").lower():
                    self.log_result("Test 5.3 - Non-Admin Access", True, "403 Forbidden - Admin access required")
                    return True
                else:
                    self.log_result("Test 5.3 - Non-Admin Access", False, f"Wrong error message: {error_data}")
            else:
                self.log_result("Test 5.3 - Non-Admin Access", False, f"Expected 403, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Test 5.3 - Non-Admin Access", False, f"Error: {str(e)}")
        
        return False
    
    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete created roles
        for role_id in self.created_roles:
            try:
                response = requests.delete(
                    f"{API_URL}/api/access-control/roles/{role_id}",
                    headers=self.get_admin_headers()
                )
                if response.status_code == 200:
                    print(f"✅ Deleted role: {role_id}")
                else:
                    print(f"❌ Failed to delete role: {role_id}")
            except:
                print(f"❌ Error deleting role: {role_id}")
        
        # Delete created groups
        for group_id in self.created_groups:
            try:
                response = requests.delete(
                    f"{API_URL}/api/access-control/groups/{group_id}",
                    headers=self.get_admin_headers()
                )
                if response.status_code == 200:
                    print(f"✅ Deleted group: {group_id}")
                else:
                    print(f"❌ Failed to delete group: {group_id}")
            except:
                print(f"❌ Error deleting group: {group_id}")
    
    def run_all_tests(self):
        """Run all access control tests"""
        print("🚀 ACCESS CONTROL SYSTEM - COMPLETE TESTING")
        print("=" * 60)
        print("Testing new Access Control system for custom roles, groups, and permissions")
        print("- Admin can create custom roles with specific permissions")
        print("- Admin can create groups and assign users to them")
        print("- Permissions are categorized and can be assigned to roles and groups")
        print("=" * 60)
        
        # Step 1: Authentication
        print("\n🔐 Authentication:")
        print("-" * 40)
        
        if not self.authenticate_admin():
            print("❌ Admin authentication failed. Cannot proceed.")
            return self.test_results
        
        if not self.authenticate_l1():
            print("⚠️ L1 authentication failed. Some tests will be skipped.")
        
        # Step 2: Test 1 - Get Available Permissions
        print("\n### Test 1: Get Available Permissions")
        self.test_1_get_available_permissions()
        
        # Step 3: Test 2 - Custom Roles Management
        print("\n### Test 2: Custom Roles Management")
        self.test_2_1_get_all_roles()
        sales_role_id = self.test_2_2_create_custom_role()
        finance_role_id = self.test_2_3_create_finance_role()
        self.test_2_4_update_custom_role(sales_role_id)
        self.test_2_5_delete_role_check(finance_role_id)
        
        # Step 4: Test 3 - Custom Groups Management
        print("\n### Test 3: Custom Groups Management")
        sales_group_id = self.test_3_1_create_sales_group()
        finance_group_id = self.test_3_2_create_finance_group()
        self.test_3_3_get_all_groups()
        self.test_3_4_update_group(sales_group_id)
        self.test_3_5_delete_group(finance_group_id)
        
        # Step 5: Test 4 - User Permissions Retrieval
        print("\n### Test 4: User Permissions Retrieval")
        self.test_4_1_get_admin_permissions()
        
        # Step 6: Test 5 - Validation Tests
        print("\n### Test 5: Validation Tests")
        self.test_5_1_duplicate_role_name()
        self.test_5_2_duplicate_group_name()
        self.test_5_3_non_admin_access()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Summary
        print("\n📊 TEST SUMMARY:")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if r["success"])
        failed = len(self.test_results) - passed
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        print("\n✅ SUCCESSFUL TESTS:")
        for result in self.test_results:
            if result["success"]:
                print(f"  - {result['test']}: {result['message']}")
        
        return self.test_results

def main():
    """Main test execution"""
    tester = AccessControlTester()
    results = tester.run_all_tests()
    
    # Save results to file
    with open("/app/access_control_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Test results saved to: /app/access_control_test_results.json")

if __name__ == "__main__":
    main()