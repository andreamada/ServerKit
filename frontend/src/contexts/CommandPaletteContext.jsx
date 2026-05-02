import React, { createContext, useContext, useState, useCallback } from 'react';

const CommandPaletteContext = createContext(null);

export function CommandPaletteProvider({ children }) {
    const [open, setOpen] = useState(false);
    const openPalette = useCallback(() => setOpen(true), []);
    const closePalette = useCallback(() => setOpen(false), []);

    return (
        <CommandPaletteContext.Provider value={{ open, openPalette, closePalette }}>
            {children}
        </CommandPaletteContext.Provider>
    );
}

export function useCommandPalette() {
    return useContext(CommandPaletteContext);
}
