import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Hook to set the page title
 * @param {string} title - The page title (will be appended with brand name)
 */
export function usePageTitle(title) {
    const { whiteLabel } = useTheme();
    const brandName = (whiteLabel?.enabled && whiteLabel?.brandName) ? whiteLabel.brandName : 'ServerKit';

    useEffect(() => {
        const previousTitle = document.title;
        document.title = title ? `${title} | ${brandName}` : brandName;

        return () => {
            document.title = previousTitle;
        };
    }, [title, brandName]);
}

export default usePageTitle;
