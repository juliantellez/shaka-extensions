# Dynamic Timeouts (Shaka Plugin RFC)

Title: Shaka Plugin Dynamic Timeouts
Date: 16th of March 2023
Status: SUBMITTED
Author: Julian Tellez

- [Dynamic Timeouts (Shaka Plugin RFC)](#dynamic-timeouts-shaka-plugin-rfc)
  - [Introduction](#introduction)
  - [Timeouts](#timeouts)
    - [1. Manifest Request Timeout](#1-manifest-request-timeout)
    - [2. Segment Request Timeout](#2-segment-request-timeout)
    - [3. License Request Timeout](#3-license-request-timeout)
    - [4. Initialisation Timeout](#4-initialisation-timeout)
    - [5. Buffering Timeout](#5-buffering-timeout)
    - [6. Seeking Timeout](#6-seeking-timeout)
  - [Goal](#goal)
  - [Requirements](#requirements)
  - [Design](#design)
    - [API and Integration](#api-and-integration)
  - [References](#references)

## Introduction

Timeouts can occur if the player is unable to perform an action or receive data from the server within a specified time. This RFC will explore the various types of timeouts the Shaka Player can experience and propose an implementation to dynamically configure them.

## Timeouts

### 1. Manifest Request Timeout
A manifest file contains information about the media content, such as video and audio tracks, bitrates and URLs for the media segments. The length of the Manifest Timeout can be configured under [`manifest.retryParameters.timeout`](https://shaka-player-demo.appspot.com/docs/api/tutorial-network-and-buffering-config.html#:~:text=manifest.retryparameters)

```js
player.configure({
  manifest: {
    retryParameters: {
        timeout: 5000, // timeout in ms, after which we abort
    }
  }
});
```

### 2. Segment Request Timeout
A segment is a small chunk of media content that is downloaded and played in real time.
The length of the Segment Timeout can be configured under [`streaming.retryParameters.timeout`](https://shaka-player-demo.appspot.com/docs/api/tutorial-network-and-buffering-config.html#:~:text=streaming.retryparameters)

```js
player.configure({
  streaming: {
    retryParameters: {
        timeout: 5000, // timeout in ms, after which we abort
    }
  }
});
```

### 3. License Request Timeout
A License is required to be able to play DRM (Digital Rights Management) protected content. The length of the License Tiemout can be configured under [`drm.retryParameters.timeout`](https://shaka-player-demo.appspot.com/docs/api/tutorial-network-and-buffering-config.html#:~:text=drm.retryParameters)

```js
player.configure({
  drm: {
    retryParameters: {
        timeout: 5000, // timeout in ms, after which we abort
    }
  }
});
```

In addition to the network timeouts mentioned earlier, Shaka Player can experience other timeouts related to its internal operations.

### 4. Initialisation Timeout
Occurs if the video is taking too long to load; if there is an issue with a segment or if there is a network issue. The initialisation Timeout can be somewhat adjusted with a combination of `connectionTimeout`, `stallTimeout` and `timeout`.

- `connection timeout`, sets the maximum time the player should wait for a network connection to be stablished
- `stallTimeout`, a stalled segment is one that has not downloaded any data after the timeout threshold
- `timeout`, applies to the maximum time the player should wait for a segment to download`

```js
player.configure({
  streaming: {
    retryParameters: {
        timeout: 30000,       // timeout in ms, after which we abort
        stallTimeout: 5000,  // stall timeout in ms, after which we abort
        connectionTimeout: 10000, // connection timeout in ms, after which we abort
    }
  }
});
```

### 5. Buffering Timeout
Occurs when the player is unable to fill the buffer with enough media data to maintain a playback within the specified timeout. Buffering timeouts can be adjusted with a combination of `streaming.bufferingGoal` and `streaming.retryParameters.timeout` The buffering goal sets the maximum amount of real-time content that the player needs to download before playback.

**For example:**

If the manifests segments are `5 seconds` long
and our buffering goal is of `30 seconds`
we would need to download `6 segments`
To achieve smooth playback it should be done before the `30 seconds` mark.

```js
player.configure({
  streaming: {
    bufferingGoal: 30, // Set the maximum amount of time to buffer before playback
    retryParameters: {
      // Set the maximum amount of time to wait for each segment to download
      timeout: 2000 // 2 seconds
    }
  }
});
```
**Note** that this example works well for continuous playback and extra considerations should be taken for seeking events

### 6. Seeking Timeout
Occurs when the player is unable to seek to a specific time position within the timeout frame. Seeking is the process of downloading and buffering media data at any specific time position.
A seek timeout can be configured to ensure the player stops waiting for the seek to complete and have a retry strategy instead. Shaka player only provides a `safeSeekOffset` configuration point that specifies the minimum buffer ahead of the current playback position before allowing a seek operation.

## Goal
The main goal of the dynamic timeouts is to avoid being on `REBUFFER`, where there isn't enough content to play (loading icon). To achieve this goal this RFC will categorise the playback session into one of 3 states:

- `BUFFER_LOW`:
  - retryParameters.stallTimeout: 1 second
  - retryParameters.timeout: 2 seconds
  - if there is half of the `bufferingGoal` switch to `BUFFER_BUILDING`
- `BUFFER_BUILDING`: 
  - bufferingGoal: 10 seconds
  - retryParameters.timeout: 4 seconds
  - retryParameters.stallTimeout: 1 second
  - if the buffering goal is met, switch to `BUFFER_FULL`
  - if there is less than 1 second of buffer switch to `BUFFER_LOW`
- `BUFFER_FULL`:
  - retryParameters.timeout: 6 seconds
  - retryParameters.stallTimeout: 2 second
  - if there is less than half of the `bufferingGoal` switch to `BUFFER_LOW`

## Requirements
- Dynamically control network timeouts in shaka based on the buffer length
- Ability to arbitrarily set timeouts from the parent SDK (config API)

## Design
The Dynamic config RFC aims to be a Shaka add-on or plugin; this is to create boundaries and reduce dependencies. The plugin will be a standalone and independent component that will enhance the core SDK timeouts.

![timeouts](https://user-images.githubusercontent.com/4896851/225808493-769b1bbd-10f8-4b6f-94b3-949136e693e1.jpg)

- The plugin will follow an event-based compute approach (Subject stream) where the compute acts
on a single event at a time. The plugin will be fed with events over time in a "push" fashion but it will be self-sufficient and "pull" events as needed.

- The plugin will configure the player timeouts in response to the buffer and network based on a configuration supplied by the SDK.

### API and Integration

```js

const config = {
    bufferingGoal: 10,
    pollingInterval: 1000,
    bufferLow: {
        stallTimeout: 1000,
        timeout: 2000,
    },
    bufferBuilding: {
        timeout: 4000,
        stallTimeout: 1000,
    },
    bufferFull: {
        timeout: 6000,
        stallTimeout: 2000,
    }
}

const player = new shaka.Player(videoContainerRef.current);
const dynamicTimeoutsPlugin = new DynamicTimeouts(player, config)

// consume an event
const unsubscribe = dynamicTimeoutsPlugin.subscribe(console.log)

// get current value
dynamicTimeoutsPlugin.getValue()
```

<img width="258" alt="Screenshot 2023-03-17 at 07 11 53" src="https://user-images.githubusercontent.com/4896851/225837186-376b6b58-dfc6-4737-b565-180eceb8da9e.png">

## References
- [Shaka Config](https://github.com/shaka-project/shaka-player/blob/main/docs/tutorials/config.md)
- [Network and Buffering Configuration](https://shaka-player-demo.appspot.com/docs/api/tutorial-network-and-buffering-config.html)
- [Shaka Architecture diagrams](https://shaka-player-demo.appspot.com/docs/api/tutorial-architecture.html)
- [Shaka Events](https://shaka-player-demo.appspot.com/docs/api/shaka.Player.html#:~:text=js%2C%20line%201226-,events,-AbrStatusChangedEvent)


