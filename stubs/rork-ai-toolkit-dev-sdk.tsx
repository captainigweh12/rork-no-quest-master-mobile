// Stub for @rork-ai/toolkit-dev-sdk
// Provides a simple pass-through wrapper component used in development when the real SDK isn't installed.
import React from 'react';
export const RorkDevWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
