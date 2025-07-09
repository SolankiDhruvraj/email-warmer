'use client'
import { useState } from 'react';
import Link from 'next/link';

interface EmailReputationResult {
    email: string;
    status: string;
    score: number;
    result: string;
    valid: boolean;
    details: {
        deliverability: string;
        isDisposable: boolean;
        isFreeEmail: boolean;
        isRole: boolean;
        isCatchAll: boolean;
        hasMxRecord: boolean;
        smtpCheck: boolean;
        domain: string;
        username: string;
    } | null;
    message: string;
}

const CheckEmailReputation = () => {
    const [email, setEmail] = useState('');
    const [result, setResult] = useState<EmailReputationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCheckEmailReputation = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch('/api/emailReputationCheck', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setResult(data);
            } else {
                const data = await response.json();
                setError(data.message || 'Failed to check email reputation');
            }
        } catch (error: any) {
            console.error('Email reputation check error:', error);
            setError('Failed to check email reputation. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">Email Reputation Check</h1>
                        <Link
                            href="/warmup"
                            className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Back to Dashboard
                        </Link>
                    </div>

                    <form onSubmit={handleCheckEmailReputation} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter email to check reputation"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                        >
                            {loading ? 'Checking...' : 'Check Email Reputation'}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {result && (
                        <div className="mt-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                            <h3 className="font-semibold mb-2">Reputation Results:</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">Overall Status:</span>
                                    <span className={`px-2 py-1 rounded text-sm font-semibold ${result.status === 'excellent' ? 'bg-green-100 text-green-800' :
                                        result.status === 'good' ? 'bg-blue-100 text-blue-800' :
                                            result.status === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                        }`}>
                                        {result.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">Score:</span>
                                    <span className="font-semibold">{result.score}/100</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">Deliverability:</span>
                                    <span className={`px-2 py-1 rounded text-sm font-semibold ${result.result === 'deliverable' ? 'bg-green-100 text-green-800' :
                                        result.result === 'risky' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                        {result.result.toUpperCase()}
                                    </span>
                                </div>

                                {result.details && (
                                    <div className="mt-4 pt-4 border-t border-green-200">
                                        <h4 className="font-semibold mb-2">Detailed Analysis:</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>Domain:</span>
                                                <span className="font-medium">{result.details.domain}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Username:</span>
                                                <span className="font-medium">{result.details.username}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Disposable Email:</span>
                                                <span className={result.details.isDisposable ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                                                    {result.details.isDisposable ? 'Yes' : 'No'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Free Email:</span>
                                                <span className={result.details.isFreeEmail ? 'text-blue-600 font-semibold' : 'text-green-600 font-semibold'}>
                                                    {result.details.isFreeEmail ? 'Yes' : 'No'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Role Account:</span>
                                                <span className={result.details.isRole ? 'text-yellow-600 font-semibold' : 'text-green-600 font-semibold'}>
                                                    {result.details.isRole ? 'Yes' : 'No'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Catch-All Domain:</span>
                                                <span className={result.details.isCatchAll ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                                                    {result.details.isCatchAll ? 'Yes' : 'No'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>MX Records:</span>
                                                <span className={result.details.hasMxRecord ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                                    {result.details.hasMxRecord ? 'Valid' : 'Invalid'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>SMTP Check:</span>
                                                <span className={result.details.smtpCheck ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                                    {result.details.smtpCheck ? 'Valid' : 'Invalid'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="mt-8 bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-blue-900 mb-2">About Email Reputation:</h3>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Email reputation affects your email deliverability</li>
                            <li>• Higher scores mean better inbox placement</li>
                            <li>• Regular email activity helps maintain good reputation</li>
                            <li>• Avoid spam triggers and maintain engagement</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckEmailReputation; 