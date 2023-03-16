import React from "react"
import { PlayerUi } from "../Player/PlayerUi"

const DEFAULT_MANIFEST = "https://livesim.dashif.org/livesim/testpic_2s/Manifest.mpd"

const App: React.FC = () => {
    return (
        <div>
            <h1>Shaka Player Test Sink </h1>
            <PlayerUi src={DEFAULT_MANIFEST} />
        </div>
    )
}

export {App}