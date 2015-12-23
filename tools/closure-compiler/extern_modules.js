var b4w;
window.b4w;
var GLOBAL;
GLOBAL.b4w;
b4w.module;
b4w.require;
b4w.register;
b4w.module_check;
b4w.get_namespace;
b4w.worker_listeners;
b4w.worker_namespaces;
var $;

// missing in closure compiler https://github.com/google/closure-compiler/issues/806
HTMLLinkElement.prototype.download;
HTMLAreaElement.prototype.download;

// missing WebGL 2.0 stuff
WebGLRenderingContext.RGB8;
WebGLRenderingContext.RGBA8;
WebGLRenderingContext.DEPTH;
WebGLRenderingContext.DEPTH_COMPONENT24;
WebGLRenderingContext.MAX_SAMPLES;
WebGLRenderingContext.READ_FRAMEBUFFER;
WebGLRenderingContext.DRAW_FRAMEBUFFER;
WebGLRenderingContext.blitFramebuffer;
WebGLRenderingContext.renderbufferStorageMultisample;

// missing WebVR API stuff
Navigator.prototype.getVRDevices;

var HMDVRDevice;
// HMDVRDevice properties
// HMDVRDevice.prototype.deviceId;
HMDVRDevice.prototype.deviceName;
HMDVRDevice.prototype.hardwareUnitId;
HMDVRDevice.prototype.getEyeParameters;

var VREyeParameters;
// PositionSensorVRDevice properties
VREyeParameters.prototype.eyeTranslation;
VREyeParameters.prototype.currentFieldOfView;
// VREyeParameters.prototype.minimumFieldOfView;
// VREyeParameters.prototype.maximumFieldOfView;
// VREyeParameters.prototype.recommendedFieldOfView;
// VREyeParameters.prototype.renderRect;

var VRFieldOfView;
VRFieldOfView.prototype.upDegrees;
VRFieldOfView.prototype.rightDegrees;
VRFieldOfView.prototype.downDegrees;
VRFieldOfView.prototype.leftDegrees;

var PositionSensorVRDevice;
// PositionSensorVRDevice properties
// PositionSensorVRDevice.prototype.deviceId;
PositionSensorVRDevice.prototype.hardwareUnitId;
PositionSensorVRDevice.prototype.deviceName;

// PositionSensorVRDevice methods
PositionSensorVRDevice.prototype.getState;
PositionSensorVRDevice.prototype.getImmediateState;
PositionSensorVRDevice.prototype.resetSensor;

var VRPositionState;
// VRPositionState properties
VRPositionState.prototype.position;
VRPositionState.prototype.orientation;
VRPositionState.prototype.angularVelocity;
// VRPositionState.prototype.timeStamp;
// VRPositionState.prototype.hasPosition;
// VRPositionState.prototype.linearVelocity;
// VRPositionState.prototype.linearAcceleration;
// VRPositionState.prototype.hasOrientation;
// VRPositionState.prototype.angularVelocity;
// VRPositionState.prototype.angularAcceleration;
