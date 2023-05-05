import shaka from 'shaka-player/dist/shaka-player.ui.debug';
import { BandwidthManager, ResponseEvent } from "./BandwidthManager"

describe("BandwidthManager", () => {
    it("should register an incoming segment request", () => {
        const bandwidthManager = new BandwidthManager()
        const request = bandwidthManager.setRequestOpen(Math.random(), shaka.net.NetworkingEngine.RequestType.SEGMENT)

        expect(request).toBeTruthy()
    })

    it("should NOT register an incoming segment request", () => {
        const bandwidthManager = new BandwidthManager()
        const request = bandwidthManager.setRequestOpen(Math.random(), shaka.net.NetworkingEngine.RequestType.LICENSE)

        expect(request).toBeNull()
    })

    it("should set request first byte", () => {
        const bandwidthManager = new BandwidthManager()
        const requestId = 1
        const request = bandwidthManager.setRequestOpen(requestId, shaka.net.NetworkingEngine.RequestType.SEGMENT)

        expect(request?.hasFirstByte).toBe(false)

        const updatedRequest = bandwidthManager.setRequestFirstByte(requestId)
        expect(updatedRequest?.hasFirstByte).toBe(true)
    })

    it("should set request progress", () => {
        const bandwidthManager = new BandwidthManager()
        const requestId = 1
        const request = bandwidthManager.setRequestOpen(requestId, shaka.net.NetworkingEngine.RequestType.SEGMENT)

        expect(request?.totalBytes).toBe(0)

        const updatedRequest = bandwidthManager.setRequestProgress(requestId, 10)
        expect(updatedRequest?.totalBytes).toBe(10)
    })

    // TODO
    it("should close a request", () => {
        const bandwidthManager = new BandwidthManager()
        const requestId = 1
        const estimate = bandwidthManager.getBandwidthEstimate()
        expect(estimate).toEqual(500 * 1000)
        bandwidthManager.setRequestOpen(requestId, shaka.net.NetworkingEngine.RequestType.SEGMENT)
        bandwidthManager.setRequestProgress(requestId, 10)
        bandwidthManager.setRequestClose(requestId, ResponseEvent.LOAD)

        const newEstimate = bandwidthManager.getBandwidthEstimate()
        expect(newEstimate).toEqual(500 * 1000)
    })
})
