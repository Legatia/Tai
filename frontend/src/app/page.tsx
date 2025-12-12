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
                        <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" /></svg>
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
