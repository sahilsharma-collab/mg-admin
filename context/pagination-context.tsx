"use client";
import React, { createContext, useContext, useState } from 'react';

interface PaginationContextType {
    page: number;
    limit: number;
    setPage: (page: number) => void;
    setLimit: (limit: number) => void;
    resetPagination: () => void;
}

const PaginationContext = createContext<PaginationContextType | undefined>(undefined);

export const PaginationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    // Optional: Reset to defaults
    const resetPagination = () => {
        setPage(1);
        setLimit(10);
    };

    return (
        <PaginationContext.Provider value={{ page, limit, setPage, setLimit, resetPagination }}>
            {children}
        </PaginationContext.Provider>
    );
};

export const usePagination = () => {
    const context = useContext(PaginationContext);
    if (!context) {
        throw new Error('usePagination must be used within a PaginationProvider');
    }
    return context;
};