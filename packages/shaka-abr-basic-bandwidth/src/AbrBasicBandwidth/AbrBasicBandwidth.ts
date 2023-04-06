import shaka from 'shaka-player/dist/shaka-player.compiled.debug';
import { BehaviourSubject } from './observable';

interface AbrBasicBandwidthConfig {
    bandwidthMax: number;
    bandwidthMin: number;
    pixelsMax: number;
    pixelsMin: number;
    heightMax: number
    heightMin: number;
    widthMax: number;
    widthMin: number;
}

interface AbrBasicBandwidthState {
    isEnabled: boolean
    variants: Array<shaka.extern.Variant>
    variantIndex: number 
}

/**
 *  AbrBasicBandwidth
 *  takes the estimated bandwidth and
 * selects the highest bitrate possiblebelow that bitrate
 */
class AbrBasicBandwidth implements shaka.extern.AbrManager {
    private mediaElement: HTMLVideoElement | null
    private config?: AbrBasicBandwidthConfig
    private switchCallback: shaka.extern.AbrManager.SwitchCallback | null
    private state$ = new BehaviourSubject<AbrBasicBandwidthState>({
        isEnabled: false,
        variants: [],
        variantIndex: -1
    })

    constructor(config?: AbrBasicBandwidthConfig) {
        this.mediaElement = null
        this.switchCallback =  null
        this.config = config
    }

    configure(config: shaka.extern.AbrConfiguration): any {
    }

    init(switchCallback: shaka.extern.AbrManager.SwitchCallback): any {
        this.switchCallback = switchCallback
    }

    getBandwidthEstimate(): number {
    }


    playbackRateChanged(rate: unknown): any {
    }

    segmentDownloaded(deltaTimeMs: unknown, numBytes: unknown): any {
        const {isEnabled} = this.state$.getValue()
        if(!isEnabled || !this.switchCallback) return

        this.switchCallback(this.getCurrentVariant())
    }

    private getCurrentVariant(): shaka.extern.Variant {
        const {variants, variantIndex} = this.state$.getValue()
        return variants[variantIndex]
    }

    /*
     * Chooses one variant to switch to. Called by the Player.
     */
    public chooseVariant(): shaka.extern.Variant {
        console.log("@@@chooseVariant@@@@@@@@@@@@@@")
        return this.getCurrentVariant()
    }

    /**
     * setVariants
     * @param variants Array<shaka.extern.Variant>
     * 
     * Updates the variats collection
     */
    public setVariants(variants: Array<shaka.extern.Variant>): void {
        console.log("@@@setVariants", variants)
        const descendingVariants = sortVariantsDescending(
            filterVariants(variants, this.config)
        )

        this.state$.next({
            ...this.state$.getValue(),
            variants: descendingVariants,
            variantIndex: 0,
        })
    }

    public setMediaElement(mediaElement: HTMLVideoElement): void {
        this.mediaElement = mediaElement
    }

    public setState(state: AbrBasicBandwidthState) {
        this.state$.next({
            ...this.state$.getValue(),
            ...state
        })
    }

    public getState() {
        return this.state$.getValue()
    }

    public enable(): void {
        this.state$.next({
            ...this.state$.getValue(),
            isEnabled: true,
        })
    }

    public disable(): void {
        this.state$.next({
            ...this.state$.getValue(),
            isEnabled: false,
        })
    }

    public stop(): void {
        this.mediaElement = null
        this.switchCallback= null
        this.state$.next({
            ...this.state$.getValue(),
            isEnabled: false,
        })
    }
}

const isBetween = (input?: number, ceiling: number, floor: number) => {
    if(!input) return false
    return (input <= ceiling && input >= floor)
}

const filterVariants = (variants: Array<shaka.extern.Variant>, config?: AbrBasicBandwidthConfig):Array<shaka.extern.Variant> => {
    if(!config) return variants

    return variants.filter(variant => {
        const width = variant.video?.width;
        const height = variant.video?.height;
        const pixels = (height && width) ? height * width : 0;

        return (
            isBetween(variant.bandwidth, config.bandwidthMax, config.bandwidthMin) &&
            isBetween(width, config.widthMax, config.widthMin) &&
            isBetween(height, config.heightMax, config.heightMin) &&
            isBetween(pixels, config.pixelsMax, config.pixelsMin)
        )
    })
}

const sortVariantsDescending = (variants: Array<shaka.extern.Variant>):Array<shaka.extern.Variant> => {
    return variants.slice().sort((a, b) => b.bandwidth - a.bandwidth)
}

export {AbrBasicBandwidth, sortVariantsDescending, filterVariants, AbrBasicBandwidthConfig}