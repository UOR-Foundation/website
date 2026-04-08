import { createContext, useContext } from "react";

const WindowContext = createContext(false);

export const WindowContextProvider = ({ children }: { children: React.ReactNode }) => (
  <WindowContext.Provider value={true}>{children}</WindowContext.Provider>
);

/** Returns true when the component is rendered inside a DesktopWindow. */
export function useIsInsideWindow() {
  return useContext(WindowContext);
}
