import { Link, Outlet, useLocation } from 'react-router-dom';
import { useOfflineStatus } from '@/hooks/use-offline';
import { cn } from '@/lib/utils';
import { Home, Package, Users, ShoppingCart, Wifi, WifiOff, FileText, UserCircle, Settings, UserPlus, Menu, FileBarChart } from 'lucide-react';
import { useState, useEffect } from 'react';


export default function Layout() {
    const { isOnline } = useOfflineStatus();
    const location = useLocation();
    const [companyName, setCompanyName] = useState('ComTrade');

    useEffect(() => {
        const storedName = localStorage.getItem('COMPANY_NAME');
        if (storedName) setCompanyName(storedName);
    }, []);

    const navItems = [
        { label: 'Dashboard', path: '/', icon: Home },
        { label: 'Products', path: '/products', icon: Package },
        { label: 'Partners', path: '/partners', icon: Users },
        { label: 'Purchases', path: '/purchases', icon: ShoppingCart },
        { label: 'Sales', path: '/sales', icon: FileText },
        { label: 'Reports', path: '/reports', icon: FileBarChart },
        { label: 'Employees', path: '/employees', icon: UserPlus },
        { label: 'HRIS', path: '/hris', icon: UserCircle },
        { label: 'Settings', path: '/settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-72 bg-white border-r shadow-sm z-10">
                <div className="h-16 border-b flex items-center justify-between px-6 bg-white">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0">
                            {companyName.charAt(0)}
                        </div>
                        <h1 className="font-bold text-lg text-gray-800 truncate">{companyName}</h1>
                    </div>
                </div>
                
                <div className="p-4 border-b bg-gray-50/50">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        <span>System Status</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm bg-white p-2 rounded border shadow-sm">
                        <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-500" : "bg-red-500")} />
                        <span className={isOnline ? "text-green-700" : "text-red-700"}>
                            {isOnline ? "System Online" : "Offline Mode"}
                        </span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group",
                                location.pathname === item.path
                                    ? "bg-blue-50 text-blue-700 shadow-sm"
                                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            )}
                        >
                            <item.icon className={cn(
                                "w-5 h-5 transition-colors",
                                location.pathname === item.path ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                            )} />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t bg-gray-50/50">
                    <div className="flex items-center gap-3 px-2 py-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold">
                            U
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-gray-900 truncate">Current User</p>
                            <p className="text-xs text-gray-500 truncate">Logged In</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Mobile Header */}
                <header className="md:hidden bg-white border-b h-16 px-4 flex items-center justify-between shadow-sm z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                            {companyName.charAt(0)}
                        </div>
                        <h1 className="font-bold text-lg text-gray-800 truncate max-w-[200px]">{companyName}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                         {isOnline ? (
                            <div className="bg-green-100 p-1.5 rounded-full">
                                <Wifi className="w-4 h-4 text-green-600" />
                            </div>
                        ) : (
                            <div className="bg-red-100 p-1.5 rounded-full">
                                <WifiOff className="w-4 h-4 text-red-600" />
                            </div>
                        )}
                    </div>
                </header>

                <main className="flex-1 overflow-auto bg-gray-50/50 p-4 pb-24 md:pb-8">
                    <div className="max-w-7xl mx-auto w-full">
                        {/* Offline Warning Banner */}
                        {!isOnline && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
                                <WifiOff className="w-5 h-5 text-amber-600" />
                                <div className="flex-1">
                                    <span className="font-semibold">You are currently offline.</span>
                                    <span className="block text-xs mt-0.5 opacity-90">Changes will be saved locally and synced automatically when connection is restored.</span>
                                </div>
                            </div>
                        )}
                        <Outlet />
                    </div>
                </main>

                {/* Mobile Bottom Nav */}
                <nav className="md:hidden bg-white border-t flex items-center justify-around p-2 pb-safe fixed bottom-0 w-full z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    {navItems.slice(0, 5).map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors w-full",
                                location.pathname === item.path 
                                    ? "text-blue-600 bg-blue-50" 
                                    : "text-gray-500 hover:bg-gray-50"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    ))}
                     <Link
                        to="/settings"
                        className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors w-full",
                            location.pathname === '/settings'
                                ? "text-blue-600 bg-blue-50"
                                : "text-gray-500 hover:bg-gray-50"
                        )}
                    >
                        <Menu className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Menu</span>
                    </Link>
                </nav>
            </div>
        </div>
    );
}
