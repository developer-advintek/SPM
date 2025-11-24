from decimal import Decimal
from typing import List, Dict, Any
from datetime import datetime, timezone

def validate_credit_distribution(assignments: List[Dict[str, Any]]) -> bool:
    """Validate that credit distribution equals 100%."""
    total = sum(Decimal(str(assignment.get('credit_percent', 0))) for assignment in assignments)
    return abs(total - Decimal('100.0000')) < Decimal('0.0001')

def validate_commission_plan_logic(rules: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Validate commission plan rules for circular dependencies and precedence."""
    rule_ids = [rule.get('id') for rule in rules]
    dependencies = {}
    
    for rule in rules:
        dependencies[rule['id']] = []
        if 'depends_on' in rule:
            dependencies[rule['id']].extend(rule['depends_on'])
    
    # Check for circular dependencies using DFS
    def has_cycle(node, visited, rec_stack):
        visited.add(node)
        rec_stack.add(node)
        
        for neighbor in dependencies.get(node, []):
            if neighbor not in visited:
                if has_cycle(neighbor, visited, rec_stack):
                    return True
            elif neighbor in rec_stack:
                return True
        
        rec_stack.remove(node)
        return False
    
    visited = set()
    for rule_id in rule_ids:
        if rule_id not in visited:
            if has_cycle(rule_id, visited, set()):
                return {'valid': False, 'error': 'Circular dependency detected'}
    
    return {'valid': True}

def validate_financial_precision(value: Any) -> Decimal:
    """Ensure financial values use Decimal(19, 4) precision."""
    dec_value = Decimal(str(value))
    # Round to 4 decimal places
    return dec_value.quantize(Decimal('0.0001'))

def calculate_sla_hours(severity: str) -> int:
    """Calculate SLA hours based on ticket severity."""
    sla_map = {
        'critical': 4,
        'high': 24,
        'medium': 48,
        'low': 72
    }
    return sla_map.get(severity, 48)

def check_sla_breach(created_at: datetime, sla_hours: int) -> bool:
    """Check if SLA has been breached."""
    elapsed = datetime.now(timezone.utc) - created_at
    return elapsed.total_seconds() > (sla_hours * 3600)
