import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MasterDataContextType {
  showOfficeManager: boolean;
  showPositionManager: boolean;
  openOfficeManager: () => void;
  closeOfficeManager: () => void;
  openPositionManager: () => void;
  closePositionManager: () => void;
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export const useMasterData = () => {
  const context = useContext(MasterDataContext);
  if (!context) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
};

interface MasterDataProviderProps {
  children: ReactNode;
}

export const MasterDataProvider: React.FC<MasterDataProviderProps> = ({ children }) => {
  const [showOfficeManager, setShowOfficeManager] = useState(false);
  const [showPositionManager, setShowPositionManager] = useState(false);

  const openOfficeManager = () => setShowOfficeManager(true);
  const closeOfficeManager = () => setShowOfficeManager(false);
  const openPositionManager = () => setShowPositionManager(true);
  const closePositionManager = () => setShowPositionManager(false);

  const value: MasterDataContextType = {
    showOfficeManager,
    showPositionManager,
    openOfficeManager,
    closeOfficeManager,
    openPositionManager,
    closePositionManager,
  };

  return (
    <MasterDataContext.Provider value={value}>
      {children}
    </MasterDataContext.Provider>
  );
};
