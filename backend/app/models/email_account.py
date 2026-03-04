from datetime import datetime
from app import db


class EmailAccount(db.Model):
    __tablename__ = 'email_accounts'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    domain = db.Column(db.String(255), nullable=False)
    username = db.Column(db.String(100), nullable=False)
    quota_mb = db.Column(db.Integer, default=1024)
    enabled = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Forwarding
    forward_to = db.Column(db.Text, nullable=True)  # comma-separated addresses
    forward_keep_copy = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'domain': self.domain,
            'username': self.username,
            'quota_mb': self.quota_mb,
            'enabled': self.enabled,
            'forward_to': self.forward_to,
            'forward_keep_copy': self.forward_keep_copy,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<EmailAccount {self.email}>'
