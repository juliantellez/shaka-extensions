import * as React from 'react'

import { PlayerUi } from "../Player/PlayerUi"

const manifests = {
    a: {
        url: "https://livesim.dashif.org/livesim/chunkdur_1/ato_7/testpic4_8s/Manifest.mpd",
        description: "Low Latency Chunked Single-Bitrate, AVC, and AAC"
    },
    b: {
        url: "https://livesim.dashif.org/livesim/testpic_2s/Manifest.mpd",
        description: "2 sec live"
    },
    c: {
        url: "https://bitmovin-a.akamaihd.net/content/MI201109210084_1/mpds/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.mpd",
        description: "bitmovin"
    },
    d: {
        url: "https://dash.akamaized.net/dash264/TestCasesHD/2b/qualcomm/1/MultiResMPEG2.mpd",
        description: "AVC, Multi-Resolution Multi-Rate, Live profile, upto 1080p mpd"
    }
}

const App: React.FC = () => {
    return (
        <div>
            <h1>Shaka Player Test Sink </h1>
            <PlayerUi src={manifests.d.url} />
            {/* <Player src={DEFAULT_MANIFEST} /> */}
        </div>
    )
}

export {App}