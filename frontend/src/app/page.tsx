import Navbar from '@/components/Landing/Navbar';
import Hero from '@/components/Landing/Hero';

export default function LandingPage() {
    return (
        <main className="min-h-screen bg-neutral-950 selection:bg-purple-500/30">
            <Navbar />
            <Hero />

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 bg-neutral-950">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 opacity-50">
                        <div className="relative w-6 h-6 rounded-lg overflow-hidden">
                            <img src="/IMG_2262.png" alt="Tai Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-sm font-medium">Tai</span>
                    </div>

                    <p className="text-sm text-neutral-600">
                        © {new Date().getFullYear()} Tai Network. All rights reserved.
                    </p>
                </div>
            </footer>
        </main>
    );
}
