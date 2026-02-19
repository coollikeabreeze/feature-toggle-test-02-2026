import React, { useEffect } from "react";
import { useSelector } from "react-redux";

const useReleaseToggle = (
  toggleKey,
  { defaultValue = true, alertIfUnknown = true } = {},
) => {
  const entitlements = useSelector((state) => state.common.entitlements);

  const toggleExists =
    entitlements &&
    Object.prototype.hasOwnProperty.call(entitlements, toggleKey);

  // some kind of alert/log about unknown key after render
  useEffect(() => {
    if (!toggleExists && alertIfUnknown) {
      //some kind of alert/log
    }
  }, [toggleKey, toggleExists, alertIfUnknown]);

  return toggleExists ? entitlements[toggleKey] : defaultValue;
};

export default useReleaseToggle;
