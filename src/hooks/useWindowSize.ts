import { useState, useEffect } from "react";

type WindowSize = {
  width: number;
  height: number;
};

function useWindowSize() {
  const [windowSize, setWindowSize] = useState<WindowSize | undefined>();

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}

export default useWindowSize;
