import { Suspense } from "react";
import FilmRoomClient from "./FilmRoomClient";

export default function FilmRoomPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#050505] text-white/50 flex items-center justify-center text-sm font-sans">
                    Loading film room…
                </div>
            }
        >
            <FilmRoomClient />
        </Suspense>
    );
}
