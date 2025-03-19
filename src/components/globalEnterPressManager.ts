// we need to do it this way because of some annoying issues with the monaco editor
const globalEnterPressManager = {
  shiftEnterCallbacks: [] as (() => void)[],
  ctrlEnterCallbacks: [] as (() => void)[],
  registerShiftEnterCallback: (callback: () => void) => {
    globalEnterPressManager.shiftEnterCallbacks.push(callback);
  },
  registerCtrlEnterCallback: (callback: () => void) => {
    globalEnterPressManager.ctrlEnterCallbacks.push(callback);
  },
  unregisterShiftEnterCallback: (callback: () => void) => {
    globalEnterPressManager.shiftEnterCallbacks =
      globalEnterPressManager.shiftEnterCallbacks.filter(
        (cb) => cb !== callback,
      );
  },
  unregisterCtrlEnterCallback: (callback: () => void) => {
    globalEnterPressManager.ctrlEnterCallbacks =
      globalEnterPressManager.ctrlEnterCallbacks.filter(
        (cb) => cb !== callback,
      );
  },
};
const getGlobalEnterPressManager = () => globalEnterPressManager;

export default getGlobalEnterPressManager;
