import React, { useEffect, useRef } from 'react';
import shakaUI from 'shaka-player/dist/shaka-player.ui';
import "shaka-player/dist/controls.css?raw"

interface PlayerProps {
    src: string
}

const PlayerUi: React.FC<PlayerProps> = ({src}) => {
    const videoContainerRef = useRef();
    const uiContainerRef = useRef();

    const [player, setPlayer] = React.useState<shakaUI.Player>();

    useEffect(() => {
        const player = new shakaUI.Player(videoContainerRef.current);
          if(!videoContainerRef.current || !uiContainerRef.current) {
            return 
          }

          const ui = new shakaUI.ui.Overlay(
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