import React, { useEffect, useRef } from 'react';
import shaka from 'shaka-player/dist/shaka-player.ui.debug';
import "shaka-player/dist/controls.css?raw"
import { DynamicTimeouts } from '../Plugin/plugin';

interface PlayerProps {
    src: string
}

const PlayerUi: React.FC<PlayerProps> = ({src}) => {
    const videoContainerRef = useRef();
    const uiContainerRef = useRef();

    const [player, setPlayer] = React.useState<shaka.Player>();

    useEffect(() => {
        
        const player = new shaka.Player(videoContainerRef.current);
        const plugin = new DynamicTimeouts(player, {
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
        })

        plugin.subscribe(console.log)
          if(!videoContainerRef.current || !uiContainerRef.current) {
            return 
          }

          const ui = new shaka.ui.Overlay(
            player,
            uiContainerRef.current,
            videoContainerRef.current
          );
          setPlayer(player)

        return () => {
            player.destroy();
            if (ui) {
              ui.destroy();
            }
          };
      }, [src]);

      React.useEffect(() => {
        if (player && src) {
            player.load(src);
          }
      }, [player, src])

    return (
        <div ref={uiContainerRef as any}>
            <video
                ref={videoContainerRef as any} 
                style={{
                    maxWidth: '100%',
                    width: '100%'
                  }}
                  />
        </div>
    );
}

export {PlayerUi}