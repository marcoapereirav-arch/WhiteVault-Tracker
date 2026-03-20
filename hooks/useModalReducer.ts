import { useReducer } from 'react';
import { Subscription, Category } from '../types';

export interface ModalState {
  activeModal: string | null;
  selectedSubscription: Subscription | undefined;
  selectedCategory: Category | undefined;
  contextToDelete: string | null;
  showPasswordModal: boolean;
}

export type ModalAction =
  | { type: 'OPEN_MODAL'; modal: string }
  | { type: 'OPEN_EDIT_SUBSCRIPTION'; subscription: Subscription }
  | { type: 'OPEN_EDIT_CATEGORY'; category: Category }
  | { type: 'OPEN_NEW_CATEGORY' }
  | { type: 'OPEN_NEW_SUBSCRIPTION' }
  | { type: 'CLOSE_MODAL' }
  | { type: 'SET_CONTEXT_TO_DELETE'; contextId: string | null }
  | { type: 'SET_PASSWORD_MODAL'; show: boolean };

const initialModalState: ModalState = {
  activeModal: null,
  selectedSubscription: undefined,
  selectedCategory: undefined,
  contextToDelete: null,
  showPasswordModal: false,
};

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'OPEN_MODAL':
      return { ...state, activeModal: action.modal };

    case 'OPEN_EDIT_SUBSCRIPTION':
      return { ...state, activeModal: 'EDIT_SUBSCRIPTION', selectedSubscription: action.subscription };

    case 'OPEN_EDIT_CATEGORY':
      return { ...state, activeModal: 'EDIT_CATEGORY', selectedCategory: action.category };

    case 'OPEN_NEW_CATEGORY':
      return { ...state, activeModal: 'CATEGORY', selectedCategory: undefined };

    case 'OPEN_NEW_SUBSCRIPTION':
      return { ...state, activeModal: 'SUBSCRIPTION', selectedSubscription: undefined };

    case 'CLOSE_MODAL':
      return { ...state, activeModal: null, selectedSubscription: undefined, selectedCategory: undefined };

    case 'SET_CONTEXT_TO_DELETE':
      return { ...state, contextToDelete: action.contextId };

    case 'SET_PASSWORD_MODAL':
      return { ...state, showPasswordModal: action.show };

    default:
      return state;
  }
}

export function useModalReducer() {
  const [modalState, dispatchModal] = useReducer(modalReducer, initialModalState);
  return { modalState, dispatchModal };
}
