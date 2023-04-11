# ShakaAbrBasicThroughput

The Shaka ABR basic Throughput implements Shaka's [ABR Manager](https://shaka-player-demo.appspot.com/docs/api/tutorial-config.html#:~:text=abrfactory%3A%20function)

```js
const player = new shaka.Player(videoContainerRef.current);
const abrBasic = new AbrBasicBandwidth()
const config: shaka.extern.PlayerConfiguration = {
    abrFactory: () => abrBasic
}
```

## API
Besides from implementing all the ABR methods from Shaka's ABR manager. The basic throughput exposes a `setState` method that allows it to be dynamically configured.
The goal is to define a responsibility boundary where the Basic Throughput is only responsible for switching variants (see `segmentDownloaded`).

Some implementations of the ABR managers bundle bandwidth estimation with variant switches, this implementation splits this further so the manager is only responsible for variants switches.

The responsibility boundary enables various extensions such as:
- react to buffer changes
- react to bandwidth changes
- react to timeout limits
- react to retry behaviours
- define an overarching state transition or heuristic (`steady`, `rebuffer`, `panic`)

## References

- [ABR Manager](https://shaka-player-demo.appspot.com/docs/api/shaka.extern.AbrManager.html)
- `variants`: Different versions of the same video that are encoded at different bitrates and/or resolutions to enable adaptive bitrate streaming

