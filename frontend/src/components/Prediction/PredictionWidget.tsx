'use client';

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { TrendingUp, TrendingDown, Clock, Users, Loader2, CheckCircle } from 'lucide-react';

export interface Prediction {
    id: string;
    question: string;
    yesPool: number;
    noPool: number;
    endTime: number;
    status: 'open' | 'resolved' | 'cancelled';
    result?: 'yes' | 'no';
    creatorAddress: string;
}

interface PredictionWidgetProps {
    roomId: string;
    isHost?: boolean;
    className?: string;
}

// Mock predictions for demonstration
const MOCK_PREDICTIONS: Prediction[] = [
    {
        id: '1',
        question: 'Will I hit 1000 viewers today?',
        yesPool: 45.5,
        noPool: 32.1,
        endTime: Date.now() + 3600000,
        status: 'open',
        creatorAddress: '0x123...'
    }
];

export default function PredictionWidget({ roomId, isHost = false, className }: PredictionWidgetProps) {
    const account = useCurrentAccount();
    const [predictions, setPredictions] = useState<Prediction[]>(MOCK_PREDICTIONS);
    const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
    const [betAmount, setBetAmount] = useState('1');
    const [betSide, setBetSide] = useState<'yes' | 'no'>('yes');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    // Create prediction modal state
    const [isCreating, setIsCreating] = useState(false);
    const [newQuestion, setNewQuestion] = useState('');
    const [duration, setDuration] = useState(30); // minutes

    const { mutate: signAndExecute } = useSignAndExecuteTransaction();

    const handleBet = async (prediction: Prediction, side: 'yes' | 'no', amount: number) => {
        if (!account) return;

        setStatus('loading');

        try {
            const tx = new Transaction();
            const amountInMist = BigInt(amount * 1_000_000_000);

            // For MVP: Transfer to prediction pool address
            // In production: Call prediction smart contract
            const PREDICTION_POOL = '0x0000000000000000000000000000000000000000000000000000000000000002';

            const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
            tx.transferObjects([coin], PREDICTION_POOL);

            signAndExecute(
                { transaction: tx },
                {
                    onSuccess: () => {
                        setStatus('success');
                        // Update local state
                        setPredictions(prev => prev.map(p => {
                            if (p.id === prediction.id) {
                                return {
                                    ...p,
                                    yesPool: side === 'yes' ? p.yesPool + amount : p.yesPool,
                                    noPool: side === 'no' ? p.noPool + amount : p.noPool
                                };
                            }
                            return p;
                        }));
                        setTimeout(() => {
                            setStatus('idle');
                            setSelectedPrediction(null);
                        }, 2000);
                    },
                    onError: () => setStatus('idle'),
                }
            );
        } catch {
            setStatus('idle');
        }
    };

    const handleCreatePrediction = () => {
        if (!newQuestion.trim()) return;

        const newPrediction: Prediction = {
            id: crypto.randomUUID(),
            question: newQuestion,
            yesPool: 0,
            noPool: 0,
            endTime: Date.now() + duration * 60 * 1000,
            status: 'open',
            creatorAddress: account?.address || ''
        };

        setPredictions(prev => [newPrediction, ...prev]);
        setNewQuestion('');
        setIsCreating(false);
    };

    const calculateOdds = (prediction: Prediction) => {
        const total = prediction.yesPool + prediction.noPool;
        if (total === 0) return { yes: 50, no: 50 };
        return {
            yes: Math.round((prediction.yesPool / total) * 100),
            no: Math.round((prediction.noPool / total) * 100)
        };
    };

    const formatTime = (endTime: number) => {
        const remaining = endTime - Date.now();
        if (remaining <= 0) return 'Ended';
        const minutes = Math.floor(remaining / 60000);
        if (minutes < 60) return `${minutes}m left`;
        return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    };

    if (!account) {
        return (
            <div className={`bg-neutral-900 border border-white/10 rounded-xl p-4 ${className}`}>
                <p className="text-neutral-400 text-sm text-center">Connect wallet to participate in predictions</p>
            </div>
        );
    }

    return (
        <div className={`bg-neutral-900 border border-white/10 rounded-xl overflow-hidden ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    Predictions
                </h3>
                {isHost && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                        + Create
                    </button>
                )}
            </div>

            {/* Create Prediction Form */}
            {isCreating && (
                <div className="p-4 bg-purple-500/10 border-b border-purple-500/20">
                    <input
                        type="text"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="Ask a question..."
                        className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                    <div className="flex items-center gap-2">
                        <select
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="flex-1 bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                        >
                            <option value={5}>5 minutes</option>
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={60}>1 hour</option>
                        </select>
                        <button
                            onClick={handleCreatePrediction}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => setIsCreating(false)}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-300 text-sm rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Predictions List */}
            <div className="max-h-80 overflow-y-auto">
                {predictions.length === 0 ? (
                    <div className="p-6 text-center text-neutral-500 text-sm">
                        No active predictions
                    </div>
                ) : (
                    predictions.map((prediction) => {
                        const odds = calculateOdds(prediction);
                        const isSelected = selectedPrediction?.id === prediction.id;

                        return (
                            <div
                                key={prediction.id}
                                className={`p-4 border-b border-white/5 ${isSelected ? 'bg-white/5' : ''}`}
                            >
                                {/* Question */}
                                <p className="text-white text-sm font-medium mb-2">{prediction.question}</p>

                                {/* Stats */}
                                <div className="flex items-center gap-4 text-xs text-neutral-400 mb-3">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatTime(prediction.endTime)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        {(prediction.yesPool + prediction.noPool).toFixed(1)} SUI
                                    </span>
                                </div>

                                {/* Odds Bar */}
                                <div className="h-2 bg-neutral-800 rounded-full overflow-hidden mb-3">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-500 to-green-400"
                                        style={{ width: `${odds.yes}%` }}
                                    />
                                </div>

                                {/* Bet Buttons */}
                                {!isSelected ? (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setSelectedPrediction(prediction); setBetSide('yes'); }}
                                            className="flex-1 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                                        >
                                            <TrendingUp className="w-3 h-3" />
                                            YES {odds.yes}%
                                        </button>
                                        <button
                                            onClick={() => { setSelectedPrediction(prediction); setBetSide('no'); }}
                                            className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                                        >
                                            <TrendingDown className="w-3 h-3" />
                                            NO {odds.no}%
                                        </button>
                                    </div>
                                ) : (
                                    /* Bet Amount Input */
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={betAmount}
                                                onChange={(e) => setBetAmount(e.target.value)}
                                                min="0.1"
                                                step="0.1"
                                                className="flex-1 bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                            />
                                            <span className="text-neutral-400 text-sm">SUI</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleBet(prediction, betSide, parseFloat(betAmount))}
                                                disabled={status === 'loading'}
                                                className={`flex-1 px-4 py-2 font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 ${betSide === 'yes'
                                                        ? 'bg-green-500 hover:bg-green-600 text-white'
                                                        : 'bg-red-500 hover:bg-red-600 text-white'
                                                    }`}
                                            >
                                                {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
                                                {status === 'success' && <CheckCircle className="w-4 h-4" />}
                                                {status === 'loading' ? 'Betting...' : status === 'success' ? 'Done!' : `Bet ${betAmount} SUI on ${betSide.toUpperCase()}`}
                                            </button>
                                            <button
                                                onClick={() => setSelectedPrediction(null)}
                                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-300 text-sm rounded-lg transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
