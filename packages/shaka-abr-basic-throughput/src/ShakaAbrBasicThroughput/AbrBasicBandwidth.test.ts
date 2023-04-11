import { ShakaAbrBasicThroughput, ShakaAbrBasicThroughputConfig, filterVariants, sortVariantsDescending } from "./AbrBasicBandwidth"

describe("AbrBasicBandwidth", () => {
    it("should enable and disable plugin", () => {
        const plugin = new ShakaAbrBasicThroughput()
        plugin.enable()
        expect(plugin.getState().isEnabled).toBe(true)

        plugin.disable()
        expect(plugin.getState().isEnabled).toBe(false)

        plugin.enable()
        expect(plugin.getState().isEnabled).toBe(true)

        plugin.stop()
        expect(plugin.getState().isEnabled).toBe(false)
    })

    it("should set and remove a media Element", () => {
        const plugin = new ShakaAbrBasicThroughput()
        const mediaElement = {} as HTMLVideoElement
        plugin.setMediaElement(mediaElement)

        //@ts-expect-error
        expect(plugin.mediaElement).toBe(mediaElement)

        plugin.stop()
        // @ts-expect-error
        expect(plugin.mediaElement).toBe(null)
    })

    it("should sort variants", () => {
        const variants: Array<shaka.extern.Variant> = [
         // @ts-expect-error partial implementation
         {bandwidth : 100},
         // @ts-expect-error partial implementation
         {bandwidth: 300},
         // @ts-expect-error partial implementation
         {bandwidth : 400},
         // @ts-expect-error partial implementation
         {bandwidth : 200}
        ]

        const actual = sortVariantsDescending(variants)
        const expected: Array<shaka.extern.Variant> = [
            // @ts-expect-error partial implementation
            {bandwidth : 400},
            // @ts-expect-error partial implementation
            {bandwidth: 300},
            // @ts-expect-error partial implementation
            {bandwidth : 200},
            // @ts-expect-error partial implementation
            {bandwidth : 100},
           ]
        
        expect(actual).toEqual(expected)
    })

    it("should filter variants", () => {
        const variants : Array<shaka.extern.Variant> = [
            // @ts-expect-error partial implementation
            {bandwidth : 100, video: {width: 200, height: 100}},
            // @ts-expect-error partial implementation
            {bandwidth : 300, video: {width: 600, height: 300}},
            // @ts-expect-error partial implementation
            {bandwidth : 400, video: {width: 800, height: 400}},
            // @ts-expect-error partial implementation
            {bandwidth : 200, video: {width: 400, height: 200}},
        ];
        const noConfig = filterVariants(variants)
        expect(noConfig).toBe(variants)

        const config: ShakaAbrBasicThroughputConfig = {
            bandwidthMax: 400,
            bandwidthMin: 100,
            heightMax: 400,
            heightMin: 100,
            widthMax: 800,
            widthMin: 200,
            pixelsMax: 320000,
            pixelsMin: 20000,
        }

        const input = filterVariants(variants, config)
        expect(input).toStrictEqual(variants)
    })

    it("should choose initial variant", () => {
        const plugin = new ShakaAbrBasicThroughput()
        const variants: Array<shaka.extern.Variant> = [
            // @ts-expect-error partial implementation
            {bandwidth : 100},
            // @ts-expect-error partial implementation
            {bandwidth: 300},
            // @ts-expect-error partial implementation
            {bandwidth : 400},
            // @ts-expect-error partial implementation
            {bandwidth : 200}
           ]

        plugin.setVariants(variants)
        const variant = plugin.chooseVariant()

        expect(variant).toEqual({bandwidth : 400})
    })

    it("should hold and destroy references to the switchCallback", () => {
        const switchCallback = jest.fn()
        const plugin = new ShakaAbrBasicThroughput()

        plugin.init(switchCallback)
        plugin.enable()
        plugin.segmentDownloaded(0,0)
        expect(switchCallback).toHaveBeenCalledTimes(1)

        plugin.stop()
        plugin.segmentDownloaded(0,0)
        expect(switchCallback).toHaveBeenCalledTimes(1)
    })
})
