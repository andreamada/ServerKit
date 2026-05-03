import { useState, useCallback, useRef } from 'react';

export function useConfirm() {
    const resolveRef = useRef(null);
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        variant: 'danger',
    });

    const confirm = useCallback(({
        title = 'Confirm Action',
        message = 'Are you sure you want to proceed?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        variant = 'danger'
    } = {}) => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setConfirmState({
                isOpen: true,
                title,
                message,
                confirmText,
                cancelText,
                variant,
            });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        resolveRef.current?.(true);
        resolveRef.current = null;
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleCancel = useCallback(() => {
        resolveRef.current?.(false);
        resolveRef.current = null;
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    }, []);

    return {
        confirm,
        confirmState,
        handleConfirm,
        handleCancel
    };
}

export default useConfirm;
