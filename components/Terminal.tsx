"use client";
import { motion, useDragControls } from "framer-motion";
import { Play, RotateCcw, AlertCircle, CheckCircle2 } from "lucide-react";
import React, { useState } from "react";

interface TerminalInterface {
    setIsOpened: React.Dispatch<React.SetStateAction<boolean>>;
    onExecute: (cmd: string) => Promise<{ success: boolean; error?: string }>;
}

export default function Terminal({ setIsOpened, onExecute }: TerminalInterface) {
    const controls = useDragControls();
    const [code, setCode] = useState<string>("moveX(3)\nmoveY(2)");
    const [isRunning, setIsRunning] = useState(false);
    const [log, setLog] = useState<{ msg: string; type: "error" | "success" | "info" }>({
        msg: "Prêt à compiler",
        type: "info",
    });

    const SUGGESTIONS = ["moveX", "moveY", "function", "if", "repeat", "let", "vitesse"];
    const [suggest, setSuggest] = useState<{ list: string[]; index: number; visible: boolean }>({
        list: [],
        index: 0,
        visible: false,
    });

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setCode(value);
        const cursorIdx = e.target.selectionStart;
        const lastWordMatch = value.substring(0, cursorIdx).match(/(\w+)$/);

        if (lastWordMatch) {
            const prefix = lastWordMatch[0];
            const matches = SUGGESTIONS.filter(s => s.startsWith(prefix) && s !== prefix);
            if (matches.length > 0) {
                setSuggest({ list: matches, index: 0, visible: true });
            } else {
                setSuggest(prev => ({ ...prev, visible: false }));
            }
        } else {
            setSuggest(prev => ({ ...prev, visible: false }));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        const start = target.selectionStart;
        const end = target.selectionEnd;

        
        const pairs: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
        if (pairs[e.key]) {
            e.preventDefault();
            const closeChar = pairs[e.key];
            const newCode = code.substring(0, start) + e.key + closeChar + code.substring(end);
            setCode(newCode);
            setTimeout(() => {
                target.selectionStart = target.selectionEnd = start + 1;
            }, 0);
            return;
        }

        
        if (e.key === "Tab" && suggest.visible && suggest.list.length > 0) {
            e.preventDefault();
            const wordToInsert = suggest.list[suggest.index];
            const lastWordMatch = code.substring(0, start).match(/(\w+)$/);
            const prefix = lastWordMatch ? lastWordMatch[0] : "";
            const newCode = code.substring(0, start - prefix.length) + wordToInsert + code.substring(end);
            setCode(newCode);
            setSuggest(prev => ({ ...prev, visible: false }));
            setTimeout(() => {
                target.selectionStart = target.selectionEnd = start - prefix.length + wordToInsert.length;
            }, 0);
            return;
        }

       
        if (e.key === "Tab") {
            e.preventDefault();
            const newCode = code.substring(0, start) + "  " + code.substring(end);
            setCode(newCode);
            setTimeout(() => {
                target.selectionStart = target.selectionEnd = start + 2;
            }, 0);
        }

        
        if (suggest.visible) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSuggest(prev => ({ ...prev, index: (prev.index + 1) % prev.list.length }));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSuggest(prev => ({ ...prev, index: (prev.index - 1 + prev.list.length) % prev.list.length }));
            } else if (e.key === "Escape") {
                setSuggest(prev => ({ ...prev, visible: false }));
            }
        }
    };

    const handleRun = async () => {
        if (isRunning) return;
        setIsRunning(true);
        setLog({ msg: "Exécution du script...", type: "info" });
        const result = await onExecute(code);
        setLog(result.success 
            ? { msg: "Succès : Tout s'est bien passé !", type: "success" } 
            : { msg: result.error || "Erreur inconnue", type: "error" }
        );
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
                    <div onClick={() => setIsOpened(false)} className="w-3 h-3 rounded-full bg-[#ff5f56] cursor-pointer hover:scale-110" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                <div className="flex gap-4 items-center">
                    <button onClick={() => setCode("")} className="text-gray-400 hover:text-white"><RotateCcw size={14} /></button>
                    <button onClick={handleRun} disabled={isRunning} className={`${isRunning ? "text-gray-600" : "text-emerald-400 hover:text-emerald-300"}`}>
                        <Play size={20} fill={isRunning ? "none" : "currentColor"} />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex bg-[#1e1e1e] font-mono text-sm overflow-hidden border-b border-white/5 relative">
                <div className="w-10 bg-[#252526] text-gray-600 flex flex-col items-center pt-4 select-none border-r border-white/5 text-[10px]">
                    {code.split("\n").map((_, i) => <span key={i} className="h-5 leading-5">{i + 1}</span>)}
                </div>

                <textarea
                    value={code}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                    className="flex-1 bg-transparent text-emerald-100 p-4 outline-none resize-none caret-emerald-400 leading-5"
                />

                {suggest.visible && (
                    <div className="absolute left-14 bottom-12 bg-[#252526] border border-emerald-500/30 rounded shadow-2xl p-1 z-10 min-w-35">
                        {suggest.list.map((s, i) => (
                            <div key={s} className={`px-2 py-1.5 rounded flex justify-between items-center cursor-pointer ${i === suggest.index ? "bg-emerald-600 text-white" : "text-gray-400"}`}>
                                <span>{s}</span>
                                <span className="text-[9px] opacity-50 bg-black/20 px-1 rounded">Tab</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className={`h-10 px-4 flex items-center gap-2 text-xs font-mono 
                ${log.type === "error" ? "bg-red-950/40 text-red-400" : log.type === "success" ? "bg-emerald-950/40 text-emerald-400" : "bg-[#252526] text-gray-400"}`}>
                {log.type === "error" && <AlertCircle size={14} />}
                {log.type === "success" && <CheckCircle2 size={14} />}
                <span className="truncate">{log.msg}</span>
            </div>
        </motion.div>
    );
}