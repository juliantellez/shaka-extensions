import shaka from 'shaka-player/dist/shaka-player.ui.debug';
import { BehaviourSubject, Subscriber } from '../../Utils/observable';

interface AbrManagerState {
    type: "INIT" | "ENABLE" | "DISABLE" | "SEGMENT_DOWNLOADED" | "BANDWIDTH_ESTIMATE" | "SET_VARIANTS" | "TEAR_DOWN" | "SET_VARIANT_INDEX";
    data: {
        isEnabled: boolean;
        bandwidthEstimateBbps: number // TODO NOT NEEDED?
        variants: Array<shaka.extern.Variant>
        variantIndex: number
    }
}

/**
 * AbrManager:
 * see https://shaka-player-demo.appspot.com/docs/api/shaka.extern.AbrManager.html
 */
class AbrManager implements shaka.extern.AbrManager {
    private config: shaka.extern.AbrConfiguration | null
    private switchCallback: shaka.extern.AbrManager.SwitchCallback | null
    private state$ = new BehaviourSubject<AbrManagerState>({
        type: "INIT",
        data: {
            isEnabled: false,
            bandwidthEstimateBbps: 0,
            variants: [],
            variantIndex: 0
        }
    })

    constructor() {
        this.config = null
        this.switchCallback = null
    }

    private getCurrentVariant(): shaka.extern.Variant {
        const {variantIndex, variants} = this.state$.getValue().data
        return variants[variantIndex]
    }

    private sortVariantsDescending(variants : shaka.extern.Variant[]) : shaka.extern.Variant[] {
        const variantsSortedDescending = variants.slice().sort( (a, b) => {
            return b.bandwidth - a.bandwidth;
        });

        return variantsSortedDescending;
    }

    public getBandwidthEstimate(): number {
        const {bandwidthEstimateBbps: bandwidthEstimateKbps} = this.state$.getValue().data
        return bandwidthEstimateKbps
    }

    public playbackRateChanged(rate: number) {
        // not-implemented
    }

    public setMediaElement(mediaElement: HTMLMediaElement | null){
        // not-implemented
    }

    /**
     * Updates manager's variants collection.
     */
    public setVariants(variants: shaka.extern.Variant[]) {
        this.state$.next({
            type: "SET_VARIANTS",
            data: {
                ...this.state$.getValue().data,
                variants: this.sortVariantsDescending(variants),
            }
        })
    }

    /*
     * Chooses one variant to switch to. Called by the Player.
     */
    public chooseVariant(): shaka.extern.Variant {
        return this.getCurrentVariant()
    }

    /**
     * Notifies the AbrManager that a segment has been downloaded
     * (includes MP4 SIDX data, WebM Cues data, initialization segments, and media segments).
     */
    public segmentDownloaded(deltaTimeMs: number, numBytes: number) {
        const {isEnabled} = this.state$.getValue().data
        if(!isEnabled || !this.switchCallback) {
            return
        }

        this.state$.next({
            type: "SEGMENT_DOWNLOADED",
            data: this.state$.getValue().data
        })

        this.switchCallback(this.getCurrentVariant())
    }

    public setVariantIndex(nextVariantIndex: number) {
        const currentData = this.state$.getValue().data
        if (nextVariantIndex === currentData.variantIndex) {
            return
        }

        if (nextVariantIndex >= currentData.variants.length) {
            console.warn(`Variant is out of range: ${nextVariantIndex}`)
            return
        }

        this.state$.next({
            type: "SET_VARIANT_INDEX",
            data: {
                ...currentData,
                variantIndex: nextVariantIndex
            }
        })
    }

    public init(switchCallback: shaka.extern.AbrManager.SwitchCallback): void{
        this.switchCallback = switchCallback
    }

    public enable(): void {
        this.state$.next({
            type: "ENABLE",
            data: {
                ...this.state$.getValue().data,
                isEnabled: true,
            }
        })
    }

    public disable(): void {
        this.state$.next({
            type: "DISABLE",
            data: {
                ...this.state$.getValue().data,
                isEnabled: false,
            }
        })
    }

    public stop(): void{
        this.state$.next({
            type: "TEAR_DOWN",
            data: this.state$.getValue().data
        })
    }

    public configure(config: shaka.extern.AbrConfiguration) {
        this.config = config
    }

    public subscribe(subscriber: Subscriber<AbrManagerState>) {
        return this.state$.subscribe(subscriber)
    }
}

export {AbrManager}