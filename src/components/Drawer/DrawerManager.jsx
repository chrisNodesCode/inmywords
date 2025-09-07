/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useReducer, useContext } from 'react';

// Context to manage active drawer state
export const DrawerContext = createContext();

const initialState = { activeId: null, props: undefined };

// Map logical drawer types to internal drawer ids and default props
const typeMap = {
  addGroup: { id: 'add-group', props: { type: 'group' } },
  addSubgroup: { id: 'add-group', props: { type: 'subgroup' } },
  editGroup: { id: 'entity-edit', props: { type: 'group' } },
  editSubgroup: { id: 'entity-edit', props: { type: 'subgroup' } },
  editEntry: { id: 'entity-edit', props: { type: 'entry' } },
  editNotebook: { id: 'entity-edit', props: { type: 'notebook' } },
  controller: { id: 'controller', props: { template: 'controller' } },
  editor: { id: 'editor', props: { template: 'editor' } },
};

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
  const openDrawerByType = (type, extraProps = {}) => {
    const config = typeMap[type];
    if (!config) {
      console.warn(`Unknown drawer type: ${type}`);
      return;
    }
    const props = { ...(config.props || {}), ...extraProps };
    openDrawer(config.id, props);
  };
  const closeDrawer = () => dispatch({ type: 'CLOSE' });

  return (
    <DrawerContext.Provider
      value={{ ...state, openDrawer, openDrawerByType, closeDrawer }}
    >
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

export function useDrawerByType() {
  const context = useContext(DrawerContext);
  return context.openDrawerByType;
}

