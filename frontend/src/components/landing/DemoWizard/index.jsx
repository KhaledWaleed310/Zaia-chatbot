import { createContext, useContext, useReducer, useCallback } from 'react';
import { DemoWizardDialog } from './DemoWizardDialog';
import { DEMO_WIZARD_STEPS, INITIAL_DEMO_STATE } from './constants';

// Context
const DemoWizardContext = createContext(null);

// Action types
const ACTIONS = {
  NEXT_STEP: 'NEXT_STEP',
  PREV_STEP: 'PREV_STEP',
  GO_TO_STEP: 'GO_TO_STEP',
  UPDATE_DATA: 'UPDATE_DATA',
  RESET: 'RESET'
};

// Reducer
function wizardReducer(state, action) {
  switch (action.type) {
    case ACTIONS.NEXT_STEP:
      if (state.currentStep >= DEMO_WIZARD_STEPS.length - 1) return state;
      return {
        ...state,
        currentStep: state.currentStep + 1,
        direction: 1
      };
    case ACTIONS.PREV_STEP:
      if (state.currentStep <= 0) return state;
      return {
        ...state,
        currentStep: state.currentStep - 1,
        direction: -1
      };
    case ACTIONS.GO_TO_STEP:
      return {
        ...state,
        currentStep: action.payload,
        direction: action.payload > state.currentStep ? 1 : -1
      };
    case ACTIONS.UPDATE_DATA:
      return {
        ...state,
        demoData: {
          ...state.demoData,
          ...action.payload
        }
      };
    case ACTIONS.RESET:
      return INITIAL_DEMO_STATE;
    default:
      return state;
  }
}

// Custom hook to use wizard context
export const useDemoWizard = () => {
  const context = useContext(DemoWizardContext);
  if (!context) {
    throw new Error('useDemoWizard must be used within DemoWizardProvider');
  }
  return context;
};

// Main component
export const DemoWizard = ({ isOpen, onClose }) => {
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_DEMO_STATE);

  const nextStep = useCallback(() => {
    dispatch({ type: ACTIONS.NEXT_STEP });
  }, []);

  const prevStep = useCallback(() => {
    dispatch({ type: ACTIONS.PREV_STEP });
  }, []);

  const goToStep = useCallback((index) => {
    dispatch({ type: ACTIONS.GO_TO_STEP, payload: index });
  }, []);

  const updateData = useCallback((data) => {
    dispatch({ type: ACTIONS.UPDATE_DATA, payload: data });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: ACTIONS.RESET });
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const contextValue = {
    ...state,
    steps: DEMO_WIZARD_STEPS,
    currentStepData: DEMO_WIZARD_STEPS[state.currentStep],
    totalSteps: DEMO_WIZARD_STEPS.length,
    isFirstStep: state.currentStep === 0,
    isLastStep: state.currentStep === DEMO_WIZARD_STEPS.length - 1,
    nextStep,
    prevStep,
    goToStep,
    updateData,
    reset,
    onClose: handleClose
  };

  return (
    <DemoWizardContext.Provider value={contextValue}>
      <DemoWizardDialog isOpen={isOpen} />
    </DemoWizardContext.Provider>
  );
};

export default DemoWizard;
