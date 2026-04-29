import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
    icon: Icon = Inbox,
    title = 'No items found',
    description = '',
    action = null
}) {
    return (
        <div className="empty-state">
            <div className="empty-state__icon">
                <Icon size={48} />
            </div>
            <h3 className="empty-state__title">{title}</h3>
            {description && (
                <p className="empty-state__description">{description}</p>
            )}
            {action && (
                <div className="empty-state__action">{action}</div>
            )}
        </div>
    );
}
