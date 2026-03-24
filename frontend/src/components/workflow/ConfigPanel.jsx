import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

const ConfigPanel = ({
    isOpen,
    title,
    icon,
    color,
    headerColor,
    onClose,
    children,
    footer
}) => {
    const borderColor = color || headerColor || '#6366f1';

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Always show when rendered (panels are conditionally rendered by parent)
    const panelOpen = isOpen !== undefined ? isOpen : true;

    return (
        <div className={`config-panel ${panelOpen ? 'open' : ''}`}>
            <div className="config-panel-header" style={{ borderColor }}>
                <div className="config-panel-title">
                    {icon && (
                        <div className="config-panel-icon" style={{ backgroundColor: borderColor }}>
                            {typeof icon === 'function' ? React.createElement(icon, { size: 18 }) : icon}
                        </div>
                    )}
                    <h3>{title}</h3>
                </div>
                <button className="config-panel-close" onClick={onClose}>
                    <X size={18} />
                </button>
            </div>

            <div className="config-panel-body">
                {children}
            </div>

            {footer && (
                <div className="config-panel-footer">
                    {footer}
                </div>
            )}
        </div>
    );
};

export default ConfigPanel;
