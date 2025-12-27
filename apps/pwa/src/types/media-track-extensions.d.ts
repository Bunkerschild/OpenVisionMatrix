interface MediaTrackConstraintSet {
  brightness?: ConstrainDouble;
  contrast?: ConstrainDouble;
  saturation?: ConstrainDouble;
  sharpness?: ConstrainDouble;
  whiteBalanceMode?: ConstrainDOMString;
  colorTemperature?: ConstrainDouble;
  exposureMode?: ConstrainDOMString;
}

interface MediaTrackSettings {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  sharpness?: number;
  whiteBalanceMode?: string;
  colorTemperature?: number;
  exposureMode?: string;
}

interface MediaTrackCapabilities {
  brightness?: MediaSettingsRange;
  contrast?: MediaSettingsRange;
  saturation?: MediaSettingsRange;
  sharpness?: MediaSettingsRange;
  whiteBalanceMode?: string[];
  colorTemperature?: MediaSettingsRange;
  exposureMode?: string[];
}
