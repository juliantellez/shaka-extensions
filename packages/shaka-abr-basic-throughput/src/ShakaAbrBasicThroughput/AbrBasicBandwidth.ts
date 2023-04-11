import shaka from 'shaka-player/dist/shaka-player.compiled.debug';
import { BehaviourSubject } from '../Utils/observable';

interface ShakaAbrBasicThroughputConfig {
    bandwidthMax: number;
    bandwidthMin: number;
    pixelsMax: number;
    pixelsMin: number;
    heightMax: number
    heightMin: number;
    widthMax: number;
    widthMin: number;
}

interface ShakaAbrBasicThroughputState {
    isEnabled: boolean
    variants: Array<shaka.extern.Variant>
    variantIndex: number
    bandwidthEstimate: number
}

/**
 *  ShakaAbrBasicThroughput
 */
class ShakaAbrBasicThroughput implements shaka.extern.AbrManager {
    private mediaElement: HTMLVideoElement | null
    private config?: ShakaAbrBasicThroughputConfig
    private switchCallback: shaka.extern.AbrManager.SwitchCallback | null
    private state$ = new BehaviourSubject<ShakaAbrBasicThroughputState>({
        isEnabled: false,
        variants: [],
        variantIndex: -1,
        bandwidthEstimate: 0,
    })

    constructor(config?: ShakaAbrBasicThroughputConfig) {
        this.mediaElement = null
        this.switchCallback =  null
        this.config = config
    }

    private getCurrentVariant = (): shaka.extern.Variant => {
        const {variants, variantIndex} = this.state$.getValue()
        return variants[variantIndex]
    }

    public configure = (config: shaka.extern.AbrConfiguration): void => {
        // notImplemented
    }

    public playbackRateChanged = (rate: unknown): void => {
        // notImplemented
    }

    public init = (switchCallback: shaka.extern.AbrManager.SwitchCallback): void => {
        this.switchCallback = switchCallback
    }

    public getBandwidthEstimate = (): number => {
        const {bandwidthEstimate} = this.state$.getValue()
        return bandwidthEstimate
    }

    public segmentDownloaded = (deltaTimeMs: unknown, numBytes: unknown): any => {
        const {isEnabled} = this.state$.getValue()
        if(!isEnabled || !this.switchCallback) return

        this.switchCallback(this.getCurrentVariant())
    }

    /*
     * Chooses one variant to switch to. Called by the Player.
     */
    public chooseVariant = (): shaka.extern.Variant => {
        return this.getCurrentVariant()
    }

    /**
     * setVariants
     * @param variants Array<shaka.extern.Variant>
     * 
     * Updates the variats collection
     */
    public setVariants = (variants: Array<shaka.extern.Variant>): void => {
        const descendingVariants = sortVariantsDescending(
            filterVariants(variants, this.config)
        )

        this.state$.next({
            ...this.state$.getValue(),
            variants: descendingVariants,
            variantIndex: 0,
        })
    }

    public setMediaElement= (mediaElement: HTMLVideoElement): void => {
        this.mediaElement = mediaElement
    }

    public setState = (state: Partial<ShakaAbrBasicThroughputState>) => {
        this.state$.next({
            ...this.state$.getValue(),
            ...state
        })
    }

    public getState=() => {
        return this.state$.getValue()
    }

    public enable=(): void => {
        this.state$.next({
            ...this.state$.getValue(),
            isEnabled: true,
        })
    }

    public disable= (): void => {
        this.state$.next({
            ...this.state$.getValue(),
            isEnabled: false,
        })
    }

    public stop=(): void => {
        this.mediaElement = null
        this.switchCallback= null
        this.state$.next({
            ...this.state$.getValue(),
            isEnabled: false,
        })
    }
}

const isBetween = (ceiling: number, floor: number, input?: number, ) => {
    if(!input) return false

    return (input <= ceiling && input >= floor)
}

const filterVariants = (variants: Array<shaka.extern.Variant>, config?: ShakaAbrBasicThroughputConfig):Array<shaka.extern.Variant> => {
    if(!config) return variants

    return variants.filter(variant => {
        const width = variant.video?.width;
        const height = variant.video?.height;
        const pixels = (height && width) ? height * width : 0;

        return (
            isBetween(config.bandwidthMax, config.bandwidthMin, variant.bandwidth) &&
            isBetween(config.widthMax, config.widthMin, width) &&
            isBetween(config.heightMax, config.heightMin, height) &&
            isBetween(config.pixelsMax, config.pixelsMin, pixels)
        )
    })
}

const sortVariantsDescending = (variants: Array<shaka.extern.Variant>):Array<shaka.extern.Variant> => {
    return variants.slice().sort((a, b) => b.bandwidth - a.bandwidth)
}

export {ShakaAbrBasicThroughput, sortVariantsDescending, filterVariants, ShakaAbrBasicThroughputConfig}