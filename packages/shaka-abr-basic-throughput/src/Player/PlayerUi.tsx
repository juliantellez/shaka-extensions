import React, { useEffect, useRef } from 'react';
import shaka from 'shaka-player/dist/shaka-player.ui.debug';
import "shaka-player/dist/controls.css?raw"
import { AbrBasicBandwidth } from '../AbrBasicBandwidth/AbrBasicBandwidth';

interface PlayerProps {
    src: string
}

const PlayerUi: React.FC<PlayerProps> = ({src}) => {
    const videoContainerRef = useRef();
    const uiContainerRef = useRef();

    const [player, setPlayer] = React.useState<shaka.Player>();

    useEffect(() => {
        
        const player = new shaka.Player(videoContainerRef.current);
        const abrBasic = new AbrBasicBandwidth()
        
        // @ts-expect-error partial
        const config: shaka.extern.PlayerConfiguration = {
            // https://shaka-player-demo.appspot.com/docs/api/tutorial-config.html#:~:text=Object%0A%20%20%20%20%20%20%20switchInterval%3A%208-,abrfactory,-%3A%20Function%0A%20%20%20%20%20drm%3A%20Object
            abrFactory: () => abrBasic
        }

        player.configure(config)
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