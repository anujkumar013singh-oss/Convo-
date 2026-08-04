import { useEffect } from 'react';
import useUiStore from '../store/uiStore';

export default function useMediaQuery() {
  const setIsMobile = useUiStore((s) => s.setIsMobile);
  const setIsTablet = useUiStore((s) => s.setIsTablet);

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');

    const handleMobile = (e) => setIsMobile(e.matches);
    const handleTablet = (e) => setIsTablet(e.matches);

    // Set initial values
    setIsMobile(mobileQuery.matches);
    setIsTablet(tabletQuery.matches);

    mobileQuery.addEventListener('change', handleMobile);
    tabletQuery.addEventListener('change', handleTablet);

    return () => {
      mobileQuery.removeEventListener('change', handleMobile);
      tabletQuery.removeEventListener('change', handleTablet);
    };
  }, [setIsMobile, setIsTablet]);
}
