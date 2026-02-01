
"use client";
import Screener from "@/components/Screener";
import TaskBar from "@/components/TaskBar";
import Terminal from "@/components/Terminal";
import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { executeScript } from "@/lib/scriptEngine";

export default function Home() {
    const [IsOpened, setIsOpened] = useState<boolean>(true);
    const [machinePos, setMachinePos] = useState({ x: 7, y: 7 });

    const COLS = 15;
    const ROWS = 15;

    const gameAPI = {
        moveX: async (steps: number) => {
            setMachinePos(prev => ({ 
                ...prev, 
                x: Math.max(0, Math.min(COLS - 1, prev.x + steps)) 
            }));
            await new Promise(r => setTimeout(r, 450)); 
        },
        moveY: async (steps: number) => {
            setMachinePos(prev => ({ 
                ...prev, 
                y: Math.max(0, Math.min(ROWS - 1, prev.y + steps)) 
            }));
            await new Promise(r => setTimeout(r, 450));
        }
    };

    const executeGameCommand = async (fullScript: string) => {
        const result = await executeScript(fullScript, gameAPI);
        return result;
    };

    const handleOpen = () => setIsOpened(!IsOpened);

    return (
        <div className="w-full h-screen flex overflow-hidden bg-black">
            <Screener machinePos={machinePos} COLS={COLS} ROWS={ROWS} />
            <AnimatePresence>
                {IsOpened && (
                    <Terminal 
                        setIsOpened={setIsOpened} 
                        onExecute={executeGameCommand} 
                    />
                )}
            </AnimatePresence>
            <TaskBar onOpen={handleOpen} />
        </div>
    );
}