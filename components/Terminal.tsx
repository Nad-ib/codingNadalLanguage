"use client";
import { motion, useDragControls } from "framer-motion";
import { X, Play, RotateCcw, AlertCircle, CheckCircle2 } from "lucide-react";
import React, { useState } from "react";

interface TerminalInterface {
    setIsOpened: React.Dispatch<React.SetStateAction<boolean>>;
    onExecute: (cmd: string) => Promise<{ success: boolean; error?: string }>; 
}

export default function Terminal({ setIsOpened, onExecute }: TerminalInterface) {
    const controls = useDragControls();
    const [code, setCode] = useState<string>("moveX(3)\nmoveY(2)");
    const [isRunning, setIsRunning] = useState(false);
    
    
    const [log, setLog] = useState<{ msg: string; type: 'error' | 'success' | 'info' }>({ 
        msg: "Prêt à compiler", 
        type: 'info' 
    });

    const handleRun = async () => {
        if (isRunning) return;
        setIsRunning(true);
        setLog({ msg: "Exécution du script...", type: 'info' });

        const result = await onExecute(code);

        if (result.success) {
            setLog({ msg: "Succès : Tout s'est bien passé !", type: 'success' });
        } else {
            setLog({ msg: result.error || "Erreur inconnue", type: 'error' });
        }
        setIsRunning(false);
    };

    return (
        <motion.div
            drag
            dragControls={controls}
            dragMomentum={false}
            dragListener={false}
            className="fixed z-50 top-20 left-20 bg-[#1e1e1e] rounded-lg border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            style={{ width: "450px", height: "350px" }}>
            
            
            <header
                onPointerDown={(e) => controls.start(e)}
                className="shrink-0 w-full h-10 bg-[#323233] flex items-center justify-between px-4 cursor-grab active:cursor-grabbing">
                <div className="flex gap-2 text-white/50">
                    <div onClick={() => setIsOpened(false)} className="w-3 h-3 rounded-full bg-[#ff5f56] cursor-pointer hover:scale-110 transition-transform" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                
                <div className="flex gap-4 items-center">
                    <button onClick={() => setCode("")} className="text-gray-400 hover:text-white"><RotateCcw size={14} /></button>
                    <button 
                        onClick={handleRun} 
                        disabled={isRunning}
                        className={`${isRunning ? 'text-gray-600' : 'text-emerald-400 hover:text-emerald-300'}`}
                    >
                        <Play size={20} fill={isRunning ? "none" : "currentColor"} />
                    </button>
                </div>
            </header>

           
            <div className="flex-1 flex bg-[#1e1e1e] font-mono text-sm overflow-hidden border-b border-white/5">
                <div className="w-10 bg-[#252526] text-gray-600 flex flex-col items-center pt-4 select-none border-r border-white/5">
                    {code.split('\n').map((_, i) => <span key={i}>{i + 1}</span>)}
                </div>

                <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    spellCheck={false}
                    className="flex-1 bg-transparent text-emerald-100 p-4 outline-none resize-none caret-emerald-400"
                />
            </div>

            
            <div className={`h-10 px-4 flex items-center gap-2 text-xs font-mono 
                ${log.type === 'error' ? 'bg-red-950/40 text-red-400' : 
                  log.type === 'success' ? 'bg-emerald-950/40 text-emerald-400' : 
                  'bg-[#252526] text-gray-400'}`}>
                
                {log.type === 'error' && <AlertCircle size={14} />}
                {log.type === 'success' && <CheckCircle2 size={14} />}
                <span className="truncate">{log.msg}</span>
            </div>
        </motion.div>
    );
}