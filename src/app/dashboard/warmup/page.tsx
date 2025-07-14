'use client'
import { useState, useEffect, ChangeEvent, useRef } from 'react';
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
    reputationHistory?: { score: number }[];
}

const Warmup: React.FC = () => {
    const router = useRouter();
    const [emailWarmups, setEmailWarmups] = useState<EmailWarmup[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    // Add form state
    const [newEmail, setNewEmail] = useState('');
    const [newAppPass, setNewAppPass] = useState('');
    const [newDailyMailCount, setNewDailyMailCount] = useState(3);
    const [newDailyMailIncrease, setNewDailyMailIncrease] = useState(2);
    const [newMaxDailyMailCount, setNewMaxDailyMailCount] = useState(5);
    const [newStartTime, setNewStartTime] = useState('10:00');
    const [newEndTime, setNewEndTime] = useState('17:00');
    const [newDaysOfWeek, setNewDaysOfWeek] = useState([1, 2, 3, 4, 5]);

    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // Load email warmups on component mount
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
        }
    };

    const handleAddEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await axios.post('/api/emailWarmups', {
                email: newEmail,
                appPassword: newAppPass,
                dailyMailCount: newDailyMailCount,
                dailyMailIncrease: newDailyMailIncrease,
                maxDailyMailCount: newMaxDailyMailCount,
                warmupSchedule: {
                    startTime: newStartTime,
                    endTime: newEndTime,
                    daysOfWeek: newDaysOfWeek
                }
            });

            if (response.data.success) {
                setSuccess(response.data.message);
                setShowAddForm(false);
                resetForm();
                fetchEmailWarmups();
            }
        } catch (error: any) {
            console.error('Add email error:', error);
            setError(error.response?.data?.message || 'Failed to add email');
        } finally {
            setLoading(false);
        }
    };

    const startPolling = () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(fetchEmailWarmups, 20000);
    };

    const stopPolling = () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
    };

    const handleStartWarmup = async (warmupId: string) => {
        try {
            const response = await axios.post('/api/startWarmup', { warmupId });
            if (response.data.success) {
                setSuccess(response.data.message);
                fetchEmailWarmups();
                startPolling();
            }
        } catch (error: any) {
            console.error('Start warmup error:', error);
            setError(error.response?.data?.message || 'Failed to start warmup');
        }
    };

    const handleToggleActive = async (warmupId: string, isActive: boolean) => {
        try {
            const response = await axios.put('/api/emailWarmups', {
                warmupId,
                isActive: !isActive
            });
            if (response.data.success) {
                setSuccess('Email warmup updated successfully');
                fetchEmailWarmups();
            }
        } catch (error: any) {
            console.error('Toggle active error:', error);
            setError(error.response?.data?.message || 'Failed to update email warmup');
        }
    };

    const handleDeleteWarmup = async (warmupId: string) => {
        if (!confirm('Are you sure you want to delete this email warmup?')) {
            return;
        }

        try {
            const response = await axios.delete(`/api/emailWarmups?id=${warmupId}`);
            if (response.data.success) {
                setSuccess('Email warmup deleted successfully');
                fetchEmailWarmups();
            }
        } catch (error: any) {
            console.error('Delete warmup error:', error);
            setError(error.response?.data?.message || 'Failed to delete email warmup');
        }
    };

    const resetForm = () => {
        setNewEmail('');
        setNewAppPass('');
        setNewDailyMailCount(3);
        setNewDailyMailIncrease(2);
        setNewMaxDailyMailCount(5);
        setNewStartTime('10:00');
        setNewEndTime('17:00');
        setNewDaysOfWeek([1, 2, 3, 4, 5]);
    };

    const toggleDay = (day: number) => {
        if (newDaysOfWeek.includes(day)) {
            setNewDaysOfWeek(newDaysOfWeek.filter(d => d !== day));
        } else {
            setNewDaysOfWeek([...newDaysOfWeek, day]);
        }
    };

    const getDayName = (day: number) => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[day];
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

    useEffect(() => {
        return () => stopPolling();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-6xl mx-auto">
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
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                            {success}
                        </div>
                    )}

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Email List */}
                        <div className="lg:col-span-2">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">Your Email Warmups</h2>
                                <button
                                    onClick={() => setShowAddForm(!showAddForm)}
                                    className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    {showAddForm ? 'Cancel' : 'Add Email'}
                                </button>
                            </div>

                            {showAddForm && (
                                <div className="bg-gray-50 p-6 rounded-lg mb-6">
                                    <h3 className="text-lg font-semibold mb-4">Add New Email Warmup</h3>
                                    <form onSubmit={handleAddEmail} className="space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Gmail Address
                                                </label>
                                                <input
                                                    type="email"
                                                    value={newEmail}
                                                    onChange={(e) => setNewEmail(e.target.value)}
                                                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="your-email@gmail.com"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    App Password
                                                </label>
                                                <input
                                                    type="password"
                                                    value={newAppPass}
                                                    onChange={(e) => setNewAppPass(e.target.value)}
                                                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Gmail app password"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Daily Mail Count
                                                </label>
                                                <input
                                                    type="number"
                                                    value={newDailyMailCount}
                                                    onChange={(e) => setNewDailyMailCount(Number(e.target.value))}
                                                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    min="1"
                                                    max="10"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Daily Increase
                                                </label>
                                                <input
                                                    type="number"
                                                    value={newDailyMailIncrease}
                                                    onChange={(e) => setNewDailyMailIncrease(Number(e.target.value))}
                                                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    min="1"
                                                    max="5"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Max Daily Count
                                                </label>
                                                <input
                                                    type="number"
                                                    value={newMaxDailyMailCount}
                                                    onChange={(e) => setNewMaxDailyMailCount(Number(e.target.value))}
                                                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    min="5"
                                                    max="20"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Schedule Time
                                                </label>
                                                <div className="flex space-x-2">
                                                    <input
                                                        type="time"
                                                        value={newStartTime}
                                                        onChange={(e) => setNewStartTime(e.target.value)}
                                                        className="flex-1 border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                    <span className="flex items-center">to</span>
                                                    <input
                                                        type="time"
                                                        value={newEndTime}
                                                        onChange={(e) => setNewEndTime(e.target.value)}
                                                        className="flex-1 border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Days of Week
                                                </label>
                                                <div className="flex space-x-2">
                                                    {[0, 1, 2, 3, 4, 5, 6].map(day => (
                                                        <button
                                                            key={day}
                                                            type="button"
                                                            onClick={() => toggleDay(day)}
                                                            className={`px-3 py-2 rounded text-sm font-medium ${newDaysOfWeek.includes(day)
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                                }`}
                                                        >
                                                            {getDayName(day)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                                        >
                                            {loading ? 'Adding...' : 'Add Email Warmup'}
                                        </button>
                                    </form>
                                </div>
                            )}

                            <div className="space-y-4">
                                {emailWarmups.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>No email warmups found. Add your first email to get started!</p>
                                    </div>
                                ) : (
                                    emailWarmups.map((warmup) => (
                                        <div key={warmup._id} className="bg-white rounded-lg shadow p-4 mb-4">
                                            <div className="font-semibold text-lg">{warmup.email}</div>
                                            <div className="text-sm text-gray-600 mb-2">Sent: {warmup.emailsSent} / {warmup.maxDailyMailCount} | Received: {warmup.emailsReceived}</div>
                                            <div className="mb-2">
                                                <progress value={warmup.emailsSent} max={warmup.maxDailyMailCount} className="w-full h-2"></progress>
                                            </div>
                                            <div className="text-sm">Reputation: {Array.isArray(warmup.reputationHistory) && warmup.reputationHistory.length ? warmup.reputationHistory[warmup.reputationHistory.length - 1].score : 'N/A'}</div>
                                            {Array.isArray(warmup.reputationHistory) && warmup.reputationHistory.length > 1 && (
                                                <div className="text-xs text-gray-500">Trend: {warmup.reputationHistory.map(r => r.score).join(' → ')}</div>
                                            )}
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="text-sm text-gray-500">
                                                        Status: {warmup.isActive ? 'Active' : 'Inactive'}
                                                    </p>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleToggleActive(warmup._id, warmup.isActive)}
                                                        className={`px-3 py-1 rounded text-sm font-medium ${warmup.isActive
                                                            ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                                            : 'bg-green-600 text-white hover:bg-green-700'
                                                            }`}
                                                    >
                                                        {warmup.isActive ? 'Pause' : 'Activate'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteWarmup(warmup._id)}
                                                        className="bg-red-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-red-700"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <p className="text-sm text-gray-600">
                                                        Daily Count: <span className="font-semibold">{warmup.dailyMailCount}</span>
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        Max Daily: <span className="font-semibold">{warmup.maxDailyMailCount}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <div className="text-sm text-gray-500">
                                                    {warmup.lastWarmupDate && (
                                                        <p>Last warmup: {new Date(warmup.lastWarmupDate).toLocaleDateString()}</p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleStartWarmup(warmup._id)}
                                                    disabled={!warmup.isActive}
                                                    className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Start Warmup
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                            <div className="space-y-4">
                                <Link
                                    href="/checkEmailReputation"
                                    className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-4 rounded-lg text-center font-medium transition-colors"
                                >
                                    Check Email Reputation
                                </Link>

                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
                                    <ul className="text-sm text-blue-800 space-y-1">
                                        <li>• Add multiple emails to warm up</li>
                                        <li>• Each email has its own schedule</li>
                                        <li>• Emails are sent during business hours</li>
                                        <li>• Automatic replies to incoming emails</li>
                                        <li>• Gradual increase in daily email count</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Warmup; 