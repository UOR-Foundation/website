import { createContext, useContext } from "react";

interface WindowContextValue {
  insideWindow: boolean;
  initialQuery?: string;
}

const WindowContext = createContext<WindowContextValue>({ insideWindow: false });

export const WindowContextProvider = ({
  children,
  initialQuery,
}: {
  children: React.ReactNode;
  initialQuery?: string;
}) => (
  <WindowContext.Provider value={{ insideWindow: true, initialQuery }}>
    {children}
  </WindowContext.Provider>
);

/** Returns true when the component is rendered inside a DesktopWindow. */
export function useIsInsideWindow() {
  return useContext(WindowContext).insideWindow;
}

/** Returns the initial query passed to the window when it was opened. */
export function useWindowInitialQuery() {
  return useContext(WindowContext).initialQuery;
}
