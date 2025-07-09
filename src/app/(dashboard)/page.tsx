'use client'
import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface EmailWarmup {
    _id: string;
    email: string;
    isActive: boolean;
    emailsSent: number;
    emailsReceived: number;
    dailyMailCount: number;
    dailyMailIncrease: number;
    maxDailyMailCount: number;
    lastWarmupDate: string | null;
    nextWarmupTime: string | null;
    warmupSchedule: {
        startTime: string;
        endTime: string;
        daysOfWeek: number[];
    };
    createdAt: string;
}

const Dashboard: React.FC = () => {
    const router = useRouter();
    const [emailWarmups, setEmailWarmups] = useState<EmailWarmup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchEmailWarmups();
    }, []);

    const fetchEmailWarmups = async () => {
        try {
            const response = await axios.get('/api/emailWarmups');
            if (response.data.success) {
                setEmailWarmups(response.data.data);
            }
        } catch (error: any) {
            console.error('Fetch email warmups error:', error);
            setError('Failed to load email warmups');
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            const response = await axios.post('/api/users/logout');
            if (response.status === 200) {
                console.log('Logout successful');
                router.push('/login');
            }
        } catch (error: any) {
            console.error('Logout error:', error);
            router.push('/login');
        }
    };

    const getTotalEmailsSent = () => {
        return emailWarmups.reduce((total, warmup) => total + warmup.emailsSent, 0);
    };

    const getTotalEmailsReceived = () => {
        return emailWarmups.reduce((total, warmup) => total + warmup.emailsReceived, 0);
    };

    const getActiveWarmups = () => {
        return emailWarmups.filter(warmup => warmup.isActive).length;
    };

    const getDayNames = (days: number[]) => {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days.map(day => dayNames[day]).join(', ');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">Email Warming Dashboard</h1>
                        <button
                            onClick={logout}
                            className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        >
                            Logout
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {/* Stats Overview */}
                    <div className="grid md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-blue-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-blue-900">Total Emails</h3>
                            <p className="text-3xl font-bold text-blue-600">{emailWarmups.length}</p>
                            <p className="text-sm text-blue-700">Email accounts</p>
                        </div>
                        <div className="bg-green-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-green-900">Active Warmups</h3>
                            <p className="text-3xl font-bold text-green-600">{getActiveWarmups()}</p>
                            <p className="text-sm text-green-700">Currently running</p>
                        </div>
                        <div className="bg-purple-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-purple-900">Emails Sent</h3>
                            <p className="text-3xl font-bold text-purple-600">{getTotalEmailsSent()}</p>
                            <p className="text-sm text-purple-700">Total sent</p>
                        </div>
                        <div className="bg-orange-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-orange-900">Emails Received</h3>
                            <p className="text-3xl font-bold text-orange-600">{getTotalEmailsReceived()}</p>
                            <p className="text-sm text-orange-700">Total received</p>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-4 mb-8">
                        <Link
                            href="/warmup"
                            className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-semibold"
                        >
                            Manage Email Warmups
                        </Link>
                        <Link
                            href="/checkEmailReputation"
                            className="bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-semibold"
                        >
                            Check Email Reputation
                        </Link>
                    </div>

                    {/* Email Warmups List */}
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Your Email Warmups</h2>

                        {emailWarmups.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg">
                                <div className="text-gray-400 mb-4">
                                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No email warmups yet</h3>
                                <p className="text-gray-500 mb-6">Get started by adding your first email for warming</p>
                                <Link
                                    href="/warmup"
                                    className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    Add Your First Email
                                </Link>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {emailWarmups.map((warmup) => (
                                    <div key={warmup._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-gray-900 truncate">{warmup.email}</h3>
                                                <div className="flex items-center mt-1">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${warmup.isActive
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {warmup.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-4">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Emails Sent:</span>
                                                <span className="font-semibold">{warmup.emailsSent}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Emails Received:</span>
                                                <span className="font-semibold">{warmup.emailsReceived}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Daily Count:</span>
                                                <span className="font-semibold">{warmup.dailyMailCount}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Schedule:</span>
                                                <span className="font-semibold text-xs">
                                                    {warmup.warmupSchedule.startTime}-{warmup.warmupSchedule.endTime}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Days:</span>
                                                <span className="font-semibold text-xs">
                                                    {getDayNames(warmup.warmupSchedule.daysOfWeek)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="border-t pt-4">
                                            <div className="flex justify-between items-center">
                                                <div className="text-xs text-gray-500">
                                                    {warmup.lastWarmupDate && (
                                                        <span>Last: {new Date(warmup.lastWarmupDate).toLocaleDateString()}</span>
                                                    )}
                                                </div>
                                                <Link
                                                    href="/warmup"
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                >
                                                    Manage →
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tips Section */}
                    <div className="mt-12 bg-blue-50 p-6 rounded-lg">
                        <h3 className="text-lg font-semibold text-blue-900 mb-4">Email Warming Tips</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-medium text-blue-800 mb-2">Best Practices</h4>
                                <ul className="text-sm text-blue-700 space-y-1">
                                    <li>• Start with 3-5 emails per day</li>
                                    <li>• Gradually increase volume over time</li>
                                    <li>• Send emails during business hours</li>
                                    <li>• Use natural, engaging content</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-medium text-blue-800 mb-2">Schedule Optimization</h4>
                                <ul className="text-sm text-blue-700 space-y-1">
                                    <li>• Focus on weekdays (Mon-Fri)</li>
                                    <li>• Avoid weekends and holidays</li>
                                    <li>• Randomize send times</li>
                                    <li>• Monitor delivery rates</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard; 