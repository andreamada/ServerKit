from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import PricingPlan
from app.middleware.rbac import admin_required
import json

pricing_plans_bp = Blueprint('pricing_plans', __name__)

@pricing_plans_bp.route('', methods=['GET'])
@jwt_required()
def list_plans():
    """List all pricing plans."""
    plans = PricingPlan.query.order_by(PricingPlan.price_monthly.asc()).all()
    return jsonify({
        'plans': [plan.to_dict() for plan in plans]
    }), 200

@pricing_plans_bp.route('', methods=['POST'])
@admin_required
def create_plan():
    """Create a new pricing plan."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    name = data.get('name')
    price_monthly = data.get('price_monthly')
    price_yearly = data.get('price_yearly')
    
    if not name:
        return jsonify({'error': 'Plan name is required'}), 400
    
    if price_monthly is None and price_yearly is None:
        return jsonify({'error': 'At least one price (monthly or yearly) must be provided'}), 400

    plan = PricingPlan(
        name=name,
        description=data.get('description'),
        price_monthly=float(price_monthly) if price_monthly is not None else None,
        price_yearly=float(price_yearly) if price_yearly is not None else None,
        max_sites=int(data.get('max_sites', 1)),
        has_backups=data.get('has_backups', False),
        is_active=data.get('is_active', True)
    )
    
    if 'resource_specs' in data:
        plan.resource_specs = data['resource_specs']

    db.session.add(plan)
    db.session.commit()

    return jsonify({
        'message': 'Pricing plan created successfully',
        'plan': plan.to_dict()
    }), 201

@pricing_plans_bp.route('/<int:plan_id>', methods=['GET'])
@jwt_required()
def get_plan(plan_id):
    """Get a specific pricing plan."""
    plan = PricingPlan.query.get(plan_id)
    if not plan:
        return jsonify({'error': 'Pricing plan not found'}), 404
    return jsonify({'plan': plan.to_dict()}), 200

@pricing_plans_bp.route('/<int:plan_id>', methods=['PUT'])
@admin_required
def update_plan(plan_id):
    """Update a pricing plan."""
    plan = PricingPlan.query.get(plan_id)
    if not plan:
        return jsonify({'error': 'Pricing plan not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    if 'name' in data:
        plan.name = data['name']
    if 'description' in data:
        plan.description = data['description']
    if 'price_monthly' in data:
        val = data['price_monthly']
        plan.price_monthly = float(val) if val is not None else None
    if 'price_yearly' in data:
        val = data['price_yearly']
        plan.price_yearly = float(val) if val is not None else None
    if 'max_sites' in data:
        plan.max_sites = int(data['max_sites'])
    if 'has_backups' in data:
        plan.has_backups = data['has_backups']
    if 'is_active' in data:
        plan.is_active = data['is_active']
    if 'resource_specs' in data:
        plan.resource_specs = data['resource_specs']

    db.session.commit()

    return jsonify({
        'message': 'Pricing plan updated successfully',
        'plan': plan.to_dict()
    }), 200

@pricing_plans_bp.route('/<int:plan_id>', methods=['DELETE'])
@admin_required
def delete_plan(plan_id):
    """Delete a pricing plan."""
    plan = PricingPlan.query.get(plan_id)
    if not plan:
        return jsonify({'error': 'Pricing plan not found'}), 404

    db.session.delete(plan)
    db.session.commit()

    return jsonify({
        'message': 'Pricing plan deleted successfully'
    }), 200
