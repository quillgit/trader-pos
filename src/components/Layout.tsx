import { Link, Outlet, useLocation } from 'react-router-dom';
import { useOfflineStatus } from '@/hooks/use-offline';
import { cn } from '@/lib/utils';
import { Home, Package, Users, ShoppingCart, Wifi, WifiOff, FileText, UserCircle } from 'lucide-react';


export default function Layout() {
    const { isOnline } = useOfflineStatus();
    const location = useLocation();
    // const [isSidebarOpen, setSidebarOpen] = useState(false);

    const navItems = [
        { label: 'Dashboard', path: '/', icon: Home },
        { label: 'Products', path: '/products', icon: Package },
        { label: 'Partners', path: '/partners', icon: Users },
        { label: 'Purchases', path: '/purchases', icon: ShoppingCart },
        { label: 'Sales', path: '/sales', icon: FileText },
        { label: 'HRIS', path: '/hris', icon: UserCircle },
    ];

    return (
        <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r">
                <div className="p-4 border-b flex items-center justify-between">
                    <h1 className="font-bold text-xl text-primary">ComTrade</h1>
                    {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                location.pathname === item.path
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden bg-white border-b p-4 flex items-center justify-between">
                    <h1 className="font-bold text-lg">ComTrade</h1>
                    <div className="flex items-center gap-2">
                        {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
                        {/* Simple Menu Toggle if needed, but we use Bottom Nav for mobile */}
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-4 pb-20 md:pb-4">
                    {/* Offline Warning Banner */}
                    {!isOnline && (
                        <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-md mb-4 text-sm flex items-center gap-2">
                            <WifiOff className="w-4 h-4" />
                            You are offline. Changes will be saved locally and moved to queue.
                        </div>
                    )}
                    <Outlet />
                </main>

                {/* Mobile Bottom Nav */}
                <nav className="md:hidden bg-white border-t flex items-center justify-around p-2 pb-safe">
                    {navItems.slice(0, 5).map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex flex-col items-center gap-1 p-2 rounded-md",
                                location.pathname === item.path ? "text-blue-600" : "text-gray-500"
                            )}
                        >
                            <item.icon className="w-6 h-6" />
                            <span className="text-[10px]">{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </div>
        </div>
    );
}
