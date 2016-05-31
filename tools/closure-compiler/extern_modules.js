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
WebGLRenderingContext.RENDERBUFFER_SAMPLES;

// missing extensions stuff
var EXTDisjointTimerQuery;
EXTDisjointTimerQuery.CURRENT_QUERY_EXT;
EXTDisjointTimerQuery.GPU_DISJOINT_EXT;
EXTDisjointTimerQuery.QUERY_COUNTER_BITS_EXT;
EXTDisjointTimerQuery.QUERY_RESULT_AVAILABLE_EXT;
EXTDisjointTimerQuery.QUERY_RESULT_EXT;
EXTDisjointTimerQuery.TIMESTAMP_EXT;
EXTDisjointTimerQuery.TIME_ELAPSED_EXT;
EXTDisjointTimerQuery.beginQueryEXT;
EXTDisjointTimerQuery.createQueryEXT;
EXTDisjointTimerQuery.deleteQueryEXT;
EXTDisjointTimerQuery.endQueryEXT;
EXTDisjointTimerQuery.getQueryEXT;
EXTDisjointTimerQuery.getQueryObjectEXT;
EXTDisjointTimerQuery.isQueryEXT;
EXTDisjointTimerQuery.queryCounterEXT;

// missing WebVR API stuff
Navigator.prototype.getVRDevices;

// missing gamepad API stuff
Navigator.prototype.getGamepads;
Navigator.prototype.webkitGetGamepads;

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
