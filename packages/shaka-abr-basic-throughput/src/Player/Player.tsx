import React, { useEffect, useRef } from 'react';
import shaka from 'shaka-player/dist/shaka-player.compiled.debug';

interface PlayerProps {
    src: string
}

const Player: React.FC<PlayerProps> = ({src}) => {
    const videoRef = useRef(null);
    useEffect(() => {
        const initPlayer = async () => {
          const player = new shaka.Player(videoRef.current);
          
          await player.load(src);
          
        };
        initPlayer();
      }, [src]);

    return <video ref={videoRef} />;
}

export {Player}