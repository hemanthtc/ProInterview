"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PhotoCropperModalProps {
    open: boolean;
    imageSrc: string;
    onCancel: () => void;
    onSave: (base64Jpeg: string) => void;
}

/** WhatsApp-style circular crop modal: drag to reposition, slider to zoom, exports a 300x300 circular JPEG. */
export default function PhotoCropperModal({ open, imageSrc, onCancel, onSave }: PhotoCropperModalProps) {
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;

        let w = 340;
        let h = 340;
        if (naturalWidth > naturalHeight) {
            h = 340;
            w = 340 * (naturalWidth / naturalHeight);
        } else {
            w = 340;
            h = 340 * (naturalHeight / naturalWidth);
        }
        setImgDimensions({ width: w, height: h });
        setOffset({ x: (340 - w) / 2, y: (340 - h) / 2 });
        setScale(1);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setOffset({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        const touch = e.touches[0];
        setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        setOffset({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y,
        });
    };

    const handleSaveCrop = () => {
        const img = imageRef.current;
        if (!img) return;

        const canvas = document.createElement("canvas");
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Math for centered scaling origin transform mapping to 300x300 canvas (1:1 ratio)
        const x_scaled = imgDimensions.width / 2 + offset.x - (imgDimensions.width / 2) * scale;
        const y_scaled = imgDimensions.height / 2 + offset.y - (imgDimensions.height / 2) * scale;
        const w_scaled = imgDimensions.width * scale;
        const h_scaled = imgDimensions.height * scale;

        // Circle crop size 300px inside a 340px container (starts at 20px padding)
        const crop_left = 20;
        const crop_top = 20;

        const canvas_x = x_scaled - crop_left;
        const canvas_y = y_scaled - crop_top;
        const canvas_w = w_scaled;
        const canvas_h = h_scaled;

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, 300, 300);

        ctx.beginPath();
        ctx.arc(150, 150, 150, 0, Math.PI * 2);
        ctx.clip();

        ctx.drawImage(img, canvas_x, canvas_y, canvas_w, canvas_h);

        onSave(canvas.toDataURL("image/jpeg", 0.9));
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        className="bg-gradient-to-b from-[#16161a] to-[#0c0c0e] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-[0_20px_50px_rgba(79,70,229,0.25)] flex flex-col items-center animate-none"
                    >
                        <h3 className="text-lg font-bold text-white mb-2">Edit Profile Picture</h3>
                        <p className="text-xs text-white/50 mb-6 text-center">Drag to adjust position and slide to zoom.</p>

                        {/* Cropper viewport */}
                        <div
                            ref={containerRef}
                            className="w-[340px] h-[340px] bg-black/60 rounded-2xl overflow-hidden relative border border-white/5 select-none touch-none flex items-center justify-center"
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleMouseUp}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={imageSrc}
                                ref={imageRef}
                                onLoad={handleImageLoad}
                                onMouseDown={handleMouseDown}
                                onTouchStart={handleTouchStart}
                                alt="Crop target"
                                className="select-none pointer-events-auto"
                                style={{
                                    width: `${imgDimensions.width}px`,
                                    height: `${imgDimensions.height}px`,
                                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                                    transformOrigin: "center center",
                                    cursor: isDragging ? "grabbing" : "grab",
                                    position: "absolute",
                                    maxWidth: "none",
                                }}
                            />

                            {/* WhatsApp-like radial gradient mask */}
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    background: "radial-gradient(circle at 170px 170px, transparent 150px, rgba(5, 5, 5, 0.85) 150px)",
                                }}
                            />

                            {/* Target guide ring */}
                            <div
                                className="absolute pointer-events-none rounded-full border border-dashed border-indigo-500/40"
                                style={{
                                    width: "300px",
                                    height: "300px",
                                    left: "20px",
                                    top: "20px",
                                }}
                            />
                        </div>

                        {/* Zoom range control */}
                        <div className="mt-6 w-full flex flex-col gap-2">
                            <div className="flex justify-between text-[10px] text-white/40 font-extrabold uppercase tracking-wider">
                                <span>Zoom</span>
                                <span className="font-mono">{Math.round(scale * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="3"
                                step="0.01"
                                value={scale}
                                onChange={(e) => setScale(parseFloat(e.target.value))}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 w-full mt-6">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveCrop}
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold transition-colors text-white shadow-lg shadow-indigo-600/20"
                            >
                                Save Photo
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
