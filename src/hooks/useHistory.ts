import { useState, useCallback } from 'react';
import { EditorShape, HistoryState } from '../types';

export const useHistory = (initialState: EditorShape[] = []) => {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialState,
    future: [],
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const updateState = useCallback((newState: EditorShape[] | ((prev: EditorShape[]) => EditorShape[])) => {
    setHistory((curr) => {
      const newPresent = typeof newState === 'function' ? newState(curr.present) : newState;
      if (newPresent === curr.present) return curr;
      return {
        past: [...curr.past, curr.present],
        present: newPresent,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((curr) => {
      if (curr.past.length === 0) return curr;
      const previous = curr.past[curr.past.length - 1];
      const newPast = curr.past.slice(0, curr.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [curr.present, ...curr.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((curr) => {
      if (curr.future.length === 0) return curr;
      const next = curr.future[0];
      const newFuture = curr.future.slice(1);
      return {
        past: [...curr.past, curr.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const clearHistory = useCallback((newState: EditorShape[] = []) => {
    setHistory({
      past: [],
      present: newState,
      future: [],
    });
  }, []);

  return {
    state: history.present,
    set: updateState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
};
