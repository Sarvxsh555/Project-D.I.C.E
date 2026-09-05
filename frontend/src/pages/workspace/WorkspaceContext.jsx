import { createContext, useCallback, useContext, useState } from 'react';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return <WorkspaceContext.Provider value={{ reloadKey, reload }}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
