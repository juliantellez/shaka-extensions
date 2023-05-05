import shaka from 'shaka-player/dist/shaka-player.compiled.debug';

import { ShakaAbrHeuristic } from "./ShakaAbrHeuristic"

describe("ShakaAbrHeuristic", () => {
    it("should initialise the heuristic", () => {
        // @ts-expect-error partial implemementation
        const player: shaka.Player = {}
        const heuristic = new ShakaAbrHeuristic(player)
        expect(heuristic).toBeTruthy()
    })
})
