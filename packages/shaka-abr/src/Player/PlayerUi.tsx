import React, { useEffect, useRef } from 'react';
import shaka from 'shaka-player/dist/shaka-player.ui.debug';
import "shaka-player/dist/controls.css?raw"

import { ShakaAbrHeuristic } from '../ShakaAbrHeuristic/ShakaAbrHeuristic';

interface PlayerProps {
    src: string
}

const PlayerUi: React.FC<PlayerProps> = ({src}) => {
    const videoContainerRef = useRef();
    const uiContainerRef = useRef();

    const [player, setPlayer] = React.useState<shaka.Player>();

    useEffect(() => {
        
        const player = new shaka.Player(videoContainerRef.current);
        const abrHeuristic = new ShakaAbrHeuristic(player)

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