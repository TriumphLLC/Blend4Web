var b4w, hljs;
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

// missing in closure compiler https://github.com/google/closure-compiler/issues/806
HTMLLinkElement.prototype.download;
HTMLAreaElement.prototype.download;

// missing WebGL 2.0 stuff
WebGLRenderingContext.RGB8;
WebGLRenderingContext.RGBA8;
WebGLRenderingContext.DEPTH;
WebGLRenderingContext.DEPTH_COMPONENT24;
WebGLRenderingContext.DEPTH_COMPONENT32F;
WebGLRenderingContext.MAX_SAMPLES;
WebGLRenderingContext.READ_FRAMEBUFFER;
WebGLRenderingContext.DRAW_FRAMEBUFFER;
WebGLRenderingContext.blitFramebuffer;
WebGLRenderingContext.renderbufferStorageMultisample;
WebGLRenderingContext.RENDERBUFFER_SAMPLES;
WebGLRenderingContext.drawElementsInstanced;
WebGLRenderingContext.vertexAttribDivisor;
WebGLRenderingContext.drawArraysInstanced;
WebGLRenderingContext.bindVertexArray;
WebGLRenderingContext.createVertexArray;
WebGLRenderingContext.deleteVertexArray;
WebGLRenderingContext.isVertexArray;
WebGLRenderingContext.TEXTURE_COMPARE_MODE;
WebGLRenderingContext.COMPARE_REF_TO_TEXTURE;
WebGLRenderingContext.createQuery;
WebGLRenderingContext.beginQuery;
WebGLRenderingContext.endQuery;
WebGLRenderingContext.getQueryParameter;
WebGLRenderingContext.QUERY_RESULT_AVAILABLE;
WebGLRenderingContext.QUERY_RESULT;
WebGLRenderingContext.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE;

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

var WebGLCompressedTexturePVRTC;
WebGLCompressedTexturePVRTC.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;
WebGLCompressedTexturePVRTC.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;
WebGLCompressedTexturePVRTC.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;
WebGLCompressedTexturePVRTC.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;

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
VREyeParameters.prototype.offset;
VREyeParameters.prototype.fieldOfView;
VREyeParameters.prototype.renderWidth;
VREyeParameters.prototype.renderHeight;
// NOTE: old unused API
// VREyeParameters.prototype.minimumFieldOfView;
// VREyeParameters.prototype.maximumFieldOfView;
// VREyeParameters.prototype.recommendedFieldOfView;
// VREyeParameters.prototype.renderRect;

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


// WebVR API 1.0
// methods
Navigator.prototype.getVRDisplays;
// properties
Navigator.prototype.activeVRDisplays;

var VRDisplay;
// VRDisplay properties
VRDisplay.prototype.isConnected;
VRDisplay.prototype.isPresenting;
VRDisplay.prototype.capabilities;
VRDisplay.prototype.stageParameters;
VRDisplay.prototype.displayId;
VRDisplay.prototype.displayName;
VRDisplay.prototype.depthNear;
VRDisplay.prototype.depthFar;

// VRDisplay methods
VRDisplay.prototype.getEyeParameters;
VRDisplay.prototype.getPose;
VRDisplay.prototype.getImmediatePose;
VRDisplay.prototype.resetPose;
VRDisplay.prototype.requestAnimationFrame;
VRDisplay.prototype.cancelAnimationFrame;
VRDisplay.prototype.requestPresent;
VRDisplay.prototype.exitPresent;
VRDisplay.prototype.getLayers;
VRDisplay.prototype.submitFrame;
VRDisplay.prototype.getFrameData;

var VRLayer;
// VRLayer properties
VRLayer.prototype.source;
VRLayer.prototype.leftBounds;
VRLayer.prototype.rightBounds;

var VRDisplayCapabilities;
// VRDisplayCapabilities properties
VRDisplayCapabilities.prototype.hasPosition;
VRDisplayCapabilities.prototype.hasOrientation;
VRDisplayCapabilities.prototype.hasExternalDisplay;
VRDisplayCapabilities.prototype.canPresent;
VRDisplayCapabilities.prototype.maxLayers;

var VREye;

var VRFieldOfView;
// VRFieldOfView properties
VRFieldOfView.prototype.upDegrees;
VRFieldOfView.prototype.rightDegrees;
VRFieldOfView.prototype.downDegrees;
VRFieldOfView.prototype.leftDegrees;

var VRPose;
// VRPose properties
VRPose.prototype.timestamp;
VRPose.prototype.position;
VRPose.prototype.linearVelocity;
VRPose.prototype.linearAcceleration;
VRPose.prototype.orientation;
VRPose.prototype.angularVelocity;
VRPose.prototype.angularAcceleration;

var VRStageParameters;
// VRStageParameters properties
VRStageParameters.prototype.sittingToStandingTransform;
VRStageParameters.prototype.sizeX;
VRStageParameters.prototype.sizeZ;

var VRFrameData;
window.VRFrameData;
VRFrameData.prototype.leftProjectionMatrix;
VRFrameData.prototype.rightProjectionMatrix;
VRFrameData.prototype.leftViewMatrix;
VRFrameData.prototype.pose;

// indicate touch events.
UIEvent.prototype.sourceCapabilities;
Object.prototype.firesTouchEvents;
Object.prototype.mozInputSource;
Object.prototype.highlight;
