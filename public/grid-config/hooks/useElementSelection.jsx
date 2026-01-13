import { useState, useCallback } from 'react';

export const useElementSelection = () => {
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);

  const selectElement = useCallback((elementType, cardIndex = null) => {
    setSelectedElement(elementType);
    setSelectedCardIndex(cardIndex);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedElement(null);
    setSelectedCardIndex(null);
  }, []);

  const isSelected = useCallback((elementType, cardIndex = null) => {
    if (cardIndex !== null) {
      return selectedElement === elementType && selectedCardIndex === cardIndex;
    }
    return selectedElement === elementType;
  }, [selectedElement, selectedCardIndex]);

  return {
    selectedElement,
    selectedCardIndex,
    selectElement,
    clearSelection,
    isSelected
  };
};

export default useElementSelection;
