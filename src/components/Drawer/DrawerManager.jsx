/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useReducer, useContext } from 'react';

// Context to manage active drawer state
export const DrawerContext = createContext();

const initialState = { activeId: null, props: undefined };

function reducer(state, action) {
  switch (action.type) {
    case 'OPEN':
      return { activeId: action.id, props: action.props };
    case 'CLOSE':
      return { activeId: null, props: undefined };
    default:
      return state;
  }
}

export default function DrawerManager({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const openDrawer = (id, props) => dispatch({ type: 'OPEN', id, props });
  const closeDrawer = () => dispatch({ type: 'CLOSE' });

  return (
    <DrawerContext.Provider value={{ ...state, openDrawer, closeDrawer }}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer(id) {
  const context = useContext(DrawerContext);
  const open = context.activeId === id;
  const openDrawerWithId = (props) => context.openDrawer(id, props);

  return {
    open,
    props: context.props,
    openDrawer: openDrawerWithId,
    closeDrawer: context.closeDrawer,
  };
}

