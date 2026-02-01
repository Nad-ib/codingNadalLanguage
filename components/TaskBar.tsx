"use client";

import { motion } from "framer-motion";

import { FolderClosed, Terminal, Pi } from "lucide-react";

interface AppIconProps {
	color: string;
	icon: React.ReactNode;
	
}

function AppIcon({ color, icon}: AppIconProps) {
	return (
		<motion.div
			whileHover={{ scale: 1.2 }}
			whileTap={{ scale: 0.9 }}
			transition={{ type: "spring", stiffness: 400, damping: 17 }}
			className={`w-10 h-10 ${color} rounded-xl cursor-pointer shadow-lg border border-white/10 flex items-center justify-center`}>
			<div className="text-whithe">{icon}</div>
		</motion.div>
	);
}

interface TaskBarProps {
    onOpen: () => void;
}
export default function TaskBar({ onOpen }: TaskBarProps) {
	const apps = [
		{ id: 1, color: "transparent", icon: <FolderClosed size={24} /> },
		{ id: 2, color: "transparent", icon: <Terminal />, isTerminal: true },
		{ id: 3, color: "transparent", icon: <Pi /> },
	];
	return (
		<div className="fixed bottom-6 left-0 right-0 flex justify-center items-center w-full pointer-events-none">
			<motion.div className="pointer-events-auto flex items-center gap-3 px-3 h-16 bg-gray-900/40 backdrop-blur-2xl border border-white/20 rounded-2xl">
				{apps.map((app) => (
					<motion.div
						key={app.id}
						whileHover={{ scale: 1.2, y: -5 }}
						whileTap={{ scale: 0.9 }}
						
						onClick={() => app.isTerminal && onOpen()}
						className={`w-12 h-12 ${app.color} flex items-center justify-center rounded-xl cursor-pointer border border-white/10`}>
						<div className="text-white">{app.icon}</div>
					</motion.div>
				))}
			</motion.div>
		</div>
	);
}
