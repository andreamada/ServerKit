from datetime import datetime
from app import db
import json

class PricingPlan(db.Model):
    """Pricing plans for SaaS container deployments."""
    __tablename__ = 'pricing_plans'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    
    # Pricing
    price_monthly = db.Column(db.Float, nullable=True)
    price_yearly = db.Column(db.Float, nullable=True)
    
    # Limits
    max_sites = db.Column(db.Integer, default=1)  # Limit number of sites
    
    # Resource specs (JSON)
    # { "cpu": "0.5", "memory": "512MB", "disk": "10GB" }
    resource_specs_json = db.Column(db.Text)
    
    # Features
    has_backups = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def resource_specs(self):
        return json.loads(self.resource_specs_json) if self.resource_specs_json else {}

    @resource_specs.setter
    def resource_specs(self, v):
        self.resource_specs_json = json.dumps(v)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price_monthly': self.price_monthly,
            'price_yearly': self.price_yearly,
            'max_sites': self.max_sites,
            'resource_specs': self.resource_specs,
            'has_backups': self.has_backups,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<PricingPlan {self.name}>'
