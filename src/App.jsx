import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import ReactPlayer from 'react-player';

const App = () => {
  const [videos, setVideos] = useState({ live: [], serials: [] });
  const [playingVideo, setPlayingVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [focusPos, setFocusPos] = useState([0, 0]);

  const stateRef = useRef({ focusPos, activeRows: [], playingVideo });

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/videos');
        const data = response.data;
        setVideos({
          live: data.filter((v) => v.category === 'Live TV'),
          serials: data.filter((v) => v.category === 'Serials')
        });
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch videos', error);
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const activeRows = useMemo(() => {
    const rows = [];
    if (videos.live.length > 0) rows.push({ title: "Live Channels", data: videos.live });
    if (videos.serials.length > 0) rows.push({ title: "Serials", data: videos.serials });
    return rows;
  }, [videos]);

  useEffect(() => {
    stateRef.current = { focusPos, activeRows, playingVideo };
  }, [focusPos, activeRows, playingVideo]);

  // GLOBAL KEYBOARD LISTENER
  useEffect(() => {
    const handleKeyDown = (e) => {
      const { focusPos: currentFocus, activeRows: currentRows, playingVideo: currentVideo } = stateRef.current;

      if (currentVideo || currentRows.length === 0) return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
        e.preventDefault();
      }

      let [r, c] = currentFocus;

      if (e.key === 'ArrowDown') {
        r = Math.min(r + 1, currentRows.length - 1);
        c = Math.min(c, currentRows[r].data.length - 1);
      } else if (e.key === 'ArrowUp') {
        r = Math.max(r - 1, 0);
        c = Math.min(c, currentRows[r].data.length - 1);
      } else if (e.key === 'ArrowRight') {
        c = Math.min(c + 1, currentRows[r].data.length - 1);
      } else if (e.key === 'ArrowLeft') {
        c = Math.max(c - 1, 0);
      } else if (e.key === 'Enter') {
        setPlayingVideo(currentRows[r].data[c]);
        return;
      }

      if (r !== currentFocus[0] || c !== currentFocus[1]) {
        setFocusPos([r, c]);
        const nextElement = document.getElementById(`video-tile-${r}-${c}`);
        if (nextElement) {
          nextElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Video Escape Listener
  useEffect(() => {
    const handleVideoClose = (e) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        setPlayingVideo(null);
      }
    };
    window.addEventListener('keydown', handleVideoClose);
    return () => window.removeEventListener('keydown', handleVideoClose);
  }, []);

  const getCleanVideoUrl = (url) => {
    if (!url) return '';
    if (url.includes('youtube.com/live/')) {
      const videoId = url.split('youtube.com/live/')[1].split('?')[0];
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    return url;
  };

  if (loading) {
    return <div className="min-h-screen bg-[#141414] flex items-center justify-center text-white text-2xl font-bold">Loading TV...</div>;
  }

  if (playingVideo) {
    const cleanUrl = getCleanVideoUrl(playingVideo.videoUrl);
    const isYouTube = cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be');
    
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        {/* PLAYER CLEANED UP: No extra configs, just exact what worked before */}
        {isYouTube ? (
          <ReactPlayer
            url={cleanUrl}
            playing={true}
            controls={true}
            width="100%"
            height="100%"
          />
        ) : (
          <video 
            src={cleanUrl} 
            autoPlay 
            controls 
            className="w-full h-full object-contain"
          />
        )}
        <button
          onClick={() => setPlayingVideo(null)}
          className="absolute top-5 right-5 text-white bg-red-600 px-4 py-2 rounded-md font-bold z-50 hover:bg-red-700 cursor-pointer"
        >
          Close (Esc)
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] pt-8 overflow-hidden select-none">
      <h1 className="text-red-600 text-5xl font-black px-6 mb-12 tracking-widest">LIVE TV</h1>
      
      {activeRows.length === 0 ? (
        <div className="text-gray-400 px-6 text-xl">No content available. Upload from Admin Dashboard.</div>
      ) : (
        activeRows.map((row, rowIndex) => (
          <div className="mb-10" key={row.title}>
            <h2 className="text-white text-2xl font-bold mb-4 px-6">{row.title}</h2>
            <div className="flex overflow-x-auto px-6 pb-6 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
              {row.data.map((item, colIndex) => {
                const isFocused = focusPos[0] === rowIndex && focusPos[1] === colIndex;
                return (
                  <div
                    id={`video-tile-${rowIndex}-${colIndex}`}
                    key={item._id}
                    onClick={() => {
                      setFocusPos([rowIndex, colIndex]);
                      setPlayingVideo(item);
                    }}
                    className={`relative shrink-0 w-64 h-36 mx-2 rounded-lg cursor-pointer overflow-hidden transition-all duration-200 ${
                      isFocused ? 'scale-110 border-4 border-white z-10 shadow-2xl' : 'scale-100 border-2 border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 text-white text-sm font-semibold truncate">
                      {item.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default App;