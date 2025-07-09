import Link from 'next/link';

export default function Home() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="container mx-auto px-4 py-16">
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold text-gray-900 mb-6">
                        Email Warmer
                    </h1>
                    <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                        Automatically warm up your email reputation with intelligent scheduling and AI-powered responses.
                        Improve your email deliverability and maintain a healthy sender score.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Link
                            href="/signup"
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                        >
                            Get Started
                        </Link>
                        <Link
                            href="/login"
                            className="border border-blue-600 text-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mb-16">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="text-blue-600 text-3xl mb-4">📧</div>
                        <h3 className="text-xl font-semibold mb-3">Smart Email Scheduling</h3>
                        <p className="text-gray-600">
                            Automatically send emails during optimal business hours to maximize engagement and improve deliverability.
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="text-blue-600 text-3xl mb-4">🤖</div>
                        <h3 className="text-xl font-semibold mb-3">AI-Powered Replies</h3>
                        <p className="text-gray-600">
                            Generate intelligent, context-aware email responses using advanced AI technology.
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="text-blue-600 text-3xl mb-4">📊</div>
                        <h3 className="text-xl font-semibold mb-3">Reputation Monitoring</h3>
                        <p className="text-gray-600">
                            Track your email reputation score and monitor deliverability metrics in real-time.
                        </p>
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-900 mb-8">How It Works</h2>
                    <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                        <div className="text-center">
                            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-blue-600 font-bold">1</span>
                            </div>
                            <h4 className="font-semibold mb-2">Sign Up</h4>
                            <p className="text-sm text-gray-600">Create your account with email and password</p>
                        </div>
                        <div className="text-center">
                            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-blue-600 font-bold">2</span>
                            </div>
                            <h4 className="font-semibold mb-2">Connect Gmail</h4>
                            <p className="text-sm text-gray-600">Add your Gmail credentials with app password</p>
                        </div>
                        <div className="text-center">
                            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-blue-600 font-bold">3</span>
                            </div>
                            <h4 className="font-semibold mb-2">Start Warming</h4>
                            <p className="text-sm text-gray-600">Begin the automated email warming process</p>
                        </div>
                        <div className="text-center">
                            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-blue-600 font-bold">4</span>
                            </div>
                            <h4 className="font-semibold mb-2">Monitor Progress</h4>
                            <p className="text-sm text-gray-600">Track your email reputation improvements</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
} 