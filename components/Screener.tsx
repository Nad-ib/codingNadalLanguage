"use client";
import { Tractor } from "lucide-react";


interface ScreenerProps {
  machinePos: { x: number; y: number };
  COLS: number;
  ROWS: number;
}

export default function Screener({ machinePos, COLS, ROWS }: ScreenerProps) {
  const SQUARE_SIZE = 50;
  const GAP = 4;
  const squares = Array.from({ length: COLS * ROWS });

  return (
    <div className="h-screen w-screen bg-gray-950 flex flex-col items-center justify-center p-4 gap-6">
      
      <div 
        className="relative bg-gray-900 shadow-2xl border border-emerald-900/50"
        style={{
          width: `${(SQUARE_SIZE * COLS) + (GAP * (COLS - 1))}px`,
          height: `${(SQUARE_SIZE * ROWS) + (GAP * (ROWS - 1))}px`,
        }}
      >
        
        <div className="grid w-full h-full" style={{
            gridTemplateColumns: `repeat(${COLS}, ${SQUARE_SIZE}px)`,
            gridTemplateRows: `repeat(${ROWS}, ${SQUARE_SIZE}px)`,
            gap: `${GAP}px`,
        }}>
          {squares.map((_, i) => (
            <div 
              key={i} 
              className="w-full h-full border border-emerald-500/10 bg-emerald-500/5 flex items-center justify-center"
            >
               <span className="text-[8px] text-emerald-300/60 select-none">
                 ({i % COLS},{Math.floor(i / COLS)})
               </span>
            </div>
          ))}
        </div>

        
        <div 
          className="absolute flex items-center justify-center transition-all duration-300 ease-in-out"
          style={{
            width: `${SQUARE_SIZE}px`,
            height: `${SQUARE_SIZE}px`,
            left: `${machinePos.x * (SQUARE_SIZE + GAP)}px`,
            top: `${machinePos.y * (SQUARE_SIZE + GAP)}px`,
          }}
        >
          <div className="bg-emerald-500/40 border border-emerald-400 p-2 rounded shadow-[0_0_15px_rgba(52,211,153,0.5)] scale-110">
            <Tractor className="text-emerald-400 w-8 h-8" />
          </div>
        </div>
      </div>
    </div>
  );
}