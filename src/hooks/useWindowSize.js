import { useState, useEffect } from "react";

function useWindowSize() {
  const [windowSize, setWindowSize] = useState();

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    // Set initial size on mount
    handleResize();

    // Listen for window resize events
    window.addEventListener("resize", handleResize);

    // Cleanup listener on unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures effect runs only once on mount

  return windowSize;
}

export default useWindowSize;
